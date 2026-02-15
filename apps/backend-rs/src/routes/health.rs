use axum::extract::State;
use axum::Json;
use chrono::Utc;
use serde_json::{json, Value};

use crate::state::AppState;

pub async fn health(State(state): State<AppState>) -> Json<Value> {
    let db_ok = if let Some(pool) = &state.db_pool {
        sqlx::query("SELECT 1").fetch_one(pool).await.is_ok()
    } else {
        true // no DB configured — skip check
    };

    let status = if db_ok { "ok" } else { "degraded" };
    Json(json!({
        "status": status,
        "now": Utc::now().to_rfc3339(),
        "db": db_ok
    }))
}
