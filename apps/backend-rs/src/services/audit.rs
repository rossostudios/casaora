use serde_json::{Map, Value};
use sqlx::PgPool;

#[allow(clippy::too_many_arguments)]
pub async fn write_audit_log(
    pool: Option<&PgPool>,
    organization_id: Option<&str>,
    actor_user_id: Option<&str>,
    action: &str,
    entity_name: &str,
    entity_id: Option<&str>,
    before_state: Option<Value>,
    after_state: Option<Value>,
) {
    let Some(org_id) = organization_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        tracing::debug!(
            action = action,
            entity_name = entity_name,
            "Audit log skipped: missing organization_id"
        );
        return;
    };
    let Some(pool) = pool else {
        tracing::debug!(
            action = action,
            entity_name = entity_name,
            "Audit log skipped: no database pool"
        );
        return;
    };

    let mut payload = Map::new();
    payload.insert(
        "organization_id".to_string(),
        Value::String(org_id.to_string()),
    );
    if let Some(actor) = actor_user_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        payload.insert(
            "actor_user_id".to_string(),
            Value::String(actor.to_string()),
        );
    }
    payload.insert("action".to_string(), Value::String(action.to_string()));
    payload.insert(
        "entity_name".to_string(),
        Value::String(entity_name.to_string()),
    );
    if let Some(entity_id) = entity_id.map(str::trim).filter(|value| !value.is_empty()) {
        payload.insert(
            "entity_id".to_string(),
            Value::String(entity_id.to_string()),
        );
    }
    if let Some(before) = before_state {
        payload.insert("before_state".to_string(), before);
    }
    if let Some(after) = after_state {
        payload.insert("after_state".to_string(), after);
    }

    if let Err(error) =
        crate::repository::table_service::create_row(pool, "audit_logs", &payload).await
    {
        tracing::error!(
            action = action,
            entity_name = entity_name,
            error = %error,
            "Failed to write audit log"
        );
    }
}
