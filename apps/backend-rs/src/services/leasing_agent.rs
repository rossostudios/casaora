use serde_json::{json, Map, Value};
use sqlx::Row;

use crate::{
    error::{AppError, AppResult},
    repository::table_service::create_row,
    state::AppState,
};

fn db_pool(state: &AppState) -> AppResult<&sqlx::PgPool> {
    state.db_pool.as_ref().ok_or_else(|| {
        AppError::Dependency("Database is not configured.".to_string())
    })
}

/// Advance a rental application through the leasing funnel stages.
pub async fn tool_advance_application_stage(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let app_id = args
        .get("application_id")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default();
    if app_id.is_empty() {
        return Ok(json!({ "ok": false, "error": "application_id is required." }));
    }

    let new_stage = args
        .get("new_stage")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default();
    if new_stage.is_empty() {
        return Ok(json!({ "ok": false, "error": "new_stage is required." }));
    }

    let valid_stages = [
        "screening",
        "qualified",
        "visit_scheduled",
        "offer_sent",
        "signed",
        "rejected",
    ];
    if !valid_stages.contains(&new_stage) {
        return Ok(json!({
            "ok": false,
            "error": format!("Invalid stage. Must be one of: {}", valid_stages.join(", ")),
        }));
    }

    let notes = args
        .get("notes")
        .and_then(Value::as_str)
        .unwrap_or_default();

    // Update application status
    let result = sqlx::query(
        "UPDATE application_submissions
         SET status = $3, updated_at = now()
         WHERE id = $1::uuid AND organization_id = $2::uuid
         RETURNING id::text, status, applicant_name, unit_id::text",
    )
    .bind(app_id)
    .bind(org_id)
    .bind(new_stage)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to advance application stage");
        AppError::Dependency("Failed to advance application stage.".to_string())
    })?;

    let Some(row) = result else {
        return Ok(json!({ "ok": false, "error": "Application not found." }));
    };

    let app_id_result = row.try_get::<String, _>("id").unwrap_or_default();
    let applicant = row
        .try_get::<Option<String>, _>("applicant_name")
        .ok()
        .flatten()
        .unwrap_or_default();

    // Create an application event for audit trail
    let mut event = Map::new();
    event.insert(
        "organization_id".to_string(),
        Value::String(org_id.to_string()),
    );
    event.insert(
        "application_id".to_string(),
        Value::String(app_id.to_string()),
    );
    event.insert(
        "event_type".to_string(),
        Value::String("stage_changed".to_string()),
    );
    event.insert(
        "details".to_string(),
        json!({ "new_stage": new_stage, "notes": notes }),
    );
    let _ = create_row(pool, "application_events", &event).await;

    // Fire workflow trigger
    let mut ctx = Map::new();
    ctx.insert(
        "application_id".to_string(),
        Value::String(app_id.to_string()),
    );
    ctx.insert("new_stage".to_string(), Value::String(new_stage.to_string()));
    crate::services::workflows::fire_trigger(
        pool,
        org_id,
        "application_status_changed",
        &ctx,
        state.config.workflow_engine_mode,
    )
    .await;

    Ok(json!({
        "ok": true,
        "application_id": app_id_result,
        "new_stage": new_stage,
        "applicant": applicant,
        "notes": notes,
    }))
}

