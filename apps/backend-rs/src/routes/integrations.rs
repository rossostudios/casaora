use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Map, Value};
use sqlx::Row;

use crate::{
    auth::require_user_id,
    error::{AppError, AppResult},
    repository::table_service::{create_row, get_row, list_rows},
    schemas::{
        clamp_limit_in_range, AuditLogPath, AuditLogsQuery, IntegrationEventPath,
        IntegrationEventsQuery,
    },
    state::AppState,
    tenancy::{assert_org_member, assert_org_role},
};

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route(
            "/integration-events",
            axum::routing::get(list_integration_events).post(create_integration_event),
        )
        .route(
            "/integration-events/{event_id}",
            axum::routing::get(get_integration_event),
        )
        .route(
            "/integrations/webhooks/{provider}",
            axum::routing::post(ingest_integration_webhook),
        )
        .route("/audit-logs", axum::routing::get(list_audit_logs))
        .route("/audit-logs/{log_id}", axum::routing::get(get_audit_log))
}

async fn list_integration_events(
    State(state): State<AppState>,
    Query(query): Query<IntegrationEventsQuery>,
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
    if let Some(provider) = non_empty_opt(query.provider.as_deref()) {
        filters.insert("provider".to_string(), Value::String(provider));
    }
    if let Some(event_type) = non_empty_opt(query.event_type.as_deref()) {
        filters.insert("event_type".to_string(), Value::String(event_type));
    }
    if let Some(status) = non_empty_opt(query.status.as_deref()) {
        filters.insert("status".to_string(), Value::String(status));
    }

    let rows = list_rows(
        pool,
        "integration_events",
        Some(&filters),
        clamp_limit_in_range(query.limit, 1, 1000),
        0,
        "received_at",
        false,
    )
    .await?;

    Ok(Json(json!({ "data": rows })))
}

async fn create_integration_event(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<Value>,
) -> AppResult<impl IntoResponse> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let Some(payload_obj) = payload.as_object() else {
        return Err(AppError::BadRequest(
            "payload must be an object.".to_string(),
        ));
    };

    let organization_id = payload_obj
        .get("organization_id")
        .or_else(|| payload_obj.get("org_id"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .ok_or_else(|| AppError::BadRequest("organization_id is required.".to_string()))?;

    let provider = payload_obj
        .get("provider")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .ok_or_else(|| AppError::BadRequest("provider is required.".to_string()))?;

    let event_type = payload_obj
        .get("event_type")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .ok_or_else(|| AppError::BadRequest("event_type is required.".to_string()))?;

    let body = payload_obj
        .get("payload")
        .cloned()
        .ok_or_else(|| AppError::BadRequest("payload is required.".to_string()))?;

    assert_org_role(
        &state,
        &user_id,
        &organization_id,
        &["owner_admin", "operator"],
    )
    .await?;

    let mut record = Map::new();
    record.insert(
        "organization_id".to_string(),
        Value::String(organization_id),
    );
    record.insert("provider".to_string(), Value::String(provider));
    record.insert("event_type".to_string(), Value::String(event_type));
    if let Some(external_event_id) = payload_obj
        .get("external_event_id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        record.insert(
            "external_event_id".to_string(),
            Value::String(external_event_id.to_string()),
        );
    }
    record.insert("payload".to_string(), body);
    record.insert("status".to_string(), Value::String("received".to_string()));

    let created = create_row(pool, "integration_events", &record).await?;
    Ok((axum::http::StatusCode::CREATED, Json(created)))
}

async fn get_integration_event(
    State(state): State<AppState>,
    Path(path): Path<IntegrationEventPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let record = get_row(pool, "integration_events", &path.event_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    if org_id.is_empty() {
        return Err(AppError::Forbidden(
            "Forbidden: integration event is missing organization context.".to_string(),
        ));
    }
    assert_org_member(&state, &user_id, &org_id).await?;
    Ok(Json(record))
}

#[derive(Debug, Deserialize)]
struct IngestWebhookQuery {
    org_id: String,
    event_type: String,
    external_event_id: Option<String>,
}

async fn ingest_integration_webhook(
    State(state): State<AppState>,
    Path(provider): Path<String>,
    Query(query): Query<IngestWebhookQuery>,
    headers: HeaderMap,
    Json(payload): Json<Value>,
) -> AppResult<impl IntoResponse> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    assert_org_role(
        &state,
        &user_id,
        &query.org_id,
        &["owner_admin", "operator"],
    )
    .await?;

    let mut record = Map::new();
    record.insert(
        "organization_id".to_string(),
        Value::String(query.org_id.clone()),
    );
    record.insert("provider".to_string(), Value::String(provider));
    record.insert(
        "event_type".to_string(),
        Value::String(query.event_type.clone()),
    );
    if let Some(external_event_id) = non_empty_opt(query.external_event_id.as_deref()) {
        record.insert(
            "external_event_id".to_string(),
            Value::String(external_event_id),
        );
    }
    record.insert("payload".to_string(), payload);
    record.insert("status".to_string(), Value::String("received".to_string()));

    let created = create_row(pool, "integration_events", &record).await?;
    Ok((axum::http::StatusCode::CREATED, Json(created)))
}

async fn list_audit_logs(
    State(state): State<AppState>,
    Query(query): Query<AuditLogsQuery>,
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
    if let Some(action) = non_empty_opt(query.action.as_deref()) {
        filters.insert("action".to_string(), Value::String(action));
    }
    if let Some(entity_name) = non_empty_opt(query.entity_name.as_deref()) {
        filters.insert("entity_name".to_string(), Value::String(entity_name));
    }

    let rows = list_rows(
        pool,
        "audit_logs",
        Some(&filters),
        clamp_limit_in_range(query.limit, 1, 2000),
        0,
        "created_at",
        false,
    )
    .await?;
    Ok(Json(json!({ "data": rows })))
}

async fn get_audit_log(
    State(state): State<AppState>,
    Path(path): Path<AuditLogPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let row = sqlx::query("SELECT row_to_json(t) AS row FROM audit_logs t WHERE id = $1 LIMIT 1")
        .bind(path.log_id)
        .fetch_optional(pool)
        .await
        .map_err(|error| AppError::Dependency(format!("Supabase request failed: {error}")))?;

    let record = row
        .and_then(|item| item.try_get::<Option<Value>, _>("row").ok().flatten())
        .ok_or_else(|| AppError::NotFound("audit_logs record not found.".to_string()))?;

    let org_id = value_str(&record, "organization_id");
    if org_id.is_empty() {
        return Err(AppError::Forbidden(
            "Forbidden: audit log is missing organization context.".to_string(),
        ));
    }
    assert_org_member(&state, &user_id, &org_id).await?;

    Ok(Json(record))
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
