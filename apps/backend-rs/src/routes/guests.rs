use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    response::IntoResponse,
    Json,
};
use serde_json::{json, Map, Value};

use crate::{
    auth::require_user_id,
    error::{AppError, AppResult},
    repository::table_service::{create_row, delete_row, get_row, list_rows, update_row},
    schemas::{
        clamp_limit, remove_nulls, serialize_to_map, validate_input, CreateGuestInput, GuestPath,
        GuestsQuery, UpdateGuestInput,
    },
    services::audit::write_audit_log,
    state::AppState,
    tenancy::{assert_org_member, assert_org_role},
};

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route(
            "/guests",
            axum::routing::get(list_guests).post(create_guest),
        )
        .route(
            "/guests/{guest_id}",
            axum::routing::get(get_guest)
                .patch(update_guest)
                .delete(delete_guest),
        )
}

async fn list_guests(
    State(state): State<AppState>,
    Query(query): Query<GuestsQuery>,
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
    let rows = list_rows(
        pool,
        "guests",
        Some(&filters),
        clamp_limit(query.limit),
        0,
        "created_at",
        false,
    )
    .await?;
    Ok(Json(json!({ "data": rows })))
}

async fn create_guest(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateGuestInput>,
) -> AppResult<impl IntoResponse> {
    validate_input(&payload)?;
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
    let created = create_row(pool, "guests", &record).await?;
    let entity_id = value_str(&created, "id");
    write_audit_log(
        state.db_pool.as_ref(),
        Some(&payload.organization_id),
        Some(&user_id),
        "create",
        "guests",
        Some(&entity_id),
        None,
        Some(created.clone()),
    )
    .await;
    Ok((axum::http::StatusCode::CREATED, Json(created)))
}

async fn get_guest(
    State(state): State<AppState>,
    Path(path): Path<GuestPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;
    let row = get_row(pool, "guests", &path.guest_id, "id").await?;
    let org_id = value_str(&row, "organization_id");
    assert_org_member(&state, &user_id, &org_id).await?;
    Ok(Json(row))
}

async fn update_guest(
    State(state): State<AppState>,
    Path(path): Path<GuestPath>,
    headers: HeaderMap,
    Json(payload): Json<UpdateGuestInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;
    let record = get_row(pool, "guests", &path.guest_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_role(&state, &user_id, &org_id, &["owner_admin", "operator"]).await?;
    let patch = remove_nulls(serialize_to_map(&payload));
    let updated = update_row(pool, "guests", &path.guest_id, &patch, "id").await?;
    write_audit_log(
        state.db_pool.as_ref(),
        Some(&org_id),
        Some(&user_id),
        "update",
        "guests",
        Some(&path.guest_id),
        Some(record),
        Some(updated.clone()),
    )
    .await;
    Ok(Json(updated))
}

async fn delete_guest(
    State(state): State<AppState>,
    Path(path): Path<GuestPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;
    let record = get_row(pool, "guests", &path.guest_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_role(&state, &user_id, &org_id, &["owner_admin", "operator"]).await?;
    let deleted = delete_row(pool, "guests", &path.guest_id, "id").await?;
    write_audit_log(
        state.db_pool.as_ref(),
        Some(&org_id),
        Some(&user_id),
        "delete",
        "guests",
        Some(&path.guest_id),
        Some(deleted.clone()),
        None,
    )
    .await;
    Ok(Json(deleted))
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
