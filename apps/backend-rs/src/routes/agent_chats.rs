use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::Deserialize;
use serde_json::{Map, Value};

use crate::{
    auth::require_user_id,
    error::AppResult,
    services::{agent_chats, audit::write_audit_log},
    state::AppState,
    tenancy::assert_org_member,
};

#[derive(Debug, Clone, Deserialize)]
struct AgentOrgQuery {
    org_id: String,
}

#[derive(Debug, Clone, Deserialize)]
struct AgentChatsQuery {
    org_id: String,
    #[serde(default)]
    archived: bool,
    #[serde(default = "default_limit_30")]
    limit: i64,
}

#[derive(Debug, Clone, Deserialize)]
struct AgentChatMessagesQuery {
    org_id: String,
    #[serde(default = "default_limit_120")]
    limit: i64,
}

#[derive(Debug, Clone, Deserialize)]
struct CreateAgentChatInput {
    org_id: String,
    agent_slug: String,
    title: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct SendAgentMessageInput {
    message: String,
    #[serde(default)]
    allow_mutations: bool,
    #[serde(default)]
    confirm_write: bool,
}

#[derive(Debug, Clone, Deserialize)]
struct AgentChatPath {
    chat_id: String,
}

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/agent/agents", axum::routing::get(get_agent_definitions))
        .route(
            "/agent/chats",
            axum::routing::get(get_agent_chats).post(create_agent_chat),
        )
        .route(
            "/agent/chats/{chat_id}",
            axum::routing::get(get_agent_chat).delete(delete_agent_chat),
        )
        .route(
            "/agent/chats/{chat_id}/messages",
            axum::routing::get(get_agent_chat_messages).post(post_agent_chat_message),
        )
        .route(
            "/agent/chats/{chat_id}/archive",
            axum::routing::post(archive_agent_chat),
        )
        .route(
            "/agent/chats/{chat_id}/restore",
            axum::routing::post(restore_agent_chat),
        )
}

async fn get_agent_definitions(
    State(state): State<AppState>,
    Query(query): Query<AgentOrgQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let data = agent_chats::list_agents(&state, &query.org_id).await?;
    Ok(Json(serde_json::json!({
        "organization_id": query.org_id,
        "data": data,
    })))
}

async fn get_agent_chats(
    State(state): State<AppState>,
    Query(query): Query<AgentChatsQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let data =
        agent_chats::list_chats(&state, &query.org_id, &user_id, query.archived, query.limit)
            .await?;

    Ok(Json(serde_json::json!({
        "organization_id": query.org_id,
        "archived": query.archived,
        "data": data,
    })))
}

async fn create_agent_chat(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateAgentChatInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &payload.org_id).await?;

    let chat = agent_chats::create_chat(
        &state,
        &payload.org_id,
        &user_id,
        &payload.agent_slug,
        payload.title.as_deref(),
    )
    .await?;

    let entity_id = value_str(&chat, "id");
    write_audit_log(
        state.db_pool.as_ref(),
        Some(&payload.org_id),
        Some(&user_id),
        "agent.chat.create",
        "ai_chat",
        entity_id.as_deref(),
        None,
        Some(serde_json::json!({
            "agent_slug": payload.agent_slug,
            "title": value_str(&chat, "title"),
        })),
    )
    .await;

    Ok(Json(chat))
}

async fn get_agent_chat(
    State(state): State<AppState>,
    Path(path): Path<AgentChatPath>,
    Query(query): Query<AgentOrgQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let chat = agent_chats::get_chat(&state, &path.chat_id, &query.org_id, &user_id).await?;
    Ok(Json(chat))
}

async fn get_agent_chat_messages(
    State(state): State<AppState>,
    Path(path): Path<AgentChatPath>,
    Query(query): Query<AgentChatMessagesQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let data = agent_chats::list_chat_messages(
        &state,
        &path.chat_id,
        &query.org_id,
        &user_id,
        query.limit,
    )
    .await?;

    Ok(Json(serde_json::json!({
        "organization_id": query.org_id,
        "chat_id": path.chat_id,
        "data": data,
    })))
}

