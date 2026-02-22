use serde_json::{json, Map, Value};
use sqlx::Row;

use crate::{
    error::{AppError, AppResult},
    state::AppState,
};

fn db_pool(state: &AppState) -> AppResult<&sqlx::PgPool> {
    state.db_pool.as_ref().ok_or_else(|| {
        AppError::Dependency("Database is not configured.".to_string())
    })
}

/// Classify a maintenance request by urgency and category using keyword analysis.
pub async fn tool_classify_maintenance_request(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let request_id = args
        .get("request_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if request_id.is_empty() {
        return Ok(json!({ "ok": false, "error": "request_id is required." }));
    }

    let row = sqlx::query(
        "SELECT id::text, title, description, status
         FROM maintenance_requests
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(request_id)
    .bind(org_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to fetch maintenance request");
        AppError::Dependency("Failed to fetch maintenance request.".to_string())
    })?;

    let Some(row) = row else {
        return Ok(json!({ "ok": false, "error": "Maintenance request not found." }));
    };

    let title = row
        .try_get::<Option<String>, _>("title")
        .ok()
        .flatten()
        .unwrap_or_default()
        .to_lowercase();
    let description = row
        .try_get::<Option<String>, _>("description")
        .ok()
        .flatten()
        .unwrap_or_default()
        .to_lowercase();
    let combined = format!("{title} {description}");

    // Keyword-based classification
    let category = if combined.contains("plumb")
        || combined.contains("water")
        || combined.contains("leak")
        || combined.contains("drain")
        || combined.contains("faucet")
        || combined.contains("toilet")
        || combined.contains("pipe")
        || combined.contains("caño")
        || combined.contains("agua")
        || combined.contains("fuga")
    {
        "plumbing"
    } else if combined.contains("electri")
        || combined.contains("wire")
        || combined.contains("outlet")
        || combined.contains("light")
        || combined.contains("switch")
        || combined.contains("breaker")
        || combined.contains("luz")
        || combined.contains("enchufe")
    {
        "electrical"
    } else if combined.contains("crack")
        || combined.contains("wall")
        || combined.contains("roof")
        || combined.contains("foundation")
        || combined.contains("ceiling")
        || combined.contains("floor")
        || combined.contains("techo")
        || combined.contains("pared")
    {
        "structural"
    } else if combined.contains("appliance")
        || combined.contains("refriger")
        || combined.contains("stove")
        || combined.contains("washer")
        || combined.contains("dryer")
        || combined.contains("dishwash")
        || combined.contains("ac")
        || combined.contains("air condition")
        || combined.contains("heater")
        || combined.contains("heladera")
        || combined.contains("cocina")
    {
        "appliance"
    } else if combined.contains("pest")
        || combined.contains("bug")
        || combined.contains("roach")
        || combined.contains("mouse")
        || combined.contains("rat")
        || combined.contains("insect")
        || combined.contains("plaga")
        || combined.contains("cucaracha")
    {
        "pest"
    } else {
        "general"
    };

    // Urgency classification
    let urgency = if combined.contains("emergency")
        || combined.contains("flood")
        || combined.contains("fire")
        || combined.contains("gas leak")
        || combined.contains("no water")
        || combined.contains("no electric")
        || combined.contains("emergencia")
        || combined.contains("inundación")
        || combined.contains("incendio")
    {
        "critical"
    } else if combined.contains("urgent")
        || combined.contains("broken")
        || combined.contains("not working")
        || combined.contains("no funciona")
        || combined.contains("roto")
        || combined.contains("leak")
        || combined.contains("fuga")
    {
        "high"
    } else if combined.contains("repair")
        || combined.contains("fix")
        || combined.contains("replace")
        || combined.contains("reparar")
        || combined.contains("arreglar")
    {
        "medium"
    } else {
        "low"
    };

    let confidence = 0.75; // Keyword-based classification confidence

    // Update the maintenance request with classification
    sqlx::query(
        "UPDATE maintenance_requests
         SET ai_category = $3, ai_urgency = $4, ai_confidence = $5, updated_at = now()
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(request_id)
    .bind(org_id)
    .bind(category)
    .bind(urgency)
    .bind(confidence)
    .execute(pool)
    .await
    .ok();

    // Set SLA deadlines based on urgency
    let (response_hours, resolution_hours) = match urgency {
        "critical" => (1, 4),
        "high" => (4, 24),
        "medium" => (24, 72),
        _ => (48, 168),
    };

    sqlx::query(
        "UPDATE maintenance_requests
         SET sla_response_deadline = now() + ($3::int || ' hours')::interval,
             sla_resolution_deadline = now() + ($4::int || ' hours')::interval,
             updated_at = now()
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(request_id)
    .bind(org_id)
    .bind(response_hours)
    .bind(resolution_hours)
    .execute(pool)
    .await
    .ok();

    Ok(json!({
        "ok": true,
        "request_id": request_id,
        "category": category,
        "urgency": urgency,
        "confidence": confidence,
        "sla_response_hours": response_hours,
        "sla_resolution_hours": resolution_hours,
    }))
}

/// Auto-assign a maintenance request to the best-fit staff member.
pub async fn tool_auto_assign_maintenance(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let request_id = args
        .get("request_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if request_id.is_empty() {
        return Ok(json!({ "ok": false, "error": "request_id is required." }));
    }

    // Find staff with lowest open task count
    let staff = sqlx::query(
        "SELECT
            u.id::text AS user_id,
            u.full_name,
            COALESCE(open_tasks.count, 0) AS open_task_count
         FROM organization_members om
         JOIN app_users u ON u.id = om.user_id
         LEFT JOIN (
            SELECT assigned_to_user_id, COUNT(*)::int AS count
            FROM tasks
            WHERE organization_id = $1::uuid AND status IN ('todo', 'in_progress')
            GROUP BY assigned_to_user_id
         ) open_tasks ON open_tasks.assigned_to_user_id = om.user_id
         WHERE om.organization_id = $1::uuid
           AND om.role IN ('operator', 'owner_admin')
         ORDER BY open_task_count ASC
         LIMIT 1",
    )
    .bind(org_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to find available staff");
        AppError::Dependency("Failed to find available staff.".to_string())
    })?;

    let Some(staff_row) = staff else {
        return Ok(json!({ "ok": false, "error": "No available staff found." }));
    };

    let user_id = staff_row
        .try_get::<String, _>("user_id")
        .unwrap_or_default();
    let full_name = staff_row
        .try_get::<String, _>("full_name")
        .unwrap_or_default();
    let task_count = staff_row.try_get::<i32, _>("open_task_count").unwrap_or(0);

    // Create task from maintenance request
    let req = sqlx::query(
        "SELECT title, description, unit_id::text
         FROM maintenance_requests
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(request_id)
    .bind(org_id)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    let title = req
        .as_ref()
        .and_then(|r| r.try_get::<Option<String>, _>("title").ok().flatten())
        .unwrap_or_else(|| "Maintenance task".to_string());
    let description = req
        .as_ref()
        .and_then(|r| r.try_get::<Option<String>, _>("description").ok().flatten())
        .unwrap_or_default();
    let unit_id = req
        .as_ref()
        .and_then(|r| r.try_get::<Option<String>, _>("unit_id").ok().flatten());

    let mut task = Map::new();
    task.insert(
        "organization_id".to_string(),
        Value::String(org_id.to_string()),
    );
    task.insert(
        "title".to_string(),
        Value::String(format!("[Maintenance] {title}")),
    );
    task.insert(
        "description".to_string(),
        Value::String(description),
    );
    task.insert("priority".to_string(), Value::String("medium".to_string()));
    task.insert("status".to_string(), Value::String("todo".to_string()));
    task.insert(
        "category".to_string(),
        Value::String("maintenance".to_string()),
    );
    task.insert(
        "assigned_to_user_id".to_string(),
        Value::String(user_id.clone()),
    );
    task.insert(
        "maintenance_request_id".to_string(),
        Value::String(request_id.to_string()),
    );
    if let Some(uid) = unit_id {
        task.insert("unit_id".to_string(), Value::String(uid));
    }

    let created =
        crate::repository::table_service::create_row(pool, "tasks", &task).await?;
    let task_id = created
        .as_object()
        .and_then(|o| o.get("id"))
        .and_then(Value::as_str)
        .unwrap_or_default();

    // Update maintenance request status
    sqlx::query(
        "UPDATE maintenance_requests SET status = 'in_progress', updated_at = now()
         WHERE id = $1::uuid AND organization_id = $2::uuid AND status = 'open'",
    )
    .bind(request_id)
    .bind(org_id)
    .execute(pool)
    .await
    .ok();

    Ok(json!({
        "ok": true,
        "request_id": request_id,
        "assigned_to": user_id,
        "assigned_name": full_name,
        "task_id": task_id,
        "current_task_load": task_count,
    }))
}

/// Check SLA compliance for open maintenance requests.
pub async fn tool_check_maintenance_sla(
    state: &AppState,
    org_id: &str,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let breached = sqlx::query(
        "SELECT id::text, title, ai_urgency, ai_category, status,
                sla_response_deadline::text, sla_resolution_deadline::text
         FROM maintenance_requests
         WHERE organization_id = $1::uuid
           AND status NOT IN ('completed', 'closed')
           AND (
               (sla_response_deadline IS NOT NULL AND sla_response_deadline < now() AND sla_breached = false)
               OR (sla_resolution_deadline IS NOT NULL AND sla_resolution_deadline < now())
           )
         ORDER BY sla_response_deadline ASC NULLS LAST
         LIMIT 50",
    )
    .bind(org_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "SLA check query failed");
        AppError::Dependency("SLA check query failed.".to_string())
    })?;

    let items: Vec<Value> = breached
        .iter()
        .map(|r| {
            json!({
                "request_id": r.try_get::<String, _>("id").unwrap_or_default(),
                "title": r.try_get::<Option<String>, _>("title").ok().flatten(),
                "urgency": r.try_get::<Option<String>, _>("ai_urgency").ok().flatten(),
                "category": r.try_get::<Option<String>, _>("ai_category").ok().flatten(),
                "status": r.try_get::<String, _>("status").unwrap_or_default(),
                "sla_response_deadline": r.try_get::<Option<String>, _>("sla_response_deadline").ok().flatten(),
                "sla_resolution_deadline": r.try_get::<Option<String>, _>("sla_resolution_deadline").ok().flatten(),
            })
        })
        .collect();

    // Mark breached items
    for item in &items {
        if let Some(req_id) = item.get("request_id").and_then(Value::as_str) {
            sqlx::query(
                "UPDATE maintenance_requests SET sla_breached = true, updated_at = now()
                 WHERE id = $1::uuid AND organization_id = $2::uuid AND sla_breached = false",
            )
            .bind(req_id)
            .bind(org_id)
            .execute(pool)
            .await
            .ok();
        }
    }

    Ok(json!({
        "ok": true,
        "breached_count": items.len(),
        "breached_items": items,
    }))
}

