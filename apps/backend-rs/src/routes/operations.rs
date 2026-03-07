use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};

use crate::{
    auth::require_user_id,
    error::{AppError, AppResult},
    schemas::OperationsOverviewQuery,
    services::operations::build_operations_overview,
    state::AppState,
    tenancy::assert_org_member,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/operations/overview", get(operations_overview))
}

async fn operations_overview(
    State(state): State<AppState>,
    Query(query): Query<OperationsOverviewQuery>,
    headers: HeaderMap,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;
    let pool = db_pool(&state)?;

    Ok(Json(build_operations_overview(pool, &query).await?))
}

fn db_pool(state: &AppState) -> AppResult<&sqlx::PgPool> {
    state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database not configured".to_string()))
}