async fn post_agent_chat_message(
    State(state): State<AppState>,
    Path(path): Path<AgentChatPath>,
    Query(query): Query<AgentOrgQuery>,
    headers: HeaderMap,
    Json(payload): Json<SendAgentMessageInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let membership = assert_org_member(&state, &user_id, &query.org_id).await?;
    let role = membership
        .as_object()
        .and_then(|obj| obj.get("role"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("viewer")
        .to_string();

    let result = agent_chats::send_chat_message(
        &state,
        &path.chat_id,
        &query.org_id,
        &user_id,
        &role,
        &payload.message,
        payload.allow_mutations,
        payload.confirm_write,
    )
    .await?;

    if payload.allow_mutations {
        write_audit_log(
            state.db_pool.as_ref(),
            Some(&query.org_id),
            Some(&user_id),
            "agent.chat.write_attempt",
            "ai_chat",
            Some(&path.chat_id),
            None,
            Some(serde_json::json!({
                "role": role,
                "confirm_write": payload.confirm_write,
                "tool_trace_count": tool_trace_count(&result),
                "mutations_enabled": result
                    .get("mutations_enabled")
                    .and_then(Value::as_bool)
                    .unwrap_or(false),
            })),
        )
        .await;
    }

    let mut response = Map::new();
    response.insert(
        "organization_id".to_string(),
        Value::String(query.org_id.clone()),
    );
    response.insert("chat_id".to_string(), Value::String(path.chat_id.clone()));
    response.insert("role".to_string(), Value::String(role));
    response.extend(result);

    Ok(Json(Value::Object(response)))
}

async fn archive_agent_chat(
    State(state): State<AppState>,
    Path(path): Path<AgentChatPath>,
    Query(query): Query<AgentOrgQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let chat = agent_chats::archive_chat(&state, &path.chat_id, &query.org_id, &user_id).await?;

    write_audit_log(
        state.db_pool.as_ref(),
        Some(&query.org_id),
        Some(&user_id),
        "agent.chat.archive",
        "ai_chat",
        Some(&path.chat_id),
        None,
        Some(serde_json::json!({ "is_archived": true })),
    )
    .await;

    Ok(Json(serde_json::json!({
        "ok": true,
        "organization_id": query.org_id,
        "chat_id": path.chat_id,
        "is_archived": chat
            .as_object()
            .and_then(|obj| obj.get("is_archived"))
            .and_then(Value::as_bool)
            .unwrap_or(false),
    })))
}

async fn restore_agent_chat(
    State(state): State<AppState>,
    Path(path): Path<AgentChatPath>,
    Query(query): Query<AgentOrgQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let chat = agent_chats::restore_chat(&state, &path.chat_id, &query.org_id, &user_id).await?;

    write_audit_log(
        state.db_pool.as_ref(),
        Some(&query.org_id),
        Some(&user_id),
        "agent.chat.restore",
        "ai_chat",
        Some(&path.chat_id),
        None,
        Some(serde_json::json!({
            "is_archived": chat
                .as_object()
                .and_then(|obj| obj.get("is_archived"))
                .and_then(Value::as_bool)
                .unwrap_or(false),
        })),
    )
    .await;

    Ok(Json(serde_json::json!({
        "ok": true,
        "organization_id": query.org_id,
        "chat_id": path.chat_id,
        "is_archived": chat
            .as_object()
            .and_then(|obj| obj.get("is_archived"))
            .and_then(Value::as_bool)
            .unwrap_or(false),
    })))
}

async fn delete_agent_chat(
    State(state): State<AppState>,
    Path(path): Path<AgentChatPath>,
    Query(query): Query<AgentOrgQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let deleted = agent_chats::delete_chat(&state, &path.chat_id, &query.org_id, &user_id).await?;

    write_audit_log(
        state.db_pool.as_ref(),
        Some(&query.org_id),
        Some(&user_id),
        "agent.chat.delete",
        "ai_chat",
        Some(&path.chat_id),
        Some(serde_json::json!({
            "title": value_str(&deleted, "title"),
            "is_archived": deleted
                .as_object()
                .and_then(|obj| obj.get("is_archived"))
                .and_then(Value::as_bool)
                .unwrap_or(false),
        })),
        None,
    )
    .await;

    Ok(Json(serde_json::json!({
        "ok": true,
        "organization_id": query.org_id,
        "chat_id": path.chat_id,
    })))
}

fn default_limit_30() -> i64 {
    30
}

fn default_limit_120() -> i64 {
    120
}

fn tool_trace_count(result: &Map<String, Value>) -> usize {
    result
        .get("tool_trace")
        .and_then(Value::as_array)
        .map(Vec::len)
        .unwrap_or(0)
}

fn value_str(row: &Value, key: &str) -> Option<String> {
    row.as_object()
        .and_then(|obj| obj.get(key))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}
