use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use chrono::{DateTime, Duration, FixedOffset, Utc};
use serde_json::{json, Map, Value};

use crate::{
    auth::require_user_id,
    error::{AppError, AppResult},
    repository::table_service::{create_row, get_row, list_rows, update_row},
    schemas::{
        clamp_limit_in_range, ApplicationPath, ApplicationStatusInput, ApplicationsOverviewQuery,
        ApplicationsQuery, ConvertApplicationToLeaseInput,
    },
    services::{
        analytics::write_analytics_event,
        audit::write_audit_log,
        lease_schedule::ensure_monthly_lease_schedule,
        notification_center::{emit_event, EmitNotificationEventInput},
        pricing::lease_financials_from_lines,
        workflows::fire_trigger,
    },
    state::AppState,
    tenancy::{assert_org_member, assert_org_role},
};

const APPLICATION_EDIT_ROLES: &[&str] = &["owner_admin", "operator"];
const RESPONSE_SLA_MINUTES: i64 = 120;
const RESPONSE_SLA_WARNING_MINUTES: f64 = 30.0;
const QUALIFICATION_STRONG_THRESHOLD: i64 = 75;
const QUALIFICATION_MODERATE_THRESHOLD: i64 = 50;

#[derive(Clone, Default)]
struct ApplicationLinkContext {
    listing_id: Option<String>,
    listing_title: Option<String>,
    property_id: Option<String>,
    property_name: Option<String>,
    unit_id: Option<String>,
    unit_name: Option<String>,
}

#[derive(Clone, Default)]
struct RelatedLeaseInfo {
    id: String,
    updated_at: Option<String>,
}

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/applications", axum::routing::get(list_applications))
        .route(
            "/applications/overview",
            axum::routing::get(list_applications_overview),
        )
        .route(
            "/applications/{application_id}",
            axum::routing::get(get_application),
        )
        .route(
            "/applications/{application_id}/overview",
            axum::routing::get(get_application_overview),
        )
        .route(
            "/applications/{application_id}/status",
            axum::routing::post(update_application_status),
        )
        .route(
            "/applications/{application_id}/convert-to-lease",
            axum::routing::post(convert_application_to_lease),
        )
}

async fn list_applications(
    State(state): State<AppState>,
    Query(query): Query<ApplicationsQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    ensure_applications_pipeline_enabled(&state)?;

    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;
    let pool = db_pool(&state)?;

    let mut filters = Map::new();
    filters.insert(
        "organization_id".to_string(),
        Value::String(query.org_id.clone()),
    );
    if let Some(status) = non_empty_opt(query.status.as_deref()) {
        filters.insert("status".to_string(), Value::String(status));
    }
    if let Some(assigned_user_id) = non_empty_opt(query.assigned_user_id.as_deref()) {
        filters.insert(
            "assigned_user_id".to_string(),
            Value::String(assigned_user_id),
        );
    }
    if let Some(listing_id) = non_empty_opt(query.listing_id.as_deref()) {
        filters.insert("listing_id".to_string(), Value::String(listing_id));
    }

    let rows = list_rows(
        pool,
        "application_submissions",
        Some(&filters),
        clamp_limit_in_range(query.limit, 1, 1000),
        0,
        "created_at",
        false,
    )
    .await?;

    let enriched = enrich_applications(pool, rows).await?;
    Ok(Json(json!({ "data": enriched })))
}

async fn get_application(
    State(state): State<AppState>,
    Path(path): Path<ApplicationPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    ensure_applications_pipeline_enabled(&state)?;

    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let record = get_row(pool, "application_submissions", &path.application_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_member(&state, &user_id, &org_id).await?;

    let events = list_rows(
        pool,
        "application_events",
        Some(&json_map(&[(
            "application_id",
            Value::String(path.application_id.clone()),
        )])),
        300,
        0,
        "created_at",
        true,
    )
    .await?;

    let mut enriched = enrich_applications(pool, vec![record]).await?;
    let mut item = enriched.pop().unwrap_or_else(|| Value::Object(Map::new()));
    if let Some(obj) = item.as_object_mut() {
        obj.insert("events".to_string(), Value::Array(events));
    }
    Ok(Json(item))
}

async fn list_applications_overview(
    State(state): State<AppState>,
    Query(query): Query<ApplicationsOverviewQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    ensure_applications_pipeline_enabled(&state)?;

    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;
    let pool = db_pool(&state)?;

    let mut filters = Map::new();
    filters.insert(
        "organization_id".to_string(),
        Value::String(query.org_id.clone()),
    );
    if let Some(status) = non_empty_opt(query.status.as_deref()) {
        filters.insert("status".to_string(), Value::String(status));
    }
    if let Some(assigned_user_id) = non_empty_opt(query.assigned_user_id.as_deref()) {
        filters.insert(
            "assigned_user_id".to_string(),
            Value::String(assigned_user_id),
        );
    }
    if let Some(listing_id) = non_empty_opt(query.listing_id.as_deref()) {
        filters.insert("listing_id".to_string(), Value::String(listing_id));
    }
    if let Some(source) = non_empty_opt(query.source.as_deref()) {
        filters.insert("source".to_string(), Value::String(source));
    }

    let rows = list_rows(
        pool,
        "application_submissions",
        Some(&filters),
        1000,
        0,
        "created_at",
        false,
    )
    .await?;

    let enriched = enrich_applications(pool, rows).await?;
    let contexts = load_application_link_context(pool, &enriched).await?;
    let application_ids = enriched
        .iter()
        .map(|row| value_str(row, "id"))
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    let related_leases = load_related_lease_info(pool, &application_ids).await?;
    let last_touch_index =
        load_application_last_touch_index(pool, &enriched, &related_leases).await?;
    let failed_submissions = load_application_submit_failures(pool, &query.org_id, None).await?;

    let filtered_rows = enriched
        .into_iter()
        .filter(|row| application_matches_overview_filters(row, &query, &contexts))
        .collect::<Vec<_>>();
    let saved_views = build_saved_view_counts(&filtered_rows, &related_leases);

    let mut display_rows = filtered_rows
        .into_iter()
        .filter(|row| application_matches_view(row, query.view.as_deref(), &related_leases))
        .collect::<Vec<_>>();
    sort_application_overview_rows(
        &mut display_rows,
        query.sort.as_deref(),
        &last_touch_index,
        &related_leases,
    );

    let total = display_rows.len() as i64;
    let limit = clamp_limit_in_range(query.limit, 1, 100);
    let offset = query.offset.max(0);
    let paged_rows = display_rows
        .iter()
        .skip(offset as usize)
        .take(limit as usize)
        .map(|row| {
            build_overview_row_contract(
                row,
                contexts
                    .get(&value_str(row, "id"))
                    .cloned()
                    .unwrap_or_default(),
                last_touch_index
                    .get(&value_str(row, "id"))
                    .cloned()
                    .unwrap_or_else(|| value_str(row, "updated_at")),
            )
        })
        .collect::<Vec<_>>();

    Ok(Json(json!({
        "summary": build_applications_summary(&display_rows, &related_leases),
        "savedViews": saved_views,
        "rows": paged_rows,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "hasMore": offset + limit < total,
        },
        "facets": build_application_facets(&display_rows, &contexts),
        "intakeHealth": {
            "failedSubmissions": failed_submissions.len(),
            "stalledApplications": display_rows.iter().filter(|row| is_stalled_application(row)).count(),
        }
    })))
}

