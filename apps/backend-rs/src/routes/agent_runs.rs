use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::{
    auth::require_user_id,
    error::AppResult,
    services::agent_runs::{self, AgentRunMode, CreateAgentRunParams, ListAgentRunsParams},
    state::AppState,
    tenancy::{assert_org_member, assert_org_role},
};

const AUTONOMY_ROLES: &[&str] = &["owner_admin", "operator"];

#[derive(Debug, Deserialize)]
struct OrgQuery {
    org_id: String,
}

#[derive(Debug, Deserialize)]
struct RunPath {
    run_id: String,
}

#[derive(Debug, Deserialize)]
struct ListRunsQuery {
    org_id: String,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    mode: Option<String>,
    #[serde(default = "default_limit_30")]
    limit: i64,
}

#[derive(Debug, Deserialize)]
struct CreateRunInput {
    org_id: String,
    mode: String,
    #[serde(default)]
    agent_slug: Option<String>,
    task: String,
    context: Value,
    #[serde(default)]
    preferred_provider: Option<String>,
    #[serde(default)]
    preferred_model: Option<String>,
    #[serde(default)]
    allow_mutations: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct ApproveRunInput {
    #[serde(default)]
    note: Option<String>,
}

fn default_limit_30() -> i64 {
    30
}

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route(
            "/agent/runs",
            axum::routing::get(list_runs).post(create_run),
        )
        .route("/agent/runs/{run_id}", axum::routing::get(get_run))
        .route(
            "/agent/runs/{run_id}/events",
            axum::routing::get(get_run_events),
        )
        .route(
            "/agent/runs/{run_id}/cancel",
            axum::routing::post(cancel_run),
        )
        .route(
            "/agent/runs/{run_id}/approve",
            axum::routing::post(approve_run),
        )
}

async fn list_runs(
    State(state): State<AppState>,
    Query(query): Query<ListRunsQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let data = agent_runs::list_runs(
        &state,
        &query.org_id,
        &ListAgentRunsParams {
            status: query.status.clone(),
            mode: query.mode.clone(),
            limit: query.limit,
        },
    )
    .await?;

    Ok(Json(json!({
        "organization_id": query.org_id,
        "data": data,
    })))
}

async fn create_run(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateRunInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let membership = assert_org_member(&state, &user_id, &payload.org_id).await?;
    let role = membership
        .get("role")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("viewer")
        .to_string();

    let mode = AgentRunMode::parse(&payload.mode)?;
    if mode == AgentRunMode::Autonomous {
        assert_org_role(&state, &user_id, &payload.org_id, AUTONOMY_ROLES).await?;
    }

    let run = agent_runs::create_run(
        &state,
        CreateAgentRunParams {
            org_id: payload.org_id.clone(),
            user_id,
            role,
            mode,
            agent_slug: payload
                .agent_slug
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or("supervisor")
                .to_string(),
            task: payload.task,
            context: if payload.context.is_object() {
                payload.context
            } else {
                json!({})
            },
            preferred_provider: payload.preferred_provider,
            preferred_model: payload.preferred_model,
            allow_mutations: payload.allow_mutations.unwrap_or(false),
            chat_id: None,
        },
    )
    .await?;

    Ok(Json(run))
}

async fn get_run(
    State(state): State<AppState>,
    Path(path): Path<RunPath>,
    Query(query): Query<OrgQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let run = agent_runs::get_run(&state, &query.org_id, &path.run_id).await?;
    Ok(Json(run))
}

async fn get_run_events(
    State(state): State<AppState>,
    Path(path): Path<RunPath>,
    Query(query): Query<OrgQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let data = agent_runs::list_run_events(&state, &query.org_id, &path.run_id).await?;
    Ok(Json(json!({
        "organization_id": query.org_id,
        "run_id": path.run_id,
        "data": data,
    })))
}

async fn cancel_run(
    State(state): State<AppState>,
    Path(path): Path<RunPath>,
    Query(query): Query<OrgQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_role(&state, &user_id, &query.org_id, AUTONOMY_ROLES).await?;

    let run = agent_runs::cancel_run(&state, &query.org_id, &path.run_id, &user_id).await?;
    Ok(Json(run))
}

async fn approve_run(
    State(state): State<AppState>,
    Path(path): Path<RunPath>,
    Query(query): Query<OrgQuery>,
    headers: HeaderMap,
    Json(payload): Json<ApproveRunInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_role(&state, &user_id, &query.org_id, AUTONOMY_ROLES).await?;

    let run = agent_runs::approve_run(
        &state,
        &query.org_id,
        &path.run_id,
        &user_id,
        payload.note.as_deref(),
    )
    .await?;
    Ok(Json(run))
}
