use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Map, Value};

use crate::{
    auth::require_user_id,
    error::{AppError, AppResult},
    repository::table_service::{create_row, delete_row, get_row, list_rows, update_row},
    schemas::{
        clamp_limit, remove_nulls, serialize_to_map, ChannelPath, ChannelsQuery,
        CreateChannelInput, CreateListingInput, ListingPath, ListingsQuery, UpdateChannelInput,
        UpdateListingInput,
    },
    services::{audit::write_audit_log, enrichment::enrich_listings, ical::sync_listing_ical_reservations},
    state::AppState,
    tenancy::{assert_org_member, assert_org_role},
};

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route(
            "/channels",
            axum::routing::get(list_channels).post(create_channel),
        )
        .route(
            "/channels/{channel_id}",
            axum::routing::get(get_channel)
                .patch(update_channel)
                .delete(delete_channel),
        )
        .route(
            "/listings",
            axum::routing::get(list_listings).post(create_listing),
        )
        .route(
            "/listings/{listing_id}",
            axum::routing::get(get_listing)
                .patch(update_listing)
                .delete(delete_listing),
        )
        .route(
            "/listings/{listing_id}/sync-ical",
            axum::routing::post(sync_listing_ical),
        )
}

async fn list_channels(
    State(state): State<AppState>,
    Query(query): Query<ChannelsQuery>,
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
        "channels",
        Some(&filters),
        clamp_limit(query.limit),
        0,
        "created_at",
        false,
    )
    .await?;

    Ok(Json(json!({ "data": rows })))
}

async fn create_channel(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateChannelInput>,
) -> AppResult<impl IntoResponse> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_role(&state, &user_id, &payload.organization_id, &["owner_admin"]).await?;
    let pool = db_pool(&state)?;

    let record = remove_nulls(serialize_to_map(&payload));
    let created = create_row(pool, "channels", &record).await?;
    let entity_id = value_str(&created, "id");
    write_audit_log(
        state.db_pool.as_ref(),
        Some(&payload.organization_id),
        Some(&user_id),
        "create",
        "channels",
        Some(&entity_id),
        None,
        Some(created.clone()),
    )
    .await;
    Ok((axum::http::StatusCode::CREATED, Json(created)))
}

async fn get_channel(
    State(state): State<AppState>,
    Path(path): Path<ChannelPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;
    let row = get_row(pool, "channels", &path.channel_id, "id").await?;
    let org_id = value_str(&row, "organization_id");
    assert_org_member(&state, &user_id, &org_id).await?;
    Ok(Json(row))
}

async fn update_channel(
    State(state): State<AppState>,
    Path(path): Path<ChannelPath>,
    headers: HeaderMap,
    Json(payload): Json<UpdateChannelInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;
    let record = get_row(pool, "channels", &path.channel_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_role(&state, &user_id, &org_id, &["owner_admin"]).await?;
    let patch = remove_nulls(serialize_to_map(&payload));
    let updated = update_row(pool, "channels", &path.channel_id, &patch, "id").await?;
    write_audit_log(
        state.db_pool.as_ref(),
        Some(&org_id),
        Some(&user_id),
        "update",
        "channels",
        Some(&path.channel_id),
        Some(record),
        Some(updated.clone()),
    )
    .await;
    Ok(Json(updated))
}

async fn delete_channel(
    State(state): State<AppState>,
    Path(path): Path<ChannelPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;
    let record = get_row(pool, "channels", &path.channel_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_role(&state, &user_id, &org_id, &["owner_admin"]).await?;
    let deleted = delete_row(pool, "channels", &path.channel_id, "id").await?;
    write_audit_log(
        state.db_pool.as_ref(),
        Some(&org_id),
        Some(&user_id),
        "delete",
        "channels",
        Some(&path.channel_id),
        Some(deleted.clone()),
        None,
    )
    .await;
    Ok(Json(deleted))
}

async fn list_listings(
    State(state): State<AppState>,
    Query(query): Query<ListingsQuery>,
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
    if let Some(unit_id) = query
        .unit_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        filters.insert("unit_id".to_string(), Value::String(unit_id.to_string()));
    }
    if let Some(channel_id) = query
        .channel_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        filters.insert(
            "channel_id".to_string(),
            Value::String(channel_id.to_string()),
        );
    }

    let rows = list_rows(
        pool,
        "listings",
        Some(&filters),
        clamp_limit(query.limit),
        0,
        "created_at",
        false,
    )
    .await?;
    let enriched = enrich_listings(pool, rows, &query.org_id).await?;
    Ok(Json(json!({ "data": enriched })))
}

async fn create_listing(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateListingInput>,
) -> AppResult<impl IntoResponse> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_role(&state, &user_id, &payload.organization_id, &["owner_admin"]).await?;
    let pool = db_pool(&state)?;
    let record = remove_nulls(serialize_to_map(&payload));
    let created = create_row(pool, "listings", &record).await?;
    let entity_id = value_str(&created, "id");
    write_audit_log(
        state.db_pool.as_ref(),
        Some(&payload.organization_id),
        Some(&user_id),
        "create",
        "listings",
        Some(&entity_id),
        None,
        Some(created.clone()),
    )
    .await;
    Ok((axum::http::StatusCode::CREATED, Json(created)))
}