async fn get_application_overview(
    State(state): State<AppState>,
    Path(path): Path<ApplicationPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    ensure_applications_pipeline_enabled(&state)?;

    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let record = get_row(pool, "application_submissions", &path.application_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_member(&state, &user_id, &org_id).await?;

    let mut enriched = enrich_applications(pool, vec![record]).await?;
    let application = enriched.pop().unwrap_or_else(|| Value::Object(Map::new()));
    let contexts = load_application_link_context(pool, std::slice::from_ref(&application)).await?;
    let context = contexts
        .get(&path.application_id)
        .cloned()
        .unwrap_or_default();
    let related_leases =
        load_related_lease_info(pool, std::slice::from_ref(&path.application_id)).await?;
    let related_lease = related_leases.get(&path.application_id).cloned();

    let events = list_rows(
        pool,
        "application_events",
        Some(&json_map(&[(
            "application_id",
            Value::String(path.application_id.clone()),
        )])),
        300,
        0,
        "created_at",
        false,
    )
    .await?;
    let messages =
        load_application_messages(pool, &org_id, &path.application_id, &application).await?;
    let failed_submission_history =
        load_application_submit_failures(pool, &org_id, context.listing_id.as_deref()).await?;

    Ok(Json(json!({
        "application": build_application_detail_contract(&application, &context),
        "qualification": build_application_qualification(&application),
        "context": {
            "listingId": context.listing_id,
            "listingTitle": context.listing_title,
            "propertyId": context.property_id,
            "propertyName": context.property_name,
            "unitId": context.unit_id,
            "unitName": context.unit_name,
        },
        "timeline": build_application_timeline(&application, &events, &messages, related_lease.as_ref()),
        "messages": build_application_messages_contract(&messages),
        "conversion": {
            "canConvert": can_convert_to_lease(&application, related_lease.as_ref()),
            "relatedLeaseId": related_lease
                .as_ref()
                .map(|lease| lease.id.clone())
                .filter(|value| !value.is_empty()),
        },
        "failedSubmissionHistory": failed_submission_history,
    })))
}

async fn update_application_status(
    State(state): State<AppState>,
    Path(path): Path<ApplicationPath>,
    headers: HeaderMap,
    Json(payload): Json<ApplicationStatusInput>,
) -> AppResult<Json<Value>> {
    ensure_applications_pipeline_enabled(&state)?;

    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let record = get_row(pool, "application_submissions", &path.application_id, "id").await?;
    let org_id = value_str(&record, "organization_id");
    assert_org_role(&state, &user_id, &org_id, APPLICATION_EDIT_ROLES).await?;

    let current = value_str(&record, "status");
    let current_status = if current.is_empty() {
        "new".to_string()
    } else {
        current
    };
    let next = payload.status.trim().to_string();
    if next.is_empty() {
        return Err(AppError::BadRequest("status is required.".to_string()));
    }
    if !can_transition(&current_status, &next) {
        return Err(AppError::BadRequest(format!(
            "Invalid application status transition: {current_status} -> {next}."
        )));
    }

    let now_iso = Utc::now().to_rfc3339();
    let mut patch = Map::new();
    patch.insert("status".to_string(), Value::String(next.clone()));

    if payload.clear_assignee.unwrap_or(false) {
        patch.insert("assigned_user_id".to_string(), Value::Null);
    }
    if let Some(assigned_user_id) = payload.assigned_user_id.clone() {
        patch.insert(
            "assigned_user_id".to_string(),
            Value::String(assigned_user_id),
        );
    }
    if next != "new" && missing_or_blank(&record, "first_response_at") {
        patch.insert(
            "first_response_at".to_string(),
            Value::String(now_iso.clone()),
        );
    }
    if next == "qualified" && missing_or_blank(&record, "qualified_at") {
        patch.insert("qualified_at".to_string(), Value::String(now_iso.clone()));
    }
    if matches!(next.as_str(), "rejected" | "lost") {
        patch.insert(
            "rejected_reason".to_string(),
            payload
                .rejected_reason
                .clone()
                .map(Value::String)
                .unwrap_or(Value::Null),
        );
    }

    let updated = update_row(
        pool,
        "application_submissions",
        &path.application_id,
        &patch,
        "id",
    )
    .await?;

    let event = create_row(
        pool,
        "application_events",
        &json_map(&[
            ("organization_id", Value::String(org_id.clone())),
            ("application_id", Value::String(path.application_id.clone())),
            ("event_type", Value::String("status_changed".to_string())),
            (
                "event_payload",
                json!({
                    "from": current_status,
                    "to": next,
                    "assigned_user_id": payload.assigned_user_id,
                    "note": payload.note,
                    "rejected_reason": payload.rejected_reason,
                }),
            ),
            ("actor_user_id", Value::String(user_id.clone())),
        ]),
    )
    .await?;
    let event_id = value_str(&event, "id");

    write_audit_log(
        state.db_pool.as_ref(),
        Some(&org_id),
        Some(&user_id),
        "status_transition",
        "application_submissions",
        Some(&path.application_id),
        Some(record),
        Some(updated.clone()),
    )
    .await;

    if next == "qualified" {
        write_analytics_event(
            state.db_pool.as_ref(),
            Some(&org_id),
            "qualify",
            Some(json!({
                "application_id": path.application_id,
                "status": "qualified",
            })),
        )
        .await;
    }

    let mut event_payload = Map::new();
    event_payload.insert(
        "application_id".to_string(),
        Value::String(path.application_id.clone()),
    );
    event_payload.insert("from".to_string(), Value::String(current_status.clone()));
    event_payload.insert("to".to_string(), Value::String(next.clone()));
    if let Some(assigned_user_id) = payload
        .assigned_user_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        event_payload.insert(
            "assigned_user_id".to_string(),
            Value::String(assigned_user_id.to_string()),
        );
    }
    if !event_id.is_empty() {
        event_payload.insert(
            "application_event_id".to_string(),
            Value::String(event_id.clone()),
        );
    }

    let _ = emit_event(
        pool,
        EmitNotificationEventInput {
            organization_id: org_id.clone(),
            event_type: "application_status_changed".to_string(),
            category: "applications".to_string(),
            severity: "info".to_string(),
            title: "Aplicación actualizada".to_string(),
            body: format!("Estado cambiado: {current_status} → {next}"),
            link_path: Some("/module/applications".to_string()),
            source_table: Some("application_submissions".to_string()),
            source_id: Some(path.application_id.clone()),
            actor_user_id: Some(user_id.clone()),
            payload: event_payload,
            dedupe_key: Some(format!(
                "application_status_changed:{}:{}",
                path.application_id,
                if event_id.is_empty() {
                    Utc::now().timestamp().to_string()
                } else {
                    event_id.clone()
                }
            )),
            occurred_at: None,
            fallback_roles: vec![],
        },
    )
    .await;

    let mut enriched = enrich_applications(pool, vec![updated]).await?;
    let mut item = enriched.pop().unwrap_or_else(|| Value::Object(Map::new()));
    if let Some(obj) = item.as_object_mut() {
        obj.insert(
            "last_event_id".to_string(),
            event.get("id").cloned().unwrap_or(Value::Null),
        );
    }
    Ok(Json(item))
}

