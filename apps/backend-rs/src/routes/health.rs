use axum::Json;
use chrono::Utc;
use serde_json::{json, Value};

pub async fn health() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "now": Utc::now().to_rfc3339()
    }))
}
