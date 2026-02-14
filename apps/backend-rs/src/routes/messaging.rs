use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde_json::{json, Map, Value};

use crate::{
    auth::require_user_id,
    error::{AppError, AppResult},
    repository::table_service::{create_row, get_row, list_rows},
    schemas::{
        clamp_limit_in_range, remove_nulls, serialize_to_map, CreateMessageTemplateInput,
        MessageTemplatesQuery, SendMessageInput, TemplatePath,
    },
    services::audit::write_audit_log,
    state::AppState,
    tenancy::{assert_org_member, assert_org_role},
};

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route(
            "/message-templates",
            axum::routing::get(list_templates).post(create_template),
        )
        .route(
            "/message-templates/{template_id}",
            axum::routing::get(get_template),
        )
        .route("/messages/send", axum::routing::post(send_message))
}

async fn list_templates(
    State(state): State<AppState>,
    Query(query): Query<MessageTemplatesQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;
    let pool = db_pool(&state)?;

    let mut filters = Map::new();
    filters.insert(
        "organization_id".to_string(),
        Value::String(query.org_id.clone()),
    );
    if let Some(channel) = non_empty_opt(query.channel.as_deref()) {
        filters.insert("channel".to_string(), Value::String(channel));
    }

    let rows = list_rows(
        pool,
        "message_templates",
        Some(&filters),
        clamp_limit_in_range(query.limit, 1, 1000),
        0,
        "created_at",
        false,
    )
    .await?;

    Ok(Json(json!({ "data": rows })))
}

async fn create_template(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateMessageTemplateInput>,
) -> AppResult<impl IntoResponse> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_role(
        &state,
        &user_id,
        &payload.organization_id,
        &["owner_admin", "operator"],
    )
    .await?;
    let pool = db_pool(&state)?;

    let record = remove_nulls(serialize_to_map(&payload));
    let created = create_row(pool, "message_templates", &record).await?;
    let entity_id = value_str(&created, "id");

    write_audit_log(
        state.db_pool.as_ref(),
        Some(&payload.organization_id),
        Some(&user_id),
        "create",
        "message_templates",
        Some(&entity_id),
        None,
        Some(created.clone()),
    )
    .await;

    Ok((axum::http::StatusCode::CREATED, Json(created)))
}

async fn get_template(
    State(state): State<AppState>,
    Path(path): Path<TemplatePath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let record = get_row(pool, "message_templates", &path.template_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_member(&state, &user_id, &org_id).await?;

    Ok(Json(record))
}

async fn send_message(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<SendMessageInput>,
) -> AppResult<impl IntoResponse> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_role(
        &state,
        &user_id,
        &payload.organization_id,
        &["owner_admin", "operator"],
    )
    .await?;
    let pool = db_pool(&state)?;

    let mut log = remove_nulls(serialize_to_map(&payload));
    log.insert("status".to_string(), Value::String("queued".to_string()));
    if !log.contains_key("scheduled_at") {
        log.insert(
            "scheduled_at".to_string(),
            Value::String(Utc::now().to_rfc3339()),
        );
    }

    let created = create_row(pool, "message_logs", &log).await?;
    let entity_id = value_str(&created, "id");

    write_audit_log(
        state.db_pool.as_ref(),
        Some(&payload.organization_id),
        Some(&user_id),
        "create",
        "message_logs",
        Some(&entity_id),
        None,
        Some(created.clone()),
    )
    .await;

    Ok((axum::http::StatusCode::ACCEPTED, Json(created)))
}

fn db_pool(state: &AppState) -> AppResult<&sqlx::PgPool> {
    state.db_pool.as_ref().ok_or_else(|| {
        AppError::Dependency(
            "Supabase database is not configured. Set SUPABASE_DB_URL or DATABASE_URL.".to_string(),
        )
    })
}

fn value_str(row: &Value, key: &str) -> String {
    row.as_object()
        .and_then(|obj| obj.get(key))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_default()
}

fn non_empty_opt(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(ToOwned::to_owned)
}