async fn convert_application_to_lease(
    State(state): State<AppState>,
    Path(path): Path<ApplicationPath>,
    headers: HeaderMap,
    Json(payload): Json<ConvertApplicationToLeaseInput>,
) -> AppResult<Json<Value>> {
    ensure_applications_pipeline_enabled(&state)?;
    ensure_lease_collections_enabled(&state)?;

    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let application = get_row(pool, "application_submissions", &path.application_id, "id").await?;
    let org_id = value_str(&application, "organization_id");
    assert_org_role(&state, &user_id, &org_id, APPLICATION_EDIT_ROLES).await?;

    let current_status = value_str(&application, "status");
    if matches!(current_status.as_str(), "rejected" | "lost") {
        return Err(AppError::BadRequest(
            "Cannot convert rejected/lost application to lease.".to_string(),
        ));
    }

    let mut listing: Option<Value> = None;
    if let Some(listing_id) = application
        .as_object()
        .and_then(|obj| obj.get("listing_id"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        listing = Some(get_row(pool, "listings", listing_id, "id").await?);
    }

    let mut defaults = crate::services::pricing::LeaseFinancials::default();
    if let Some(listing_row) = listing.as_ref() {
        let listing_id = value_str(listing_row, "id");
        if !listing_id.is_empty() {
            let lines = listing_fee_lines(pool, &listing_id).await?;
            if !lines.is_empty() {
                defaults = lease_financials_from_lines(&lines);
            }
        }
    }

    let use_explicit = [
        payload.monthly_rent,
        payload.service_fee_flat,
        payload.security_deposit,
        payload.guarantee_option_fee,
        payload.tax_iva,
    ]
    .iter()
    .any(|value| *value > 0.0);

    let monthly_rent = if use_explicit {
        payload.monthly_rent
    } else {
        defaults.monthly_rent
    };
    let service_fee_flat = if use_explicit {
        payload.service_fee_flat
    } else {
        defaults.service_fee_flat
    };
    let security_deposit = if use_explicit {
        payload.security_deposit
    } else {
        defaults.security_deposit
    };
    let guarantee_option_fee = if use_explicit {
        payload.guarantee_option_fee
    } else {
        defaults.guarantee_option_fee
    };
    let tax_iva = if use_explicit {
        payload.tax_iva
    } else {
        defaults.tax_iva
    };

    let (total_move_in, monthly_recurring_total) = if use_explicit {
        (
            round2(
                monthly_rent + service_fee_flat + security_deposit + guarantee_option_fee + tax_iva,
            ),
            round2(monthly_rent + tax_iva),
        )
    } else {
        (
            round2(defaults.total_move_in),
            round2(defaults.monthly_recurring_total),
        )
    };

    let listing_property_id = listing
        .as_ref()
        .and_then(|item| item.as_object())
        .and_then(|obj| obj.get("property_id"))
        .cloned()
        .unwrap_or(Value::Null);
    let listing_unit_id = listing
        .as_ref()
        .and_then(|item| item.as_object())
        .and_then(|obj| obj.get("unit_id"))
        .cloned()
        .unwrap_or(Value::Null);

    let lease_payload = json_map(&[
        ("organization_id", Value::String(org_id.clone())),
        ("application_id", Value::String(path.application_id.clone())),
        ("property_id", listing_property_id),
        ("unit_id", listing_unit_id),
        (
            "tenant_full_name",
            application_value(&application, "full_name").unwrap_or(Value::Null),
        ),
        (
            "tenant_email",
            application_value(&application, "email").unwrap_or(Value::Null),
        ),
        (
            "tenant_phone_e164",
            application_value(&application, "phone_e164").unwrap_or(Value::Null),
        ),
        ("lease_status", Value::String("active".to_string())),
        ("starts_on", Value::String(payload.starts_on.clone())),
        (
            "ends_on",
            payload
                .ends_on
                .clone()
                .map(Value::String)
                .unwrap_or(Value::Null),
        ),
        ("currency", Value::String(payload.currency.clone())),
        ("monthly_rent", json!(monthly_rent)),
        ("service_fee_flat", json!(service_fee_flat)),
        ("security_deposit", json!(security_deposit)),
        ("guarantee_option_fee", json!(guarantee_option_fee)),
        ("tax_iva", json!(tax_iva)),
        ("total_move_in", json!(total_move_in)),
        ("monthly_recurring_total", json!(monthly_recurring_total)),
        ("platform_fee", json!(payload.platform_fee)),
        (
            "notes",
            payload
                .notes
                .clone()
                .map(Value::String)
                .unwrap_or(Value::Null),
        ),
        ("created_by_user_id", Value::String(user_id.clone())),
    ]);

    let lease = create_row(pool, "leases", &lease_payload).await?;
    let lease_id = value_str(&lease, "id");

    let mut first_collection: Option<Value> = None;
    let mut schedule_due_dates: Vec<String> = Vec::new();
    let mut schedule_collections_created: usize = 0;
    if payload.generate_first_collection {
        let schedule = ensure_monthly_lease_schedule(
            pool,
            &org_id,
            &lease_id,
            &payload.starts_on,
            payload.first_collection_due_date.as_deref(),
            payload.ends_on.as_deref(),
            payload.collection_schedule_months,
            monthly_recurring_total,
            &payload.currency,
            Some(&user_id),
        )
        .await?;
        first_collection = schedule.first_collection.clone();
        schedule_due_dates = schedule.due_dates.clone();
        schedule_collections_created = schedule.collections.len();
    }

    // Create security deposit collection record if deposit > 0
    if security_deposit > 0.0 {
        let deposit_record = json_map(&[
            ("organization_id", Value::String(org_id.clone())),
            ("lease_id", Value::String(lease_id.clone())),
            (
                "property_id",
                lease.get("property_id").cloned().unwrap_or(Value::Null),
            ),
            (
                "unit_id",
                lease.get("unit_id").cloned().unwrap_or(Value::Null),
            ),
            ("charge_type", Value::String("security_deposit".to_string())),
            ("amount", json!(security_deposit)),
            ("currency", Value::String(payload.currency.clone())),
            ("due_date", Value::String(payload.starts_on.clone())),
            ("status", Value::String("pending".to_string())),
        ]);
        let _ = create_row(pool, "collection_records", &deposit_record).await;
    }

    // Create move-in preparation task
    {
        let tenant_name = application_value(&application, "full_name")
            .and_then(|v| v.as_str().map(str::to_string))
            .unwrap_or_else(|| "Tenant".to_string());
        let task_record = json_map(&[
            ("organization_id", Value::String(org_id.clone())),
            (
                "property_id",
                lease.get("property_id").cloned().unwrap_or(Value::Null),
            ),
            (
                "unit_id",
                lease.get("unit_id").cloned().unwrap_or(Value::Null),
            ),
            ("type", Value::String("check_in".to_string())),
            (
                "title",
                Value::String(format!("Move-in preparation: {tenant_name}")),
            ),
            ("status", Value::String("todo".to_string())),
            ("priority", Value::String("high".to_string())),
            ("due_date", Value::String(payload.starts_on.clone())),
        ]);
        let _ = create_row(pool, "tasks", &task_record).await;
    }

    // Fire lease_created and lease_activated workflow triggers
    {
        let mut wf_ctx = Map::new();
        wf_ctx.insert("lease_id".to_string(), Value::String(lease_id.clone()));
        wf_ctx.insert(
            "application_id".to_string(),
            Value::String(path.application_id.clone()),
        );
        if let Some(pid) = lease.get("property_id") {
            if !pid.is_null() {
                wf_ctx.insert("property_id".to_string(), pid.clone());
            }
        }
        if let Some(uid) = lease.get("unit_id") {
            if !uid.is_null() {
                wf_ctx.insert("unit_id".to_string(), uid.clone());
            }
        }
        let engine_mode = state.config.workflow_engine_mode;
        fire_trigger(pool, &org_id, "lease_created", &wf_ctx, engine_mode).await;
        fire_trigger(pool, &org_id, "lease_activated", &wf_ctx, engine_mode).await;
    }

    let now_iso = Utc::now().to_rfc3339();
    let mut application_patch = Map::new();
    application_patch.insert(
        "status".to_string(),
        Value::String("contract_signed".to_string()),
    );
    application_patch.insert(
        "qualified_at".to_string(),
        existing_or_now(&application, "qualified_at", &now_iso),
    );
    application_patch.insert(
        "first_response_at".to_string(),
        existing_or_now(&application, "first_response_at", &now_iso),
    );
    let updated_application = update_row(
        pool,
        "application_submissions",
        &path.application_id,
        &application_patch,
        "id",
    )
    .await?;

    let collection_id = first_collection
        .as_ref()
        .and_then(|item| item.as_object())
        .and_then(|obj| obj.get("id"))
        .cloned()
        .unwrap_or(Value::Null);

    let _ = create_row(
        pool,
        "application_events",
        &json_map(&[
            ("organization_id", Value::String(org_id.clone())),
            ("application_id", Value::String(path.application_id.clone())),
            ("event_type", Value::String("lease_sign".to_string())),
            (
                "event_payload",
                json!({
                    "lease_id": lease.get("id").cloned().unwrap_or(Value::Null),
                    "collection_id": collection_id,
                    "schedule_due_dates": schedule_due_dates,
                }),
            ),
            ("actor_user_id", Value::String(user_id.clone())),
        ]),
    )
    .await?;

    write_audit_log(
        state.db_pool.as_ref(),
        Some(&org_id),
        Some(&user_id),
        "convert_to_lease",
        "application_submissions",
        Some(&path.application_id),
        Some(application),
        Some(updated_application.clone()),
    )
    .await;

    write_analytics_event(
        state.db_pool.as_ref(),
        Some(&org_id),
        "lease_sign",
        Some(json!({
            "application_id": path.application_id,
            "lease_id": lease.get("id").cloned().unwrap_or(Value::Null),
            "collection_id": first_collection
                .as_ref()
                .and_then(|item| item.as_object())
                .and_then(|obj| obj.get("id"))
                .cloned()
                .unwrap_or(Value::Null),
            "schedule_collections_created": schedule_collections_created,
        })),
    )
    .await;

    let mut enriched = enrich_applications(pool, vec![updated_application]).await?;
    Ok(Json(json!({
        "application": enriched.pop().unwrap_or_else(|| Value::Object(Map::new())),
        "lease": lease,
        "first_collection": first_collection,
        "schedule_due_dates": schedule_due_dates,
        "schedule_collections_created": schedule_collections_created,
    })))
}

async fn listing_fee_lines(pool: &sqlx::PgPool, listing_id: &str) -> AppResult<Vec<Value>> {
    list_rows(
        pool,
        "listing_fee_lines",
        Some(&json_map(&[(
            "listing_id",
            Value::String(listing_id.to_string()),
        )])),
        300,
        0,
        "sort_order",
        true,
    )
    .await
}

async fn enrich_applications(pool: &sqlx::PgPool, rows: Vec<Value>) -> AppResult<Vec<Value>> {
    if rows.is_empty() {
        return Ok(rows);
    }

    let listing_ids = rows
        .iter()
        .filter_map(Value::as_object)
        .filter_map(|row| row.get("listing_id"))
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();

    let assigned_user_ids = rows
        .iter()
        .filter_map(Value::as_object)
        .filter_map(|row| row.get("assigned_user_id"))
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();

    let listing_ids_for_query = listing_ids.clone();
    let assigned_user_ids_for_query = assigned_user_ids.clone();
    let (listings, users) = tokio::try_join!(
        async move {
            if listing_ids_for_query.is_empty() {
                Ok(Vec::new())
            } else {
                list_rows(
                    pool,
                    "listings",
                    Some(&json_map(&[(
                        "id",
                        Value::Array(
                            listing_ids_for_query
                                .iter()
                                .cloned()
                                .map(Value::String)
                                .collect(),
                        ),
                    )])),
                    std::cmp::max(200, listing_ids_for_query.len() as i64),
                    0,
                    "created_at",
                    false,
                )
                .await
            }
        },
        async move {
            if assigned_user_ids_for_query.is_empty() {
                Ok(Vec::new())
            } else {
                list_rows(
                    pool,
                    "app_users",
                    Some(&json_map(&[(
                        "id",
                        Value::Array(
                            assigned_user_ids_for_query
                                .iter()
                                .cloned()
                                .map(Value::String)
                                .collect(),
                        ),
                    )])),
                    std::cmp::max(200, assigned_user_ids_for_query.len() as i64),
                    0,
                    "created_at",
                    false,
                )
                .await
            }
        }
    )?;

    let mut listing_context: std::collections::HashMap<String, (Option<String>, f64)> =
        std::collections::HashMap::new();
    for listing in listings {
        let listing_id = value_str(&listing, "id");
        if listing_id.is_empty() {
            continue;
        }
        let title = listing
            .as_object()
            .and_then(|obj| obj.get("title"))
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned);
        let monthly_recurring_total = number_from_value(
            listing
                .as_object()
                .and_then(|obj| obj.get("monthly_recurring_total")),
        )
        .max(0.0);
        listing_context.insert(listing_id, (title, monthly_recurring_total));
    }

    let mut assigned_user_name: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for user in users {
        let user_id = value_str(&user, "id");
        if user_id.is_empty() {
            continue;
        }
        let preferred_name = user
            .as_object()
            .and_then(|obj| obj.get("full_name"))
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
            .or_else(|| {
                user.as_object()
                    .and_then(|obj| obj.get("email"))
                    .and_then(Value::as_str)
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(ToOwned::to_owned)
            })
            .unwrap_or_else(|| user_id.clone());
        assigned_user_name.insert(user_id, preferred_name);
    }

    let now = Utc::now().fixed_offset();
    let mut enriched = Vec::with_capacity(rows.len());
    for mut row in rows {
        if let Some(obj) = row.as_object_mut() {
            let listing_id = obj
                .get("listing_id")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty());
            let listing_info = listing_id.and_then(|value| listing_context.get(value));
            let listing_title = listing_info
                .and_then(|(title, _)| title.clone())
                .map(Value::String)
                .unwrap_or(Value::Null);
            obj.insert("listing_title".to_string(), listing_title);

            let monthly_total = listing_info.map(|(_, monthly)| *monthly).unwrap_or(0.0);
            let (score, band, income_ratio) = qualification_from_row(obj, monthly_total);
            obj.insert("qualification_score".to_string(), json!(score));
            obj.insert("qualification_band".to_string(), Value::String(band));
            obj.insert(
                "income_to_rent_ratio".to_string(),
                income_ratio
                    .map(|value| json!(value))
                    .unwrap_or(Value::Null),
            );

            if let Some(assigned_user_id) = obj
                .get("assigned_user_id")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
            {
                obj.insert(
                    "assigned_user_name".to_string(),
                    assigned_user_name
                        .get(assigned_user_id)
                        .cloned()
                        .map(Value::String)
                        .unwrap_or(Value::Null),
                );
            }

            let created_at = parse_iso_datetime(obj.get("created_at"));
            let Some(created_at) = created_at else {
                enriched.push(row);
                continue;
            };

            let sla_due_at = created_at + Duration::minutes(RESPONSE_SLA_MINUTES);
            obj.insert(
                "response_sla_due_at".to_string(),
                Value::String(sla_due_at.to_rfc3339()),
            );

            if let Some(first_response_at) = parse_iso_datetime(obj.get("first_response_at")) {
                let elapsed_seconds =
                    (first_response_at - created_at).num_milliseconds() as f64 / 1000.0;
                let elapsed_minutes = round2((elapsed_seconds.max(0.0)) / 60.0);
                obj.insert("first_response_minutes".to_string(), json!(elapsed_minutes));
                if first_response_at <= sla_due_at {
                    obj.insert(
                        "response_sla_status".to_string(),
                        Value::String("met".to_string()),
                    );
                    obj.insert(
                        "response_sla_alert_level".to_string(),
                        Value::String("none".to_string()),
                    );
                } else {
                    obj.insert(
                        "response_sla_status".to_string(),
                        Value::String("breached".to_string()),
                    );
                    obj.insert(
                        "response_sla_breached_at".to_string(),
                        Value::String(sla_due_at.to_rfc3339()),
                    );
                    obj.insert(
                        "response_sla_alert_level".to_string(),
                        Value::String("critical".to_string()),
                    );
                }
                enriched.push(row);
                continue;
            }

            let remaining = (sla_due_at - now).num_milliseconds() as f64 / 60000.0;
            if remaining <= 0.0 {
                obj.insert(
                    "response_sla_status".to_string(),
                    Value::String("breached".to_string()),
                );
                obj.insert(
                    "response_sla_breached_at".to_string(),
                    Value::String(sla_due_at.to_rfc3339()),
                );
                obj.insert("response_sla_remaining_minutes".to_string(), json!(0));
                obj.insert(
                    "response_sla_alert_level".to_string(),
                    Value::String("critical".to_string()),
                );
            } else if remaining <= RESPONSE_SLA_WARNING_MINUTES {
                obj.insert(
                    "response_sla_status".to_string(),
                    Value::String("pending".to_string()),
                );
                obj.insert(
                    "response_sla_remaining_minutes".to_string(),
                    json!(round2(remaining)),
                );
                obj.insert(
                    "response_sla_alert_level".to_string(),
                    Value::String("warning".to_string()),
                );
            } else {
                obj.insert(
                    "response_sla_status".to_string(),
                    Value::String("pending".to_string()),
                );
                obj.insert(
                    "response_sla_remaining_minutes".to_string(),
                    json!(round2(remaining)),
                );
                obj.insert(
                    "response_sla_alert_level".to_string(),
                    Value::String("normal".to_string()),
                );
            }
        }
        enriched.push(row);
    }

    Ok(enriched)
}