/// Schedule a property viewing with calendar block and confirmation.
pub async fn tool_schedule_property_viewing(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let app_id = args
        .get("application_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let unit_id = args
        .get("unit_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let datetime = args
        .get("datetime")
        .and_then(Value::as_str)
        .unwrap_or_default();

    if app_id.is_empty() || unit_id.is_empty() || datetime.is_empty() {
        return Ok(
            json!({ "ok": false, "error": "application_id, unit_id, and datetime are required." }),
        );
    }

    // Create calendar block for the viewing
    let mut block = Map::new();
    block.insert(
        "organization_id".to_string(),
        Value::String(org_id.to_string()),
    );
    block.insert("unit_id".to_string(), Value::String(unit_id.to_string()));
    block.insert(
        "block_type".to_string(),
        Value::String("viewing".to_string()),
    );
    block.insert("starts_at".to_string(), Value::String(datetime.to_string()));
    block.insert(
        "notes".to_string(),
        Value::String(format!("Property viewing for application {app_id}")),
    );

    let created = create_row(pool, "calendar_blocks", &block).await?;
    let block_id = created
        .as_object()
        .and_then(|o| o.get("id"))
        .and_then(Value::as_str)
        .unwrap_or_default();

    // Update application stage
    sqlx::query(
        "UPDATE application_submissions
         SET status = 'visit_scheduled', updated_at = now()
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(app_id)
    .bind(org_id)
    .execute(pool)
    .await
    .ok();

    // Send confirmation if phone provided
    if let Some(phone) = args.get("contact_phone").and_then(Value::as_str) {
        if !phone.is_empty() {
            let mut msg = Map::new();
            msg.insert(
                "organization_id".to_string(),
                Value::String(org_id.to_string()),
            );
            msg.insert(
                "channel".to_string(),
                Value::String("whatsapp".to_string()),
            );
            msg.insert(
                "recipient".to_string(),
                Value::String(phone.to_string()),
            );
            msg.insert(
                "direction".to_string(),
                Value::String("outbound".to_string()),
            );
            msg.insert("status".to_string(), Value::String("queued".to_string()));
            let mut payload = Map::new();
            payload.insert(
                "body".to_string(),
                Value::String(format!(
                    "Your property viewing has been scheduled for {}. We look forward to seeing you!",
                    datetime
                )),
            );
            payload.insert("ai_generated".to_string(), Value::Bool(true));
            msg.insert("payload".to_string(), Value::Object(payload));
            let _ = create_row(pool, "message_logs", &msg).await;
        }
    }

    Ok(json!({
        "ok": true,
        "calendar_block_id": block_id,
        "application_id": app_id,
        "unit_id": unit_id,
        "datetime": datetime,
        "stage": "visit_scheduled",
    }))
}

/// Generate a lease offer with computed move-in costs.
pub async fn tool_generate_lease_offer(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let app_id = args
        .get("application_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let unit_id = args
        .get("unit_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let lease_start = args
        .get("lease_start")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let lease_months = args
        .get("lease_months")
        .and_then(Value::as_i64)
        .unwrap_or(12)
        .clamp(1, 60);

    if app_id.is_empty() || unit_id.is_empty() || lease_start.is_empty() {
        return Ok(json!({
            "ok": false,
            "error": "application_id, unit_id, and lease_start are required.",
        }));
    }

    // Get pricing template for the unit
    let pricing = sqlx::query(
        "SELECT base_price::float8, security_deposit::float8, cleaning_fee::float8
         FROM pricing_templates
         WHERE organization_id = $1::uuid AND unit_id = $2::uuid AND is_active = true
         ORDER BY updated_at DESC LIMIT 1",
    )
    .bind(org_id)
    .bind(unit_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to fetch pricing template");
        AppError::Dependency("Failed to fetch pricing template.".to_string())
    })?;

    let (monthly_rent, deposit, cleaning_fee) = if let Some(row) = pricing {
        (
            row.try_get::<f64, _>("base_price").unwrap_or(0.0),
            row.try_get::<f64, _>("security_deposit").unwrap_or(0.0),
            row.try_get::<f64, _>("cleaning_fee").unwrap_or(0.0),
        )
    } else {
        return Ok(json!({
            "ok": false,
            "error": "No active pricing template found for this unit.",
        }));
    };

    let first_month_rent = monthly_rent;
    let move_in_total = first_month_rent + deposit + cleaning_fee;

    // Update application stage to offer_sent
    sqlx::query(
        "UPDATE application_submissions
         SET status = 'offer_sent', updated_at = now()
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(app_id)
    .bind(org_id)
    .execute(pool)
    .await
    .ok();

    Ok(json!({
        "ok": true,
        "application_id": app_id,
        "unit_id": unit_id,
        "lease_start": lease_start,
        "lease_months": lease_months,
        "monthly_rent": (monthly_rent * 100.0).round() / 100.0,
        "security_deposit": (deposit * 100.0).round() / 100.0,
        "cleaning_fee": (cleaning_fee * 100.0).round() / 100.0,
        "first_month_rent": (first_month_rent * 100.0).round() / 100.0,
        "move_in_total": (move_in_total * 100.0).round() / 100.0,
        "stage": "offer_sent",
    }))
}

/// Send a status update to an applicant.
pub async fn tool_send_application_update(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let app_id = args
        .get("application_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let message = args
        .get("message")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let channel = args
        .get("channel")
        .and_then(Value::as_str)
        .unwrap_or("whatsapp");

    if app_id.is_empty() || message.is_empty() {
        return Ok(json!({ "ok": false, "error": "application_id and message are required." }));
    }

    // Look up applicant contact
    let contact = sqlx::query(
        "SELECT applicant_phone, applicant_email
         FROM application_submissions
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(app_id)
    .bind(org_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to look up applicant");
        AppError::Dependency("Failed to look up applicant.".to_string())
    })?;

    let Some(row) = contact else {
        return Ok(json!({ "ok": false, "error": "Application not found." }));
    };

    let recipient = if channel == "email" {
        row.try_get::<Option<String>, _>("applicant_email")
            .ok()
            .flatten()
            .unwrap_or_default()
    } else {
        row.try_get::<Option<String>, _>("applicant_phone")
            .ok()
            .flatten()
            .unwrap_or_default()
    };

    if recipient.is_empty() {
        return Ok(json!({
            "ok": false,
            "error": format!("No {} contact found for this applicant.", channel),
        }));
    }

    let mut msg = Map::new();
    msg.insert(
        "organization_id".to_string(),
        Value::String(org_id.to_string()),
    );
    msg.insert("channel".to_string(), Value::String(channel.to_string()));
    msg.insert(
        "recipient".to_string(),
        Value::String(recipient.clone()),
    );
    msg.insert(
        "direction".to_string(),
        Value::String("outbound".to_string()),
    );
    msg.insert("status".to_string(), Value::String("queued".to_string()));
    let mut payload = Map::new();
    payload.insert("body".to_string(), Value::String(message.to_string()));
    payload.insert("ai_generated".to_string(), Value::Bool(true));
    payload.insert(
        "application_id".to_string(),
        Value::String(app_id.to_string()),
    );
    msg.insert("payload".to_string(), Value::Object(payload));

    let created = create_row(pool, "message_logs", &msg).await?;
    let msg_id = created
        .as_object()
        .and_then(|o| o.get("id"))
        .and_then(Value::as_str)
        .unwrap_or_default();

    Ok(json!({
        "ok": true,
        "message_id": msg_id,
        "recipient": recipient,
        "channel": channel,
        "status": "queued",
    }))
}
