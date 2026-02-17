use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::Row;

use crate::{
    auth::require_user_id,
    error::{AppError, AppResult},
    state::AppState,
    tenancy::assert_org_member,
};

#[derive(Debug, Clone, Deserialize)]
struct ApprovalOrgQuery {
    org_id: String,
}

#[derive(Debug, Clone, Deserialize)]
struct ApprovalPath {
    id: String,
}

#[derive(Debug, Clone, Deserialize)]
struct ReviewApprovalInput {
    #[serde(default)]
    note: Option<String>,
}

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/agent/approvals", axum::routing::get(list_approvals))
        .route(
            "/agent/approvals/{id}/approve",
            axum::routing::post(approve_approval),
        )
        .route(
            "/agent/approvals/{id}/reject",
            axum::routing::post(reject_approval),
        )
}

async fn list_approvals(
    State(state): State<AppState>,
    Query(query): Query<ApprovalOrgQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let pool = db_pool(&state)?;
    let rows = sqlx::query(
        "SELECT row_to_json(t) AS row
         FROM agent_approvals t
         WHERE organization_id = $1::uuid
           AND status = 'pending'
         ORDER BY created_at DESC
         LIMIT 100",
    )
    .bind(&query.org_id)
    .fetch_all(pool)
    .await
    .map_err(|error| {
        tracing::error!(error = %error, "Failed to list approvals");
        AppError::Dependency("Failed to list approvals.".to_string())
    })?;

    let data: Vec<Value> = rows
        .into_iter()
        .filter_map(|row| row.try_get::<Option<Value>, _>("row").ok().flatten())
        .collect();

    Ok(Json(json!({
        "organization_id": query.org_id,
        "data": data,
        "count": data.len(),
    })))
}

async fn approve_approval(
    State(state): State<AppState>,
    Path(path): Path<ApprovalPath>,
    Query(query): Query<ApprovalOrgQuery>,
    headers: HeaderMap,
    Json(payload): Json<ReviewApprovalInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let pool = db_pool(&state)?;

    let row = sqlx::query(
        "UPDATE agent_approvals
         SET status = 'approved',
             reviewed_by = $1::uuid,
             review_note = $2,
             reviewed_at = now()
         WHERE id = $3::uuid
           AND organization_id = $4::uuid
           AND status = 'pending'
         RETURNING row_to_json(agent_approvals.*) AS row",
    )
    .bind(&user_id)
    .bind(payload.note.as_deref())
    .bind(&path.id)
    .bind(&query.org_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| {
        tracing::error!(error = %error, "Failed to approve");
        AppError::Dependency("Failed to approve.".to_string())
    })?;

    let approval = row
        .and_then(|item| item.try_get::<Option<Value>, _>("row").ok().flatten())
        .ok_or_else(|| AppError::NotFound("Approval not found or already reviewed.".to_string()))?;

    // Execute the approved tool call
    let tool_name = approval
        .as_object()
        .and_then(|obj| obj.get("tool_name"))
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let tool_args = approval
        .as_object()
        .and_then(|obj| obj.get("tool_args"))
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();

    let execution_result = crate::services::ai_agent::execute_approved_tool(
        &state,
        &query.org_id,
        &tool_name,
        &tool_args,
    )
    .await;

    let result_value = match execution_result {
        Ok(result) => result,
        Err(error) => json!({ "ok": false, "error": error.detail_message() }),
    };

    Ok(Json(json!({
        "ok": true,
        "approval": approval,
        "execution_result": result_value,
    })))
}

async fn reject_approval(
    State(state): State<AppState>,
    Path(path): Path<ApprovalPath>,
    Query(query): Query<ApprovalOrgQuery>,
    headers: HeaderMap,
    Json(payload): Json<ReviewApprovalInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let pool = db_pool(&state)?;

    let row = sqlx::query(
        "UPDATE agent_approvals
         SET status = 'rejected',
             reviewed_by = $1::uuid,
             review_note = $2,
             reviewed_at = now()
         WHERE id = $3::uuid
           AND organization_id = $4::uuid
           AND status = 'pending'
         RETURNING row_to_json(agent_approvals.*) AS row",
    )
    .bind(&user_id)
    .bind(payload.note.as_deref())
    .bind(&path.id)
    .bind(&query.org_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| {
        tracing::error!(error = %error, "Failed to reject");
        AppError::Dependency("Failed to reject.".to_string())
    })?;

    let approval = row
        .and_then(|item| item.try_get::<Option<Value>, _>("row").ok().flatten())
        .ok_or_else(|| AppError::NotFound("Approval not found or already reviewed.".to_string()))?;

    Ok(Json(json!({
        "ok": true,
        "approval": approval,
    })))
}

fn db_pool(state: &AppState) -> AppResult<&sqlx::PgPool> {
    state.db_pool.as_ref().ok_or_else(|| {
        AppError::Dependency(
            "Supabase database is not configured. Set SUPABASE_DB_URL or DATABASE_URL.".to_string(),
        )
    })
}