async fn load_application_link_context(
    pool: &sqlx::PgPool,
    rows: &[Value],
) -> AppResult<std::collections::HashMap<String, ApplicationLinkContext>> {
    let listing_ids = rows
        .iter()
        .filter_map(Value::as_object)
        .filter_map(|row| row.get("listing_id"))
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();

    if listing_ids.is_empty() {
        return Ok(std::collections::HashMap::new());
    }

    let listings = list_rows(
        pool,
        "listings",
        Some(&json_map(&[(
            "id",
            Value::Array(listing_ids.iter().cloned().map(Value::String).collect()),
        )])),
        std::cmp::max(200, listing_ids.len() as i64),
        0,
        "created_at",
        false,
    )
    .await?;

    let property_ids = listings
        .iter()
        .filter_map(Value::as_object)
        .filter_map(|row| row.get("property_id"))
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let unit_ids = listings
        .iter()
        .filter_map(Value::as_object)
        .filter_map(|row| row.get("unit_id"))
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();

    let property_ids_for_query = property_ids.clone();
    let unit_ids_for_query = unit_ids.clone();
    let (properties, units) = tokio::try_join!(
        async move {
            if property_ids_for_query.is_empty() {
                Ok(Vec::new())
            } else {
                list_rows(
                    pool,
                    "properties",
                    Some(&json_map(&[(
                        "id",
                        Value::Array(
                            property_ids_for_query
                                .iter()
                                .cloned()
                                .map(Value::String)
                                .collect(),
                        ),
                    )])),
                    std::cmp::max(200, property_ids_for_query.len() as i64),
                    0,
                    "created_at",
                    false,
                )
                .await
            }
        },
        async move {
            if unit_ids_for_query.is_empty() {
                Ok(Vec::new())
            } else {
                list_rows(
                    pool,
                    "units",
                    Some(&json_map(&[(
                        "id",
                        Value::Array(
                            unit_ids_for_query
                                .iter()
                                .cloned()
                                .map(Value::String)
                                .collect(),
                        ),
                    )])),
                    std::cmp::max(200, unit_ids_for_query.len() as i64),
                    0,
                    "created_at",
                    false,
                )
                .await
            }
        }
    )?;

    let property_names = properties
        .into_iter()
        .map(|row| (value_str(&row, "id"), value_str(&row, "name")))
        .filter(|(id, name)| !id.is_empty() && !name.is_empty())
        .collect::<std::collections::HashMap<_, _>>();
    let unit_names = units
        .into_iter()
        .map(|row| {
            let name = value_str(&row, "name");
            let code = value_str(&row, "code");
            (
                value_str(&row, "id"),
                if !name.is_empty() { name } else { code },
            )
        })
        .filter(|(id, name)| !id.is_empty() && !name.is_empty())
        .collect::<std::collections::HashMap<_, _>>();

    let listing_context = listings
        .into_iter()
        .map(|row| {
            let listing_id = value_str(&row, "id");
            let property_id = non_empty_opt(
                row.as_object()
                    .and_then(|obj| obj.get("property_id"))
                    .and_then(Value::as_str),
            );
            let unit_id = non_empty_opt(
                row.as_object()
                    .and_then(|obj| obj.get("unit_id"))
                    .and_then(Value::as_str),
            );
            (
                listing_id,
                ApplicationLinkContext {
                    listing_id: non_empty_opt(
                        row.as_object()
                            .and_then(|obj| obj.get("id"))
                            .and_then(Value::as_str),
                    ),
                    listing_title: non_empty_opt(
                        row.as_object()
                            .and_then(|obj| obj.get("title"))
                            .and_then(Value::as_str),
                    ),
                    property_id: property_id.clone(),
                    property_name: property_id
                        .as_ref()
                        .and_then(|id| property_names.get(id))
                        .cloned(),
                    unit_id: unit_id.clone(),
                    unit_name: unit_id.as_ref().and_then(|id| unit_names.get(id)).cloned(),
                },
            )
        })
        .filter(|(id, _)| !id.is_empty())
        .collect::<std::collections::HashMap<_, _>>();

    let mut context_by_application_id = std::collections::HashMap::new();
    for row in rows {
        let application_id = value_str(row, "id");
        let listing_id = value_str(row, "listing_id");
        if application_id.is_empty() {
            continue;
        }
        if let Some(context) = listing_context.get(&listing_id) {
            context_by_application_id.insert(application_id, context.clone());
        } else {
            context_by_application_id.insert(
                application_id,
                ApplicationLinkContext {
                    listing_id: (!listing_id.is_empty()).then_some(listing_id),
                    listing_title: non_empty_opt(
                        row.as_object()
                            .and_then(|obj| obj.get("listing_title"))
                            .and_then(Value::as_str),
                    ),
                    ..ApplicationLinkContext::default()
                },
            );
        }
    }

    Ok(context_by_application_id)
}

