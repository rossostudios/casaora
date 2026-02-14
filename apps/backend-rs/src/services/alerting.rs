use chrono::Utc;
use serde_json::{Map, Value};
use sqlx::PgPool;

pub async fn write_alert_event(
    pool: Option<&PgPool>,
    organization_id: Option<&str>,
    event_type: &str,
    payload: Option<Value>,
    severity: &str,
    error_message: Option<&str>,
) {
    let Some(org_id) = organization_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return;
    };
    let event_name = event_type.trim();
    if event_name.is_empty() {
        return;
    }
    let Some(pool) = pool else {
        return;
    };

    let now_iso = Utc::now().to_rfc3339();
    let mut body = Map::new();
    body.insert(
        "severity".to_string(),
        Value::String(severity.trim().to_string()),
    );
    if let Some(extra) = payload {
        if let Some(extra_obj) = extra.as_object() {
            for (key, value) in extra_obj {
                body.insert(key.clone(), value.clone());
            }
        }
    }

    let mut record = Map::new();
    record.insert(
        "organization_id".to_string(),
        Value::String(org_id.to_string()),
    );
    record.insert(
        "provider".to_string(),
        Value::String("alerting".to_string()),
    );
    record.insert(
        "event_type".to_string(),
        Value::String(event_name.to_string()),
    );
    record.insert("payload".to_string(), Value::Object(body));
    record.insert("status".to_string(), Value::String("failed".to_string()));
    if let Some(error_text) = error_message
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        record.insert(
            "error_message".to_string(),
            Value::String(error_text.to_string()),
        );
    }
    record.insert("received_at".to_string(), Value::String(now_iso.clone()));
    record.insert("processed_at".to_string(), Value::String(now_iso));

    let _ = crate::repository::table_service::create_row(pool, "integration_events", &record).await;
}
