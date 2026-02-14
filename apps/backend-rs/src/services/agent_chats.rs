use serde_json::{json, Map, Value};
use sqlx::Row;

use crate::{
    error::{AppError, AppResult},
    state::AppState,
};

use super::ai_agent::{run_ai_agent_chat, AgentConversationMessage, RunAiAgentChatParams};

const MAX_CHAT_LIMIT: i64 = 100;
const MAX_MESSAGE_LIMIT: i64 = 300;
const CONTEXT_WINDOW: i64 = 20;

pub async fn list_agents(state: &AppState, org_id: &str) -> AppResult<Vec<Value>> {
    if org_id.trim().is_empty() {
        return Err(AppError::BadRequest("org_id is required.".to_string()));
    }

    let pool = db_pool(state)?;
    let rows = sqlx::query(
        "SELECT row_to_json(t) AS row FROM (
            SELECT id, slug, name, description, icon_key, is_active
            FROM ai_agents
            WHERE is_active = TRUE
            ORDER BY name ASC
        ) t",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?;

    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<Option<Value>, _>("row").ok().flatten())
        .collect())
}

pub async fn list_chats(
    state: &AppState,
    org_id: &str,
    user_id: &str,
    archived: bool,
    limit: i64,
) -> AppResult<Vec<Value>> {
    let bounded_limit = coerce_limit(limit, 30, 1, MAX_CHAT_LIMIT);
    let pool = db_pool(state)?;

    let rows = sqlx::query(
        "SELECT row_to_json(t) AS row
         FROM ai_chats t
         WHERE organization_id = $1::uuid
           AND created_by_user_id = $2::uuid
           AND is_archived = $3
         ORDER BY last_message_at DESC
         LIMIT $4",
    )
    .bind(org_id)
    .bind(user_id)
    .bind(archived)
    .bind(bounded_limit)
    .fetch_all(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?;

    let chats = rows
        .into_iter()
        .filter_map(|row| row.try_get::<Option<Value>, _>("row").ok().flatten())
        .collect::<Vec<_>>();

    if chats.is_empty() {
        return Ok(Vec::new());
    }

    let agent_ids = chats
        .iter()
        .filter_map(|chat| value_str(chat, "agent_id"))
        .collect::<Vec<_>>();

    let mut agent_map = std::collections::HashMap::<String, Value>::new();
    if !agent_ids.is_empty() {
        let agent_rows = sqlx::query(
            "SELECT row_to_json(t) AS row
             FROM (
                SELECT id, slug, name, description, icon_key, is_active
                FROM ai_agents
                WHERE id = ANY($1::uuid[])
             ) t",
        )
        .bind(&agent_ids)
        .fetch_all(pool)
        .await
        .map_err(|error| supabase_error(state, &error))?;

        for row in agent_rows {
            if let Some(item) = row.try_get::<Option<Value>, _>("row").ok().flatten() {
                if let Some(id) = value_str(&item, "id") {
                    agent_map.insert(id, item);
                }
            }
        }
    }

    let mut summaries = Vec::new();
    for chat in chats {
        let Some(agent_id) = value_str(&chat, "agent_id") else {
            continue;
        };
        let Some(agent) = agent_map.get(&agent_id) else {
            continue;
        };

        let preview = latest_preview_for_chat(
            state,
            value_str(&chat, "id").as_deref().unwrap_or_default(),
            org_id,
            user_id,
        )
        .await?;
        summaries.push(serialize_chat_summary(&chat, agent, preview));
    }

    Ok(summaries)
}

pub async fn create_chat(
    state: &AppState,
    org_id: &str,
    user_id: &str,
    agent_slug: &str,
    title: Option<&str>,
) -> AppResult<Value> {
    let agent = get_agent_by_slug(state, agent_slug).await?;
    let fallback_title = value_str(&agent, "name").unwrap_or_else(|| "New chat".to_string());
    let chat_title = clean_title(title, &fallback_title);

    let pool = db_pool(state)?;
    let row = sqlx::query(
        "INSERT INTO ai_chats (organization_id, created_by_user_id, agent_id, title, is_archived)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, FALSE)
         RETURNING row_to_json(ai_chats.*) AS row",
    )
    .bind(org_id)
    .bind(user_id)
    .bind(value_str(&agent, "id").unwrap_or_default())
    .bind(chat_title)
    .fetch_optional(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?;

    let chat = row
        .and_then(|item| item.try_get::<Option<Value>, _>("row").ok().flatten())
        .ok_or_else(|| AppError::Internal("Could not create chat.".to_string()))?;

    Ok(serialize_chat_summary(&chat, &agent, None))
}

pub async fn get_chat(
    state: &AppState,
    chat_id: &str,
    org_id: &str,
    user_id: &str,
) -> AppResult<Value> {
    let chat = ensure_chat_owner(state, chat_id, org_id, user_id).await?;
    let agent_id = value_str(&chat, "agent_id").unwrap_or_default();
    let agent = get_agent_by_id(state, &agent_id).await?;
    let preview = latest_preview_for_chat(state, chat_id, org_id, user_id).await?;
    Ok(serialize_chat_summary(&chat, &agent, preview))
}

pub async fn list_chat_messages(
    state: &AppState,
    chat_id: &str,
    org_id: &str,
    user_id: &str,
    limit: i64,
) -> AppResult<Vec<Value>> {
    let _chat = ensure_chat_owner(state, chat_id, org_id, user_id).await?;
    let bounded_limit = coerce_limit(limit, 80, 1, MAX_MESSAGE_LIMIT);

    let pool = db_pool(state)?;
    let rows = sqlx::query(
        "SELECT row_to_json(t) AS row
         FROM ai_chat_messages t
         WHERE chat_id = $1::uuid
           AND organization_id = $2::uuid
           AND created_by_user_id = $3::uuid
         ORDER BY created_at DESC
         LIMIT $4",
    )
    .bind(chat_id)
    .bind(org_id)
    .bind(user_id)
    .bind(bounded_limit)
    .fetch_all(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?;

    let mut messages = rows
        .into_iter()
        .filter_map(|row| row.try_get::<Option<Value>, _>("row").ok().flatten())
        .map(|row| serialize_chat_message(&row))
        .collect::<Vec<_>>();

    messages.reverse();
    Ok(messages)
}

#[allow(clippy::too_many_arguments)]
pub async fn send_chat_message(
    state: &AppState,
    chat_id: &str,
    org_id: &str,
    user_id: &str,
    role: &str,
    message: &str,
    allow_mutations: bool,
    confirm_write: bool,
) -> AppResult<Map<String, Value>> {
    let chat = ensure_chat_owner(state, chat_id, org_id, user_id).await?;
    let agent_id = value_str(&chat, "agent_id").unwrap_or_default();
    let agent = get_agent_by_id(state, &agent_id).await?;

    let trimmed_message = message.trim();
    if trimmed_message.is_empty() {
        return Err(AppError::BadRequest("message is required.".to_string()));
    }

    let conversation = collect_context_messages(state, chat_id, org_id, user_id).await?;
    let pool = db_pool(state)?;

    let user_row = sqlx::query(
        "INSERT INTO ai_chat_messages (chat_id, organization_id, role, content, created_by_user_id)
         VALUES ($1::uuid, $2::uuid, 'user', $3, $4::uuid)
         RETURNING row_to_json(ai_chat_messages.*) AS row",
    )
    .bind(chat_id)
    .bind(org_id)
    .bind(trimmed_message)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?
    .and_then(|row| row.try_get::<Option<Value>, _>("row").ok().flatten())
    .ok_or_else(|| AppError::Internal("Could not persist user message.".to_string()))?;

    let agent_name = value_str(&agent, "name").unwrap_or_else(|| "Operations Copilot".to_string());
    let agent_prompt = value_str(&agent, "system_prompt");
    let allowed_tools = agent_allowed_tools(&agent);

    let agent_result = run_ai_agent_chat(
        state,
        RunAiAgentChatParams {
            org_id,
            role,
            message: trimmed_message,
            conversation: &conversation,
            allow_mutations,
            confirm_write,
            agent_name: &agent_name,
            agent_prompt: agent_prompt.as_deref(),
            allowed_tools: allowed_tools.as_deref(),
        },
    )
    .await?;

    let reply = agent_result
        .get("reply")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| "No response generated.".to_string());

    let fallback_used = agent_result
        .get("fallback_used")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let tool_trace = agent_result
        .get("tool_trace")
        .and_then(Value::as_array)
        .cloned();
    let model_used = agent_result
        .get("model_used")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned);

    let assistant_row = sqlx::query(
        "INSERT INTO ai_chat_messages (
            chat_id,
            organization_id,
            role,
            content,
            created_by_user_id,
            fallback_used,
            tool_trace,
            model_used
         ) VALUES ($1::uuid, $2::uuid, 'assistant', $3, $4::uuid, $5, $6, $7)
         RETURNING row_to_json(ai_chat_messages.*) AS row",
    )
    .bind(chat_id)
    .bind(org_id)
    .bind(&reply)
    .bind(user_id)
    .bind(fallback_used)
    .bind(tool_trace.clone().map(Value::Array))
    .bind(model_used.clone())
    .fetch_optional(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?
    .and_then(|row| row.try_get::<Option<Value>, _>("row").ok().flatten())
    .ok_or_else(|| AppError::Internal("Could not persist assistant message.".to_string()))?;

    let current_title = value_str(&chat, "title").unwrap_or_default();
    let agent_title = value_str(&agent, "name").unwrap_or_default();
    let generated_title =
        if current_title.trim().is_empty() || current_title.trim() == agent_title.trim() {
            let fallback = if current_title.trim().is_empty() {
                "New chat"
            } else {
                current_title.trim()
            };
            clean_title(Some(trimmed_message), fallback)
        } else {
            current_title.clone()
        };

    let assistant_created_at = value_str(&assistant_row, "created_at").unwrap_or_default();
    if !assistant_created_at.is_empty() {
        sqlx::query(
            "UPDATE ai_chats
             SET last_message_at = $1::timestamptz,
                 title = $2
             WHERE id = $3::uuid",
        )
        .bind(&assistant_created_at)
        .bind(&generated_title)
        .bind(chat_id)
        .execute(pool)
        .await
        .map_err(|error| supabase_error(state, &error))?;
    }

    let summary = get_chat(state, chat_id, org_id, user_id).await?;

    let mut payload = Map::new();
    payload.insert("chat".to_string(), summary);
    payload.insert(
        "user_message".to_string(),
        serialize_chat_message(&user_row),
    );
    payload.insert(
        "assistant_message".to_string(),
        serialize_chat_message(&assistant_row),
    );
    payload.insert("reply".to_string(), Value::String(reply));
    payload.insert(
        "tool_trace".to_string(),
        Value::Array(tool_trace.unwrap_or_default()),
    );
    payload.insert(
        "mutations_enabled".to_string(),
        Value::Bool(
            agent_result
                .get("mutations_enabled")
                .and_then(Value::as_bool)
                .unwrap_or(false),
        ),
    );
    payload.insert(
        "model_used".to_string(),
        agent_result
            .get("model_used")
            .cloned()
            .unwrap_or(Value::Null),
    );
    payload.insert("fallback_used".to_string(), Value::Bool(fallback_used));

    Ok(payload)
}

pub async fn archive_chat(
    state: &AppState,
    chat_id: &str,
    org_id: &str,
    user_id: &str,
) -> AppResult<Value> {
    let _chat = ensure_chat_owner(state, chat_id, org_id, user_id).await?;
    let pool = db_pool(state)?;

    let row = sqlx::query(
        "UPDATE ai_chats
         SET is_archived = TRUE
         WHERE id = $1::uuid
           AND organization_id = $2::uuid
           AND created_by_user_id = $3::uuid
         RETURNING row_to_json(ai_chats.*) AS row",
    )
    .bind(chat_id)
    .bind(org_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?
    .and_then(|item| item.try_get::<Option<Value>, _>("row").ok().flatten())
    .ok_or_else(|| AppError::NotFound("Chat not found.".to_string()))?;

    Ok(row)
}

pub async fn restore_chat(
    state: &AppState,
    chat_id: &str,
    org_id: &str,
    user_id: &str,
) -> AppResult<Value> {
    let _chat = ensure_chat_owner(state, chat_id, org_id, user_id).await?;
    let pool = db_pool(state)?;

    let row = sqlx::query(
        "UPDATE ai_chats
         SET is_archived = FALSE
         WHERE id = $1::uuid
           AND organization_id = $2::uuid
           AND created_by_user_id = $3::uuid
         RETURNING row_to_json(ai_chats.*) AS row",
    )
    .bind(chat_id)
    .bind(org_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?
    .and_then(|item| item.try_get::<Option<Value>, _>("row").ok().flatten())
    .ok_or_else(|| AppError::NotFound("Chat not found.".to_string()))?;

    Ok(row)
}

pub async fn delete_chat(
    state: &AppState,
    chat_id: &str,
    org_id: &str,
    user_id: &str,
) -> AppResult<Value> {
    let chat = ensure_chat_owner(state, chat_id, org_id, user_id).await?;
    let pool = db_pool(state)?;

    sqlx::query(
        "DELETE FROM ai_chats
         WHERE id = $1::uuid
           AND organization_id = $2::uuid
           AND created_by_user_id = $3::uuid",
    )
    .bind(chat_id)
    .bind(org_id)
    .bind(user_id)
    .execute(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?;

    Ok(chat)
}

async fn get_agent_by_slug(state: &AppState, slug: &str) -> AppResult<Value> {
    let value = slug.trim();
    if value.is_empty() {
        return Err(AppError::BadRequest("agent_slug is required.".to_string()));
    }

    let pool = db_pool(state)?;
    let row = sqlx::query(
        "SELECT row_to_json(t) AS row
         FROM ai_agents t
         WHERE slug = $1
           AND is_active = TRUE
         LIMIT 1",
    )
    .bind(value)
    .fetch_optional(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?;

    row.and_then(|item| item.try_get::<Option<Value>, _>("row").ok().flatten())
        .ok_or_else(|| AppError::NotFound(format!("AI agent '{value}' was not found.")))
}

async fn get_agent_by_id(state: &AppState, agent_id: &str) -> AppResult<Value> {
    let pool = db_pool(state)?;
    let row = sqlx::query(
        "SELECT row_to_json(t) AS row
         FROM ai_agents t
         WHERE id = $1::uuid
           AND is_active = TRUE
         LIMIT 1",
    )
    .bind(agent_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?;

    row.and_then(|item| item.try_get::<Option<Value>, _>("row").ok().flatten())
        .ok_or_else(|| AppError::NotFound("AI agent was not found.".to_string()))
}

async fn ensure_chat_owner(
    state: &AppState,
    chat_id: &str,
    org_id: &str,
    user_id: &str,
) -> AppResult<Value> {
    let pool = db_pool(state)?;
    let row = sqlx::query(
        "SELECT row_to_json(t) AS row
         FROM ai_chats t
         WHERE id = $1::uuid
           AND organization_id = $2::uuid
           AND created_by_user_id = $3::uuid
         LIMIT 1",
    )
    .bind(chat_id)
    .bind(org_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?;

    row.and_then(|item| item.try_get::<Option<Value>, _>("row").ok().flatten())
        .ok_or_else(|| AppError::NotFound("Chat not found.".to_string()))
}

async fn latest_preview_for_chat(
    state: &AppState,
    chat_id: &str,
    org_id: &str,
    user_id: &str,
) -> AppResult<Option<String>> {
    let pool = db_pool(state)?;

    let row = sqlx::query(
        "SELECT content
         FROM ai_chat_messages
         WHERE chat_id = $1::uuid
           AND organization_id = $2::uuid
           AND created_by_user_id = $3::uuid
         ORDER BY created_at DESC
         LIMIT 1",
    )
    .bind(chat_id)
    .bind(org_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| supabase_error(state, &error))?;

    let content = row
        .and_then(|item| item.try_get::<Option<String>, _>("content").ok().flatten())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    Ok(content.map(|value| trim_preview(&value, 120)))
}

async fn collect_context_messages(
    state: &AppState,
    chat_id: &str,
    org_id: &str,
    user_id: &str,
) -> AppResult<Vec<AgentConversationMessage>> {
    let messages = list_chat_messages(state, chat_id, org_id, user_id, CONTEXT_WINDOW).await?;
    let mut context = Vec::new();

    for message in messages {
        let role = value_str(&message, "role")
            .map(|value| value.trim().to_ascii_lowercase())
            .unwrap_or_default();
        let content = value_str(&message, "content")
            .map(|value| value.trim().to_string())
            .unwrap_or_default();

        if matches!(role.as_str(), "user" | "assistant") && !content.is_empty() {
            context.push(AgentConversationMessage { role, content });
        }
    }

    let trim_at = context.len().saturating_sub(CONTEXT_WINDOW as usize);
    Ok(context.split_off(trim_at))
}

fn agent_allowed_tools(agent_row: &Value) -> Option<Vec<String>> {
    let raw = agent_row
        .as_object()
        .and_then(|obj| obj.get("allowed_tools"))
        .and_then(Value::as_array)?;

    let mut tools = Vec::new();
    for item in raw {
        let tool = item.as_str().map(str::trim).unwrap_or_default();
        if !tool.is_empty() && !tools.iter().any(|existing| existing == tool) {
            tools.push(tool.to_string());
        }
    }

    if tools.is_empty() {
        return None;
    }
    Some(tools)
}

fn serialize_chat_summary(
    chat: &Value,
    agent: &Value,
    latest_message_preview: Option<String>,
) -> Value {
    json!({
        "id": chat.as_object().and_then(|obj| obj.get("id")).cloned().unwrap_or(Value::Null),
        "org_id": chat.as_object().and_then(|obj| obj.get("organization_id")).cloned().unwrap_or(Value::Null),
        "agent_id": agent.as_object().and_then(|obj| obj.get("id")).cloned().unwrap_or(Value::Null),
        "agent_slug": agent.as_object().and_then(|obj| obj.get("slug")).cloned().unwrap_or(Value::Null),
        "agent_name": agent.as_object().and_then(|obj| obj.get("name")).cloned().unwrap_or(Value::Null),
        "agent_icon_key": agent.as_object().and_then(|obj| obj.get("icon_key")).cloned().unwrap_or(Value::Null),
        "title": chat.as_object().and_then(|obj| obj.get("title")).cloned().unwrap_or(Value::Null),
        "is_archived": chat.as_object().and_then(|obj| obj.get("is_archived")).and_then(Value::as_bool).unwrap_or(false),
        "last_message_at": chat
            .as_object()
            .and_then(|obj| obj.get("last_message_at"))
            .cloned()
            .unwrap_or_else(|| chat.as_object().and_then(|obj| obj.get("created_at")).cloned().unwrap_or(Value::Null)),
        "created_at": chat.as_object().and_then(|obj| obj.get("created_at")).cloned().unwrap_or(Value::Null),
        "updated_at": chat.as_object().and_then(|obj| obj.get("updated_at")).cloned().unwrap_or(Value::Null),
        "latest_message_preview": latest_message_preview.map(Value::String).unwrap_or(Value::Null),
    })
}

fn serialize_chat_message(row: &Value) -> Value {
    json!({
        "id": row.as_object().and_then(|obj| obj.get("id")).cloned().unwrap_or(Value::Null),
        "chat_id": row.as_object().and_then(|obj| obj.get("chat_id")).cloned().unwrap_or(Value::Null),
        "org_id": row.as_object().and_then(|obj| obj.get("organization_id")).cloned().unwrap_or(Value::Null),
        "role": row.as_object().and_then(|obj| obj.get("role")).cloned().unwrap_or(Value::Null),
        "content": row.as_object().and_then(|obj| obj.get("content")).cloned().unwrap_or(Value::Null),
        "tool_trace": row.as_object().and_then(|obj| obj.get("tool_trace")).cloned().unwrap_or(Value::Null),
        "model_used": row.as_object().and_then(|obj| obj.get("model_used")).cloned().unwrap_or(Value::Null),
        "fallback_used": row.as_object().and_then(|obj| obj.get("fallback_used")).and_then(Value::as_bool).unwrap_or(false),
        "created_at": row.as_object().and_then(|obj| obj.get("created_at")).cloned().unwrap_or(Value::Null),
    })
}

fn trim_preview(value: &str, max_chars: usize) -> String {
    let normalized = value.split_whitespace().collect::<Vec<_>>().join(" ");
    let char_count = normalized.chars().count();
    if char_count <= max_chars {
        return normalized;
    }

    let mut trimmed = normalized
        .chars()
        .take(max_chars.saturating_sub(3))
        .collect::<String>();
    while trimmed.ends_with(char::is_whitespace) {
        trimmed.pop();
    }
    format!("{trimmed}...")
}

fn clean_title(value: Option<&str>, fallback: &str) -> String {
    let candidate = value.map(str::trim).unwrap_or_default();
    if candidate.is_empty() {
        return fallback.to_string();
    }

    if candidate.chars().count() > 180 {
        let mut next = candidate.chars().take(180).collect::<String>();
        while next.ends_with(char::is_whitespace) {
            next.pop();
        }
        return next;
    }

    candidate.to_string()
}

fn coerce_limit(value: i64, default: i64, minimum: i64, maximum: i64) -> i64 {
    let parsed = if value <= 0 { default } else { value };
    parsed.clamp(minimum, maximum)
}

fn value_str(row: &Value, key: &str) -> Option<String> {
    row.as_object()
        .and_then(|obj| obj.get(key))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn db_pool(state: &AppState) -> AppResult<&sqlx::PgPool> {
    state.db_pool.as_ref().ok_or_else(|| {
        AppError::Dependency(
            "Supabase database is not configured. Set SUPABASE_DB_URL or DATABASE_URL.".to_string(),
        )
    })
}

fn supabase_error(state: &AppState, error: &sqlx::Error) -> AppError {
    if state.config.is_production() {
        return AppError::Dependency("Supabase request failed.".to_string());
    }
    AppError::Dependency(format!("Supabase request failed: {error}"))
}