async fn load_related_lease_info(
    pool: &sqlx::PgPool,
    application_ids: &[String],
) -> AppResult<std::collections::HashMap<String, RelatedLeaseInfo>> {
    if application_ids.is_empty() {
        return Ok(std::collections::HashMap::new());
    }

    let rows = list_rows(
        pool,
        "leases",
        Some(&json_map(&[(
            "application_id",
            Value::Array(application_ids.iter().cloned().map(Value::String).collect()),
        )])),
        std::cmp::max(200, application_ids.len() as i64),
        0,
        "updated_at",
        false,
    )
    .await?;

    let mut index = std::collections::HashMap::new();
    for row in rows {
        let application_id = value_str(&row, "application_id");
        let lease_id = value_str(&row, "id");
        if application_id.is_empty() || lease_id.is_empty() || index.contains_key(&application_id) {
            continue;
        }
        index.insert(
            application_id,
            RelatedLeaseInfo {
                id: lease_id,
                updated_at: non_empty_opt(
                    row.as_object()
                        .and_then(|obj| obj.get("updated_at"))
                        .and_then(Value::as_str),
                ),
            },
        );
    }

    Ok(index)
}

async fn load_application_last_touch_index(
    pool: &sqlx::PgPool,
    rows: &[Value],
    related_leases: &std::collections::HashMap<String, RelatedLeaseInfo>,
) -> AppResult<std::collections::HashMap<String, String>> {
    let application_ids = rows
        .iter()
        .map(|row| value_str(row, "id"))
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    if application_ids.is_empty() {
        return Ok(std::collections::HashMap::new());
    }

    let event_application_ids = application_ids.clone();
    let message_application_ids = application_ids.clone();
    let (events, messages) = tokio::try_join!(
        async move {
            list_rows(
                pool,
                "application_events",
                Some(&json_map(&[(
                    "application_id",
                    Value::Array(
                        event_application_ids
                            .iter()
                            .cloned()
                            .map(Value::String)
                            .collect(),
                    ),
                )])),
                1000,
                0,
                "created_at",
                false,
            )
            .await
        },
        async move {
            list_rows(
                pool,
                "message_logs",
                Some(&json_map(&[(
                    "application_id",
                    Value::Array(
                        message_application_ids
                            .iter()
                            .cloned()
                            .map(Value::String)
                            .collect(),
                    ),
                )])),
                1000,
                0,
                "created_at",
                false,
            )
            .await
        }
    )?;

    let mut index = std::collections::HashMap::new();
    for row in rows {
        let application_id = value_str(row, "id");
        if application_id.is_empty() {
            continue;
        }
        let mut latest = non_empty_opt(
            row.as_object()
                .and_then(|obj| obj.get("updated_at"))
                .and_then(Value::as_str),
        )
        .or_else(|| {
            row.as_object()
                .and_then(|obj| obj.get("created_at"))
                .and_then(Value::as_str)
                .map(ToOwned::to_owned)
        });
        latest = max_timestamp(
            latest,
            non_empty_opt(
                row.as_object()
                    .and_then(|obj| obj.get("first_response_at"))
                    .and_then(Value::as_str),
            ),
        );
        if let Some(lease) = related_leases.get(&application_id) {
            latest = max_timestamp(latest, lease.updated_at.clone());
        }
        for event in &events {
            if value_str(event, "application_id") == application_id {
                latest = max_timestamp(
                    latest,
                    non_empty_opt(
                        event
                            .as_object()
                            .and_then(|obj| obj.get("created_at"))
                            .and_then(Value::as_str),
                    ),
                );
                break;
            }
        }
        for message in &messages {
            if value_str(message, "application_id") == application_id {
                latest = max_timestamp(
                    latest,
                    non_empty_opt(
                        message
                            .as_object()
                            .and_then(|obj| obj.get("created_at"))
                            .and_then(Value::as_str),
                    ),
                );
                break;
            }
        }
        if let Some(latest) = latest {
            index.insert(application_id, latest);
        }
    }

    Ok(index)
}

async fn load_application_messages(
    pool: &sqlx::PgPool,
    org_id: &str,
    application_id: &str,
    application: &Value,
) -> AppResult<Vec<Value>> {
    let mut messages = list_rows(
        pool,
        "message_logs",
        Some(&json_map(&[
            ("organization_id", Value::String(org_id.to_string())),
            ("application_id", Value::String(application_id.to_string())),
        ])),
        200,
        0,
        "created_at",
        false,
    )
    .await?;

    let email = value_str(application, "email");
    let phone = value_str(application, "phone_e164");
    for recipient in [email, phone] {
        if recipient.is_empty() {
            continue;
        }
        let historical = list_rows(
            pool,
            "message_logs",
            Some(&json_map(&[
                ("organization_id", Value::String(org_id.to_string())),
                ("recipient", Value::String(recipient.clone())),
            ])),
            120,
            0,
            "created_at",
            false,
        )
        .await?;
        messages.extend(historical);
    }

    let mut deduped = std::collections::HashMap::new();
    for message in messages {
        let id = value_str(&message, "id");
        if id.is_empty() {
            continue;
        }
        deduped.entry(id).or_insert(message);
    }

    let mut values = deduped.into_values().collect::<Vec<_>>();
    values
        .sort_by(|left, right| value_str(right, "created_at").cmp(&value_str(left, "created_at")));
    Ok(values)
}