async fn get_listing(
    State(state): State<AppState>,
    Path(path): Path<ListingPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;
    let record = get_row(pool, "listings", &path.listing_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_member(&state, &user_id, &org_id).await?;
    let mut enriched = enrich_listings(pool, vec![record], &org_id).await?;
    let first = enriched.pop().unwrap_or_else(|| Value::Object(Map::new()));
    Ok(Json(first))
}

async fn update_listing(
    State(state): State<AppState>,
    Path(path): Path<ListingPath>,
    headers: HeaderMap,
    Json(payload): Json<UpdateListingInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;
    let record = get_row(pool, "listings", &path.listing_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_role(&state, &user_id, &org_id, &["owner_admin"]).await?;
    let patch = remove_nulls(serialize_to_map(&payload));
    let updated = update_row(pool, "listings", &path.listing_id, &patch, "id").await?;
    write_audit_log(
        state.db_pool.as_ref(),
        Some(&org_id),
        Some(&user_id),
        "update",
        "listings",
        Some(&path.listing_id),
        Some(record),
        Some(updated.clone()),
    )
    .await;
    let mut enriched = enrich_listings(pool, vec![updated], &org_id).await?;
    let first = enriched.pop().unwrap_or_else(|| Value::Object(Map::new()));
    Ok(Json(first))
}

async fn delete_listing(
    State(state): State<AppState>,
    Path(path): Path<ListingPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;
    let record = get_row(pool, "listings", &path.listing_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_role(&state, &user_id, &org_id, &["owner_admin"]).await?;
    let deleted = delete_row(pool, "listings", &path.listing_id, "id").await?;
    write_audit_log(
        state.db_pool.as_ref(),
        Some(&org_id),
        Some(&user_id),
        "delete",
        "listings",
        Some(&path.listing_id),
        Some(deleted.clone()),
        None,
    )
    .await;
    Ok(Json(deleted))
}

async fn sync_listing_ical(
    State(state): State<AppState>,
    Path(path): Path<ListingPath>,
    headers: HeaderMap,
) -> AppResult<impl IntoResponse> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;
    let record = get_row(pool, "listings", &path.listing_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_role(&state, &user_id, &org_id, &["owner_admin", "operator"]).await?;

    // Record the request as an integration event.
    let integration_event = create_row(
        pool,
        "integration_events",
        &serde_json::from_value::<Map<String, Value>>(json!({
            "organization_id": org_id,
            "provider": "ical",
            "event_type": "listing_sync_requested",
            "payload": json!({"listing_id": path.listing_id, "requested_by_user_id": user_id}).to_string(),
            "status": "received",
        }))
        .unwrap_or_default(),
    )
    .await?;

    let event_id = value_str(&integration_event, "id");
    write_audit_log(
        state.db_pool.as_ref(),
        Some(&org_id),
        Some(&user_id),
        "create",
        "integration_events",
        Some(&event_id),
        None,
        Some(integration_event.clone()),
    )
    .await;

    let now_iso = chrono::Utc::now().to_rfc3339();

    match sync_listing_ical_reservations(pool, &state.http_client, &record, &user_id).await {
        Ok(result) => {
            // Update integration event to processed (fire-and-forget).
            let processed_at = result
                .get("processed_at")
                .and_then(Value::as_str)
                .unwrap_or(&now_iso)
                .to_string();

            let mut ie_payload: Map<String, Value> =
                serde_json::from_value(integration_event.get("payload").cloned().unwrap_or(json!({})))
                    .unwrap_or_default();
            if let Some(result_obj) = result.as_object() {
                for (k, v) in result_obj {
                    ie_payload.insert(k.clone(), v.clone());
                }
            }

            let mut error_message = Value::Null;
            if let Some(errs) = result.get("errors").and_then(Value::as_array) {
                if !errs.is_empty() {
                    error_message =
                        Value::String(format!("Completed with {} error(s).", errs.len()));
                }
            }

            let _ = update_row(
                pool,
                "integration_events",
                &event_id,
                &serde_json::from_value::<Map<String, Value>>(json!({
                    "status": "processed",
                    "processed_at": processed_at,
                    "payload": Value::Object(ie_payload).to_string(),
                    "error_message": error_message,
                }))
                .unwrap_or_default(),
                "id",
            )
            .await;

            write_audit_log(
                state.db_pool.as_ref(),
                Some(&org_id),
                Some(&user_id),
                "sync",
                "listings",
                Some(&path.listing_id),
                None,
                Some(json!({"provider": "ical"}).as_object().map(|o| {
                    let mut merged = o.clone();
                    if let Some(ro) = result.as_object() {
                        for (k, v) in ro {
                            merged.insert(k.clone(), v.clone());
                        }
                    }
                    Value::Object(merged)
                }).unwrap_or(result.clone())),
            )
            .await;

            let mut response = json!({
                "status": "processed",
                "listing_id": path.listing_id,
                "integration_event_id": event_id,
            });
            if let Some(result_obj) = result.as_object() {
                for (k, v) in result_obj {
                    response[k] = v.clone();
                }
            }

            Ok((StatusCode::ACCEPTED, Json(response)))
        }
        Err(e) => {
            // Update integration event to failed (fire-and-forget).
            let _ = update_row(
                pool,
                "integration_events",
                &event_id,
                &serde_json::from_value::<Map<String, Value>>(json!({
                    "status": "failed",
                    "processed_at": now_iso,
                    "error_message": e.detail_message(),
                }))
                .unwrap_or_default(),
                "id",
            )
            .await;
            Err(e)
        }
    }
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
