use chrono::Utc;
use serde_json::{Map, Value};
use sqlx::PgPool;

pub async fn write_analytics_event(
    pool: Option<&PgPool>,
    organization_id: Option<&str>,
    event_type: &str,
    payload: Option<Value>,
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

    let mut record = Map::new();
    record.insert(
        "organization_id".to_string(),
        Value::String(org_id.to_string()),
    );
    record.insert(
        "provider".to_string(),
        Value::String("analytics".to_string()),
    );
    record.insert(
        "event_type".to_string(),
        Value::String(event_name.to_string()),
    );
    record.insert(
        "payload".to_string(),
        payload.unwrap_or_else(|| Value::Object(Map::new())),
    );
    record.insert("status".to_string(), Value::String("processed".to_string()));
    record.insert(
        "processed_at".to_string(),
        Value::String(Utc::now().to_rfc3339()),
    );

    let _ = crate::repository::table_service::create_row(pool, "integration_events", &record).await;
}