async fn load_application_submit_failures(
    pool: &sqlx::PgPool,
    org_id: &str,
    listing_id: Option<&str>,
) -> AppResult<Vec<Value>> {
    let rows = list_rows(
        pool,
        "integration_events",
        Some(&json_map(&[
            ("organization_id", Value::String(org_id.to_string())),
            ("provider", Value::String("alerting".to_string())),
            (
                "event_type",
                Value::String("application_submit_failed".to_string()),
            ),
            ("status", Value::String("failed".to_string())),
        ])),
        100,
        0,
        "created_at",
        false,
    )
    .await?;

    Ok(rows
        .into_iter()
        .filter(|row| {
            if let Some(listing_id) = listing_id {
                let payload_listing_id = row
                    .as_object()
                    .and_then(|obj| obj.get("payload"))
                    .and_then(Value::as_object)
                    .and_then(|payload| payload.get("listing_id"))
                    .and_then(Value::as_str)
                    .map(str::trim)
                    .unwrap_or_default();
                return payload_listing_id == listing_id;
            }
            true
        })
        .collect())
}

fn application_matches_overview_filters(
    row: &Value,
    query: &ApplicationsOverviewQuery,
    contexts: &std::collections::HashMap<String, ApplicationLinkContext>,
) -> bool {
    let application_id = value_str(row, "id");
    let context = contexts.get(&application_id).cloned().unwrap_or_default();

    if let Some(property_id) = non_empty_opt(query.property_id.as_deref()) {
        if context.property_id.as_deref().unwrap_or_default() != property_id {
            return false;
        }
    }

    if let Some(qualification_band) = non_empty_opt(query.qualification_band.as_deref()) {
        if value_str(row, "qualification_band") != qualification_band {
            return false;
        }
    }

    if let Some(response_sla_status) = non_empty_opt(query.response_sla_status.as_deref()) {
        if value_str(row, "response_sla_status") != response_sla_status {
            return false;
        }
    }

    if let Some(assigned_user_id) = non_empty_opt(query.assigned_user_id.as_deref()) {
        let row_assignee = value_str(row, "assigned_user_id");
        if assigned_user_id == "__unassigned__" || assigned_user_id == "unassigned" {
            if !row_assignee.is_empty() {
                return false;
            }
        } else if row_assignee != assigned_user_id {
            return false;
        }
    }

    if let Some(q) = non_empty_opt(query.q.as_deref()) {
        let q = q.to_ascii_lowercase();
        let haystack = [
            value_str(row, "full_name"),
            value_str(row, "email"),
            value_str(row, "phone_e164"),
            context.listing_title.unwrap_or_default(),
            context.property_name.unwrap_or_default(),
            context.unit_name.unwrap_or_default(),
        ]
        .join(" ")
        .to_ascii_lowercase();
        if !haystack.contains(&q) {
            return false;
        }
    }

    true
}

fn application_matches_view(
    row: &Value,
    view: Option<&str>,
    related_leases: &std::collections::HashMap<String, RelatedLeaseInfo>,
) -> bool {
    match view.map(str::trim).filter(|value| !value.is_empty()) {
        None | Some("all") => true,
        Some("needs_response") => {
            let status = value_str(row, "response_sla_status");
            status == "pending" || status == "breached"
        }
        Some("unassigned") => value_str(row, "assigned_user_id").is_empty(),
        Some("qualified_ready") => {
            can_convert_to_lease(row, related_leases.get(&value_str(row, "id")))
        }
        Some("stalled_or_failed") => {
            is_stalled_application(row)
                || matches!(value_str(row, "status").as_str(), "rejected" | "lost")
        }
        Some(_) => true,
    }
}

fn build_saved_view_counts(
    rows: &[Value],
    related_leases: &std::collections::HashMap<String, RelatedLeaseInfo>,
) -> Vec<Value> {
    [
        "all",
        "needs_response",
        "unassigned",
        "qualified_ready",
        "stalled_or_failed",
    ]
    .iter()
    .map(|view| {
        let count = if *view == "all" {
            rows.len()
        } else {
            rows.iter()
                .filter(|row| application_matches_view(row, Some(view), related_leases))
                .count()
        };
        json!({
            "id": view,
            "count": count,
        })
    })
    .collect()
}

fn build_applications_summary(
    rows: &[Value],
    related_leases: &std::collections::HashMap<String, RelatedLeaseInfo>,
) -> Value {
    json!({
        "totalApplications": rows.len(),
        "needsResponse": rows
            .iter()
            .filter(|row| application_matches_view(row, Some("needs_response"), related_leases))
            .count(),
        "unassigned": rows
            .iter()
            .filter(|row| value_str(row, "assigned_user_id").is_empty())
            .count(),
        "qualifiedReady": rows
            .iter()
            .filter(|row| application_matches_view(row, Some("qualified_ready"), related_leases))
            .count(),
        "stalledOrFailed": rows
            .iter()
            .filter(|row| application_matches_view(row, Some("stalled_or_failed"), related_leases))
            .count(),
    })
}

fn build_application_facets(
    rows: &[Value],
    contexts: &std::collections::HashMap<String, ApplicationLinkContext>,
) -> Value {
    let mut listing_counts = std::collections::HashMap::<String, (String, usize)>::new();
    let mut property_counts = std::collections::HashMap::<String, (String, usize)>::new();
    let mut source_counts = std::collections::HashMap::<String, usize>::new();

    for row in rows {
        let application_id = value_str(row, "id");
        if let Some(context) = contexts.get(&application_id) {
            if let (Some(id), Some(title)) = (&context.listing_id, &context.listing_title) {
                let entry = listing_counts
                    .entry(id.clone())
                    .or_insert((title.clone(), 0));
                entry.1 += 1;
            }
            if let (Some(id), Some(name)) = (&context.property_id, &context.property_name) {
                let entry = property_counts
                    .entry(id.clone())
                    .or_insert((name.clone(), 0));
                entry.1 += 1;
            }
        }
        let source = value_str(row, "source");
        if !source.is_empty() {
            *source_counts.entry(source).or_insert(0) += 1;
        }
    }

    json!({
        "listings": listing_counts
            .into_iter()
            .map(|(id, (name, count))| json!({ "id": id, "name": name, "count": count }))
            .collect::<Vec<_>>(),
        "properties": property_counts
            .into_iter()
            .map(|(id, (name, count))| json!({ "id": id, "name": name, "count": count }))
            .collect::<Vec<_>>(),
        "sources": source_counts
            .into_iter()
            .map(|(value, count)| json!({ "value": value, "count": count }))
            .collect::<Vec<_>>(),
    })
}

fn build_overview_row_contract(
    row: &Value,
    context: ApplicationLinkContext,
    last_touch_at: String,
) -> Value {
    let status = value_str(row, "status");
    json!({
        "id": value_str(row, "id"),
        "applicantName": value_str(row, "full_name"),
        "email": value_str(row, "email"),
        "phoneE164": non_empty_opt(row.as_object().and_then(|obj| obj.get("phone_e164")).and_then(Value::as_str)),
        "status": status,
        "statusLabel": status_label(&status),
        "listingId": context.listing_id,
        "listingTitle": context.listing_title,
        "propertyId": context.property_id,
        "propertyName": context.property_name,
        "unitId": context.unit_id,
        "unitName": context.unit_name,
        "assignedUserId": non_empty_opt(row.as_object().and_then(|obj| obj.get("assigned_user_id")).and_then(Value::as_str)),
        "assignedUserName": non_empty_opt(row.as_object().and_then(|obj| obj.get("assigned_user_name")).and_then(Value::as_str)),
        "qualificationScore": number_from_value(row.as_object().and_then(|obj| obj.get("qualification_score"))).round() as i64,
        "qualificationBand": value_str(row, "qualification_band"),
        "responseSlaStatus": value_str(row, "response_sla_status"),
        "responseSlaAlertLevel": value_str(row, "response_sla_alert_level"),
        "firstResponseMinutes": number_from_value(row.as_object().and_then(|obj| obj.get("first_response_minutes"))),
        "lastTouchAt": if last_touch_at.trim().is_empty() { Value::Null } else { Value::String(last_touch_at) },
        "source": value_str(row, "source"),
        "primaryHref": format!("/module/applications/{}", value_str(row, "id")),
    })
}

