use serde_json::{json, Map, Value};
use sqlx::Row;

use crate::{
    error::{AppError, AppResult},
    state::AppState,
};

/// Publish an event to the agent event bus.
/// Events are stored in `agent_events` and processed asynchronously by the scheduler.
pub async fn publish_event(
    pool: &sqlx::PgPool,
    org_id: &str,
    source_agent: &str,
    target_agent: Option<&str>,
    event_type: &str,
    payload: &Map<String, Value>,
    priority: &str,
) -> AppResult<String> {
    let row = sqlx::query(
        "INSERT INTO agent_events (organization_id, source_agent, target_agent, event_type, payload, priority)
         VALUES ($1::uuid, $2, $3, $4, $5, $6)
         RETURNING id::text",
    )
    .bind(org_id)
    .bind(source_agent)
    .bind(target_agent)
    .bind(event_type)
    .bind(Value::Object(payload.clone()))
    .bind(priority)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Dependency(format!("Failed to publish event: {e}")))?;

    Ok(row.try_get::<String, _>("id").unwrap_or_default())
}

/// Process pending agent events — deliver them to target agents.
/// Called by the scheduler every 30 seconds.
pub async fn process_pending_events(state: &AppState) {
    let pool = match state.db_pool.as_ref() {
        Some(p) => p,
        None => return,
    };

    // Expire old events first
    let _ = sqlx::query(
        "UPDATE agent_events SET status = 'expired'
         WHERE status = 'pending' AND expires_at < now()",
    )
    .execute(pool)
    .await;

    // Claim a batch of pending events (row-level lock to prevent double processing)
    let events = sqlx::query(
        "UPDATE agent_events SET status = 'processing', processed_at = now()
         WHERE id IN (
           SELECT id FROM agent_events
           WHERE status = 'pending'
           ORDER BY
             CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
             created_at ASC
           LIMIT 50
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id::text, organization_id::text, source_agent, target_agent, event_type, payload",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    if events.is_empty() {
        return;
    }

    let engine_mode = state.config.workflow_engine_mode;
    let mut delivered_ids: Vec<String> = Vec::with_capacity(events.len());

    for event in &events {
        let event_id = event.try_get::<String, _>("id").unwrap_or_default();
        let org_id = event
            .try_get::<String, _>("organization_id")
            .unwrap_or_default();
        let source = event
            .try_get::<String, _>("source_agent")
            .unwrap_or_default();
        let target = event
            .try_get::<Option<String>, _>("target_agent")
            .ok()
            .flatten();
        let event_type = event.try_get::<String, _>("event_type").unwrap_or_default();
        let payload = event.try_get::<Value, _>("payload").unwrap_or(json!({}));

        // Build context for workflow trigger or direct agent invocation
        let mut ctx = match payload.as_object() {
            Some(obj) => obj.clone(),
            None => Map::new(),
        };
        ctx.insert("source_agent".to_string(), json!(source));
        ctx.insert("event_type".to_string(), json!(event_type));
        ctx.insert("event_id".to_string(), json!(event_id.clone()));

        if let Some(target_slug) = &target {
            // Direct agent invocation for targeted events
            let config = json!({
                "agent_slug": target_slug,
                "message": format!("Agent event from {}: {}", source, event_type),
            });
            let action_config = config.as_object().cloned().unwrap_or_default();
            let _ = crate::services::workflows::execute_action_direct(
                pool,
                &org_id,
                "invoke_agent",
                &action_config,
                &ctx,
            )
            .await;
        } else {
            // Broadcast — fire as a generic trigger for any matching workflow rules
            crate::services::workflows::fire_trigger(pool, &org_id, &event_type, &ctx, engine_mode)
                .await;
        }

        delivered_ids.push(event_id);
    }

    // Batch-mark all processed events as delivered
    if !delivered_ids.is_empty() {
        let _ =
            sqlx::query("UPDATE agent_events SET status = 'delivered' WHERE id = ANY($1::uuid[])")
                .bind(&delivered_ids)
                .execute(pool)
                .await;

        tracing::info!(
            delivered = delivered_ids.len(),
            "Event bus: processed agent events"
        );
    }
}

/// AI agent tool: publish an event to the bus
pub async fn tool_publish_agent_event(
    state: &AppState,
    org_id: &str,
    agent_slug: Option<&str>,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database not configured.".to_string()))?;

    let event_type = args
        .get("event_type")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if event_type.is_empty() {
        return Ok(json!({ "ok": false, "error": "event_type is required." }));
    }

    let target_agent = args.get("target_agent").and_then(Value::as_str);
    let priority = args
        .get("priority")
        .and_then(Value::as_str)
        .unwrap_or("medium");
    let payload = args
        .get("payload")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();

    let source = agent_slug.unwrap_or("system");
    let event_id = publish_event(
        pool,
        org_id,
        source,
        target_agent,
        event_type,
        &payload,
        priority,
    )
    .await?;

    Ok(json!({
        "ok": true,
        "event_id": event_id,
        "event_type": event_type,
        "target_agent": target_agent,
        "source_agent": source,
    }))
}