/// Escalate a maintenance request by re-assigning or notifying manager.
pub async fn tool_escalate_maintenance(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let request_id = args
        .get("request_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let reason = args
        .get("reason")
        .and_then(Value::as_str)
        .unwrap_or_default();

    if request_id.is_empty() || reason.is_empty() {
        return Ok(json!({ "ok": false, "error": "request_id and reason are required." }));
    }

    // Create escalation notification
    sqlx::query(
        "INSERT INTO notifications (organization_id, type, title, body, severity, channel, metadata)
         VALUES ($1::uuid, 'maintenance_escalation',
                 'Maintenance Request Escalated',
                 $3, 'high', 'in_app',
                 jsonb_build_object('request_id', $2, 'reason', $3))",
    )
    .bind(org_id)
    .bind(request_id)
    .bind(reason)
    .execute(pool)
    .await
    .ok();

    // Update request priority to critical
    sqlx::query(
        "UPDATE maintenance_requests
         SET ai_urgency = 'critical', updated_at = now()
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(request_id)
    .bind(org_id)
    .execute(pool)
    .await
    .ok();

    Ok(json!({
        "ok": true,
        "request_id": request_id,
        "action": "escalated",
        "new_urgency": "critical",
        "reason": reason,
    }))
}

/// Request a quote from a vendor for maintenance work.
pub async fn tool_request_vendor_quote(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let vendor_id = args
        .get("vendor_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let request_id = args
        .get("request_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let description = args
        .get("description")
        .and_then(Value::as_str)
        .unwrap_or_default();

    if vendor_id.is_empty() || request_id.is_empty() || description.is_empty() {
        return Ok(json!({
            "ok": false,
            "error": "vendor_id, request_id, and description are required.",
        }));
    }

    // Look up vendor contact
    let vendor = sqlx::query(
        "SELECT name, contact_phone, contact_email
         FROM vendor_roster
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(vendor_id)
    .bind(org_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to look up vendor");
        AppError::Dependency("Failed to look up vendor.".to_string())
    })?;

    let Some(vendor_row) = vendor else {
        return Ok(json!({ "ok": false, "error": "Vendor not found." }));
    };

    let vendor_name = vendor_row
        .try_get::<String, _>("name")
        .unwrap_or_default();
    let contact = vendor_row
        .try_get::<Option<String>, _>("contact_phone")
        .ok()
        .flatten()
        .or_else(|| {
            vendor_row
                .try_get::<Option<String>, _>("contact_email")
                .ok()
                .flatten()
        })
        .unwrap_or_default();

    // Queue message to vendor
    if !contact.is_empty() {
        let channel = if contact.contains('@') {
            "email"
        } else {
            "whatsapp"
        };
        let mut msg = Map::new();
        msg.insert(
            "organization_id".to_string(),
            Value::String(org_id.to_string()),
        );
        msg.insert("channel".to_string(), Value::String(channel.to_string()));
        msg.insert("recipient".to_string(), Value::String(contact.clone()));
        msg.insert(
            "direction".to_string(),
            Value::String("outbound".to_string()),
        );
        msg.insert("status".to_string(), Value::String("queued".to_string()));
        let mut payload = Map::new();
        payload.insert(
            "body".to_string(),
            Value::String(format!(
                "Quote request for maintenance work:\n\n{description}\n\nPlease reply with your quote and estimated timeline."
            )),
        );
        payload.insert("ai_generated".to_string(), Value::Bool(true));
        msg.insert("payload".to_string(), Value::Object(payload));
        let _ = crate::repository::table_service::create_row(pool, "message_logs", &msg).await;
    }

    Ok(json!({
        "ok": true,
        "vendor_id": vendor_id,
        "vendor_name": vendor_name,
        "request_id": request_id,
        "status": "quote_requested",
        "contact": contact,
    }))
}

/// Select the best vendor from the roster for a maintenance category.
pub async fn tool_select_vendor(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let category = args
        .get("category")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if category.is_empty() {
        return Ok(json!({ "ok": false, "error": "category is required." }));
    }

    // Find vendors matching the category, sorted by rating
    let vendors = sqlx::query(
        "SELECT id::text, name, specialties, avg_rating::float8, total_jobs::int, avg_response_hours::float8
         FROM vendor_roster
         WHERE organization_id = $1::uuid
           AND is_active = true
           AND (specialties @> $2::jsonb OR specialties IS NULL)
         ORDER BY avg_rating DESC NULLS LAST, avg_response_hours ASC NULLS LAST
         LIMIT 5",
    )
    .bind(org_id)
    .bind(json!([category]))
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Vendor search failed");
        AppError::Dependency("Vendor search failed.".to_string())
    })?;

    let results: Vec<Value> = vendors
        .iter()
        .map(|r| {
            json!({
                "vendor_id": r.try_get::<String, _>("id").unwrap_or_default(),
                "name": r.try_get::<String, _>("name").unwrap_or_default(),
                "avg_rating": r.try_get::<f64, _>("avg_rating").unwrap_or(0.0),
                "total_jobs": r.try_get::<i32, _>("total_jobs").unwrap_or(0),
                "avg_response_hours": r.try_get::<f64, _>("avg_response_hours").unwrap_or(0.0),
            })
        })
        .collect();

    let recommended = results.first().cloned();

    Ok(json!({
        "ok": true,
        "category": category,
        "vendors": results,
        "count": results.len(),
        "recommended": recommended,
    }))
}