fn build_application_detail_contract(row: &Value, context: &ApplicationLinkContext) -> Value {
    let mut item = build_overview_row_contract(row, context.clone(), value_str(row, "updated_at"))
        .as_object()
        .cloned()
        .unwrap_or_default();
    item.insert(
        "createdAt".to_string(),
        row.as_object()
            .and_then(|obj| obj.get("created_at"))
            .cloned()
            .unwrap_or(Value::Null),
    );
    item.insert(
        "monthlyIncome".to_string(),
        row.as_object()
            .and_then(|obj| obj.get("monthly_income"))
            .cloned()
            .unwrap_or(Value::Null),
    );
    item.insert(
        "guaranteeChoice".to_string(),
        row.as_object()
            .and_then(|obj| obj.get("guarantee_choice"))
            .cloned()
            .unwrap_or(Value::Null),
    );
    item.insert(
        "documentNumber".to_string(),
        row.as_object()
            .and_then(|obj| obj.get("document_number"))
            .cloned()
            .unwrap_or(Value::Null),
    );
    item.insert(
        "message".to_string(),
        row.as_object()
            .and_then(|obj| obj.get("message"))
            .cloned()
            .unwrap_or(Value::Null),
    );
    item.insert(
        "predictiveScore".to_string(),
        row.as_object()
            .and_then(|obj| obj.get("predictive_score"))
            .cloned()
            .unwrap_or(Value::Null),
    );
    item.insert(
        "riskFactors".to_string(),
        row.as_object()
            .and_then(|obj| obj.get("risk_factors"))
            .cloned()
            .unwrap_or_else(|| Value::Array(Vec::new())),
    );
    Value::Object(item)
}

fn build_application_qualification(row: &Value) -> Value {
    json!({
        "score": number_from_value(row.as_object().and_then(|obj| obj.get("qualification_score"))).round() as i64,
        "band": value_str(row, "qualification_band"),
        "incomeToRentRatio": row
            .as_object()
            .and_then(|obj| obj.get("income_to_rent_ratio"))
            .cloned()
            .unwrap_or(Value::Null),
        "reasons": qualification_reasons(row),
    })
}

fn build_application_messages_contract(messages: &[Value]) -> Vec<Value> {
    messages
        .iter()
        .map(|message| {
            let payload = message
                .as_object()
                .and_then(|obj| obj.get("payload"))
                .and_then(Value::as_object)
                .cloned()
                .unwrap_or_default();
            let body_preview = payload
                .get("body")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(|value| value.chars().take(180).collect::<String>())
                .unwrap_or_default();
            json!({
                "id": value_str(message, "id"),
                "channel": value_str(message, "channel"),
                "direction": value_str(message, "direction"),
                "status": value_str(message, "status"),
                "subject": payload.get("subject").cloned().unwrap_or(Value::Null),
                "bodyPreview": body_preview,
                "createdAt": value_str(message, "created_at"),
            })
        })
        .collect()
}

fn build_application_timeline(
    application: &Value,
    events: &[Value],
    messages: &[Value],
    related_lease: Option<&RelatedLeaseInfo>,
) -> Vec<Value> {
    let mut timeline = Vec::new();

    if let Some(created_at) = non_empty_opt(
        application
            .as_object()
            .and_then(|obj| obj.get("created_at"))
            .and_then(Value::as_str),
    ) {
        timeline.push(json!({
            "id": format!("submitted:{}", value_str(application, "id")),
            "kind": "application_event",
            "title": "Application submitted",
            "subtitle": value_str(application, "source"),
            "createdAt": created_at,
        }));
    }

    for event in events {
        let event_type = value_str(event, "event_type");
        let payload = event
            .as_object()
            .and_then(|obj| obj.get("event_payload"))
            .and_then(Value::as_object)
            .cloned()
            .unwrap_or_default();
        let (title, subtitle) = match event_type.as_str() {
            "apply_submit" => (
                "Application submitted".to_string(),
                value_str(application, "source"),
            ),
            "status_changed" => {
                let next = payload
                    .get("to")
                    .and_then(Value::as_str)
                    .map(status_label)
                    .unwrap_or_else(|| "Status changed".to_string());
                (
                    format!("Status changed to {next}"),
                    payload
                        .get("note")
                        .and_then(Value::as_str)
                        .map(ToOwned::to_owned)
                        .unwrap_or_default(),
                )
            }
            "lease_sign" => (
                "Converted to lease".to_string(),
                payload
                    .get("lease_id")
                    .and_then(Value::as_str)
                    .map(|lease_id| format!("Lease {lease_id}"))
                    .unwrap_or_default(),
            ),
            _ => (
                event_type.replace('_', " "),
                payload
                    .get("note")
                    .and_then(Value::as_str)
                    .map(ToOwned::to_owned)
                    .unwrap_or_default(),
            ),
        };
        timeline.push(json!({
            "id": value_str(event, "id"),
            "kind": "application_event",
            "title": title,
            "subtitle": subtitle,
            "createdAt": value_str(event, "created_at"),
        }));
    }

    for message in build_application_messages_contract(messages) {
        let title = format!(
            "{} message",
            message
                .get("channel")
                .and_then(Value::as_str)
                .unwrap_or("Outbound")
        );
        let subtitle = message
            .get("bodyPreview")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        timeline.push(json!({
            "id": message.get("id").cloned().unwrap_or(Value::Null),
            "kind": "message",
            "title": title,
            "subtitle": subtitle,
            "createdAt": message.get("createdAt").cloned().unwrap_or(Value::Null),
        }));
    }

    if let Some(lease) = related_lease {
        timeline.push(json!({
            "id": format!("lease:{}", lease.id),
            "kind": "conversion",
            "title": "Lease created",
            "subtitle": lease.id,
            "createdAt": lease.updated_at.clone().unwrap_or_default(),
        }));
    }

    timeline.sort_by(|left, right| {
        right
            .get("createdAt")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .cmp(
                left.get("createdAt")
                    .and_then(Value::as_str)
                    .unwrap_or_default(),
            )
    });
    timeline
}

fn sort_application_overview_rows(
    rows: &mut [Value],
    sort: Option<&str>,
    last_touch_index: &std::collections::HashMap<String, String>,
    related_leases: &std::collections::HashMap<String, RelatedLeaseInfo>,
) {
    let sort_key = sort.unwrap_or("last_touch_desc");
    rows.sort_by(|left, right| {
        let ordering = match sort_key {
            "qualification_desc" => number_from_value(
                right
                    .as_object()
                    .and_then(|obj| obj.get("qualification_score")),
            )
            .partial_cmp(&number_from_value(
                left.as_object()
                    .and_then(|obj| obj.get("qualification_score")),
            ))
            .unwrap_or(std::cmp::Ordering::Equal),
            "created_desc" => value_str(right, "created_at").cmp(&value_str(left, "created_at")),
            "sla_desc" => sla_sort_rank(right)
                .cmp(&sla_sort_rank(left))
                .then_with(|| value_str(right, "created_at").cmp(&value_str(left, "created_at"))),
            "status_desc" => value_str(right, "status").cmp(&value_str(left, "status")),
            _ => {
                let right_id = value_str(right, "id");
                let left_id = value_str(left, "id");
                last_touch_index
                    .get(&right_id)
                    .cloned()
                    .unwrap_or_else(|| value_str(right, "updated_at"))
                    .cmp(
                        &last_touch_index
                            .get(&left_id)
                            .cloned()
                            .unwrap_or_else(|| value_str(left, "updated_at")),
                    )
                    .then_with(|| {
                        application_matches_view(right, Some("qualified_ready"), related_leases)
                            .cmp(&application_matches_view(
                                left,
                                Some("qualified_ready"),
                                related_leases,
                            ))
                    })
            }
        };
        ordering
    });
}

fn qualification_reasons(row: &Value) -> Vec<String> {
    let mut reasons = Vec::new();
    let ratio = number_from_value(
        row.as_object()
            .and_then(|obj| obj.get("income_to_rent_ratio")),
    );
    if ratio >= 3.0 {
        reasons.push("Income covers rent above 3x.".to_string());
    } else if ratio > 0.0 {
        reasons.push(format!("Income-to-rent ratio is {ratio:.2}x."));
    }
    if has_non_empty_string(row.as_object().and_then(|obj| obj.get("document_number"))) {
        reasons.push("Identity document provided.".to_string());
    }
    if has_non_empty_string(row.as_object().and_then(|obj| obj.get("phone_e164"))) {
        reasons.push("Phone contact is available.".to_string());
    }
    let guarantee_choice = value_str(row, "guarantee_choice");
    if !guarantee_choice.is_empty() {
        reasons.push(format!(
            "Guarantee option: {}.",
            guarantee_choice.replace('_', " ")
        ));
    }
    if reasons.is_empty() {
        reasons.push("Qualification data is limited; review manually.".to_string());
    }
    reasons
}

fn can_convert_to_lease(row: &Value, related_lease: Option<&RelatedLeaseInfo>) -> bool {
    if related_lease.is_some() {
        return false;
    }
    matches!(
        value_str(row, "status").as_str(),
        "qualified" | "visit_scheduled" | "offer_sent"
    )
}

fn is_stalled_application(row: &Value) -> bool {
    if has_non_empty_string(row.as_object().and_then(|obj| obj.get("first_response_at"))) {
        return false;
    }
    if !matches!(value_str(row, "status").as_str(), "new" | "screening") {
        return false;
    }
    parse_iso_datetime(row.as_object().and_then(|obj| obj.get("created_at")))
        .map(|created_at| Utc::now().fixed_offset() - created_at >= Duration::hours(48))
        .unwrap_or(false)
}

fn status_label(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "new" => "New".to_string(),
        "screening" => "Screening".to_string(),
        "qualified" => "Qualified".to_string(),
        "visit_scheduled" => "Visit scheduled".to_string(),
        "offer_sent" => "Offer sent".to_string(),
        "contract_signed" => "Contract signed".to_string(),
        "rejected" => "Rejected".to_string(),
        "lost" => "Lost".to_string(),
        other => other.replace('_', " "),
    }
}

fn sla_sort_rank(row: &Value) -> i32 {
    match value_str(row, "response_sla_status").as_str() {
        "breached" => 4,
        "pending" => match value_str(row, "response_sla_alert_level").as_str() {
            "critical" => 3,
            "warning" => 2,
            _ => 1,
        },
        "met" => 0,
        _ => 0,
    }
}

fn max_timestamp(current: Option<String>, next: Option<String>) -> Option<String> {
    match (current, next) {
        (Some(current), Some(next)) => {
            let current_dt = parse_iso_datetime(Some(&Value::String(current.clone())));
            let next_dt = parse_iso_datetime(Some(&Value::String(next.clone())));
            match (current_dt, next_dt) {
                (Some(current_dt), Some(next_dt)) => {
                    if next_dt > current_dt {
                        Some(next)
                    } else {
                        Some(current)
                    }
                }
                (None, Some(_)) => Some(next),
                _ => Some(current),
            }
        }
        (Some(current), None) => Some(current),
        (None, Some(next)) => Some(next),
        (None, None) => None,
    }
}

fn qualification_from_row(
    row: &Map<String, Value>,
    monthly_recurring_total: f64,
) -> (i64, String, Option<f64>) {
    let mut score: f64 = 0.0;

    if has_non_empty_string(row.get("phone_e164")) {
        score += 8.0;
    }
    if has_non_empty_string(row.get("document_number")) {
        score += 10.0;
    }
    if has_non_empty_string(row.get("email")) {
        score += 6.0;
    }
    if has_non_empty_string(row.get("message")) {
        score += 4.0;
    }

    let guarantee_choice = row
        .get("guarantee_choice")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default()
        .to_ascii_lowercase();
    if guarantee_choice == "guarantor_product" {
        score += 16.0;
    } else if guarantee_choice == "cash_deposit" {
        score += 10.0;
    } else {
        score += 6.0;
    }

    let monthly_income = number_from_value(row.get("monthly_income")).max(0.0);
    let mut income_to_rent_ratio: Option<f64> = None;
    if monthly_income > 0.0 && monthly_recurring_total > 0.0 {
        let ratio = round2(monthly_income / monthly_recurring_total);
        income_to_rent_ratio = Some(ratio);
        if ratio >= 3.0 {
            score += 40.0;
        } else if ratio >= 2.5 {
            score += 34.0;
        } else if ratio >= 2.0 {
            score += 28.0;
        } else if ratio >= 1.5 {
            score += 20.0;
        } else {
            score += 10.0;
        }
    } else if monthly_income > 0.0 {
        score += 18.0;
    }

    let status = row
        .get("status")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default()
        .to_ascii_lowercase();
    if matches!(
        status.as_str(),
        "qualified" | "visit_scheduled" | "offer_sent" | "contract_signed"
    ) {
        score += 12.0;
    } else if matches!(status.as_str(), "rejected" | "lost") {
        score -= 8.0;
    }

    let bounded_score = score.round().clamp(0.0, 100.0) as i64;
    let band = if bounded_score >= QUALIFICATION_STRONG_THRESHOLD {
        "strong".to_string()
    } else if bounded_score >= QUALIFICATION_MODERATE_THRESHOLD {
        "moderate".to_string()
    } else {
        "watch".to_string()
    };

    (bounded_score, band, income_to_rent_ratio)
}

fn can_transition(current: &str, next: &str) -> bool {
    if current == next {
        return true;
    }
    match current {
        "new" => matches!(next, "screening" | "rejected" | "lost"),
        "screening" => matches!(next, "qualified" | "visit_scheduled" | "rejected" | "lost"),
        "qualified" => matches!(
            next,
            "visit_scheduled" | "offer_sent" | "contract_signed" | "rejected" | "lost"
        ),
        "visit_scheduled" => matches!(next, "offer_sent" | "qualified" | "rejected" | "lost"),
        "offer_sent" => matches!(next, "contract_signed" | "rejected" | "lost"),
        "contract_signed" => next == "lost",
        "rejected" | "lost" => false,
        _ => false,
    }
}

fn ensure_applications_pipeline_enabled(state: &AppState) -> AppResult<()> {
    if state.config.applications_pipeline_enabled {
        return Ok(());
    }
    Err(AppError::Forbidden(
        "Applications pipeline is disabled.".to_string(),
    ))
}

fn ensure_lease_collections_enabled(state: &AppState) -> AppResult<()> {
    if state.config.lease_collections_enabled {
        return Ok(());
    }
    Err(AppError::Forbidden(
        "Lease collections endpoints are disabled.".to_string(),
    ))
}

fn db_pool(state: &AppState) -> AppResult<&sqlx::PgPool> {
    state.db_pool.as_ref().ok_or_else(|| {
        AppError::Dependency("Database is not configured. Set DATABASE_URL.".to_string())
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

fn json_map(entries: &[(&str, Value)]) -> Map<String, Value> {
    let mut map = Map::new();
    for (key, value) in entries {
        map.insert((*key).to_string(), value.clone());
    }
    map
}

fn parse_iso_datetime(value: Option<&Value>) -> Option<DateTime<FixedOffset>> {
    let mut text = value
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(ToOwned::to_owned)?;
    if text.ends_with('Z') {
        text.truncate(text.len().saturating_sub(1));
        text.push_str("+00:00");
    }
    DateTime::parse_from_rfc3339(&text).ok()
}

fn number_from_value(value: Option<&Value>) -> f64 {
    match value {
        Some(Value::Number(number)) => number.as_f64().unwrap_or(0.0),
        Some(Value::String(text)) => text.trim().parse::<f64>().unwrap_or(0.0),
        _ => 0.0,
    }
}

fn has_non_empty_string(value: Option<&Value>) -> bool {
    value
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|item| !item.is_empty())
}

fn missing_or_blank(row: &Value, key: &str) -> bool {
    row.as_object()
        .and_then(|obj| obj.get(key))
        .map(|value| match value {
            Value::Null => true,
            Value::String(text) => text.trim().is_empty(),
            _ => false,
        })
        .unwrap_or(true)
}

fn existing_or_now(row: &Value, key: &str, fallback_iso: &str) -> Value {
    if let Some(value) = row
        .as_object()
        .and_then(|obj| obj.get(key))
        .filter(|value| !matches!(value, Value::Null))
    {
        if let Some(text) = value.as_str() {
            if !text.trim().is_empty() {
                return Value::String(text.to_string());
            }
            return Value::String(fallback_iso.to_string());
        }
        return value.clone();
    }
    Value::String(fallback_iso.to_string())
}

fn application_value(row: &Value, key: &str) -> Option<Value> {
    row.as_object().and_then(|obj| obj.get(key)).cloned()
}

fn round2(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}
