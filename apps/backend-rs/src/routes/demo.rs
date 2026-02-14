use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use chrono::{Datelike, Utc};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    auth::require_user_id,
    error::{AppError, AppResult},
    repository::table_service::{create_row, list_rows},
    state::AppState,
    tenancy::assert_org_role,
};

pub fn router() -> axum::Router<AppState> {
    axum::Router::new().route("/demo/seed", axum::routing::post(seed_demo))
}

async fn seed_demo(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<Value>,
) -> AppResult<impl IntoResponse> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let org_id = payload
        .get("organization_id")
        .or_else(|| payload.get("org_id"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| AppError::BadRequest("organization_id is required.".to_string()))?
        .to_string();

    let org_uuid = Uuid::parse_str(&org_id).map_err(|_| {
        AppError::BadRequest("Invalid organization_id (expected UUID).".to_string())
    })?;

    assert_org_role(&state, &user_id, &org_id, &["owner_admin"]).await?;

    // Only seed into an empty org.
    let existing = list_rows(
        pool,
        "properties",
        Some(&serde_json::from_value(json!({"organization_id": org_id})).unwrap_or_default()),
        1,
        0,
        "created_at",
        false,
    )
    .await?;
    if !existing.is_empty() {
        return Err(AppError::Conflict(
            "Demo data already exists for this organization (properties found).".to_string(),
        ));
    }

    // Deterministic UUIDs.
    let namespace = org_uuid;
    let property_id = Uuid::new_v5(&namespace, b"demo:property:vm-hq");
    let unit_a_id = Uuid::new_v5(&namespace, b"demo:unit:vm-hq:A1");
    let unit_b_id = Uuid::new_v5(&namespace, b"demo:unit:vm-hq:B1");
    let airbnb_id = Uuid::new_v5(&namespace, b"demo:channel:airbnb");
    let booking_id = Uuid::new_v5(&namespace, b"demo:channel:bookingcom");
    let listing_a_id = Uuid::new_v5(&namespace, b"demo:listing:airbnb:A1");
    let listing_b_id = Uuid::new_v5(&namespace, b"demo:listing:bookingcom:B1");
    let guest_id = Uuid::new_v5(&namespace, b"demo:guest:ana-perez");
    let reservation_id = Uuid::new_v5(&namespace, b"demo:reservation:ana-perez:A1");
    let block_id = Uuid::new_v5(&namespace, b"demo:block:maintenance:A1");
    let task_id = Uuid::new_v5(&namespace, b"demo:task:turnover:A1");
    let task_item_1 = Uuid::new_v5(&namespace, b"demo:task_item:turnover:1");
    let task_item_2 = Uuid::new_v5(&namespace, b"demo:task_item:turnover:2");
    let expense_id = Uuid::new_v5(&namespace, b"demo:expense:supplies:A1");
    let statement_id = Uuid::new_v5(&namespace, b"demo:statement:this-month");

    let today = Utc::now().date_naive();
    let check_in = today + chrono::Duration::days(7);
    let check_out = today + chrono::Duration::days(10);
    let maintenance_start = today + chrono::Duration::days(14);
    let maintenance_end = today + chrono::Duration::days(16);
    let period_start = today.with_day(1).unwrap_or(today);
    let period_end = today;

    let mut created = serde_json::Map::new();

    // Property
    let prop = create_row(
        pool,
        "properties",
        &serde_json::from_value(json!({
            "id": property_id.to_string(),
            "organization_id": org_id,
            "name": "Villa Morra HQ (Demo)",
            "code": "DEMO-VM-HQ",
            "address_line1": "Av. Example 123",
            "city": "Asuncion",
            "country_code": "PY",
        }))
        .unwrap_or_default(),
    )
    .await?;
    created.insert(
        "property_id".to_string(),
        Value::String(val_str(&prop, "id", &property_id.to_string())),
    );

    // Units
    let unit_a = create_row(
        pool,
        "units",
        &serde_json::from_value(json!({
            "id": unit_a_id.to_string(),
            "organization_id": org_id,
            "property_id": property_id.to_string(),
            "code": "A1",
            "name": "Departamento A1 (Demo)",
            "max_guests": "2",
            "bedrooms": "1",
            "bathrooms": "1.0",
            "default_nightly_rate": "250000",
            "default_cleaning_fee": "80000",
            "currency": "PYG",
            "is_active": "true",
        }))
        .unwrap_or_default(),
    )
    .await?;
    let unit_b = create_row(
        pool,
        "units",
        &serde_json::from_value(json!({
            "id": unit_b_id.to_string(),
            "organization_id": org_id,
            "property_id": property_id.to_string(),
            "code": "B1",
            "name": "Departamento B1 (Demo)",
            "max_guests": "4",
            "bedrooms": "2",
            "bathrooms": "1.0",
            "default_nightly_rate": "380000",
            "default_cleaning_fee": "120000",
            "currency": "PYG",
            "is_active": "true",
        }))
        .unwrap_or_default(),
    )
    .await?;
    created.insert(
        "unit_ids".to_string(),
        json!([
            val_str(&unit_a, "id", &unit_a_id.to_string()),
            val_str(&unit_b, "id", &unit_b_id.to_string()),
        ]),
    );

    // Channels
    let ch_airbnb = create_row(
        pool,
        "channels",
        &serde_json::from_value(json!({
            "id": airbnb_id.to_string(),
            "organization_id": org_id,
            "kind": "airbnb",
            "name": "Airbnb (Demo)",
            "is_active": "true",
        }))
        .unwrap_or_default(),
    )
    .await?;
    let ch_booking = create_row(
        pool,
        "channels",
        &serde_json::from_value(json!({
            "id": booking_id.to_string(),
            "organization_id": org_id,
            "kind": "bookingcom",
            "name": "Booking.com (Demo)",
            "is_active": "true",
        }))
        .unwrap_or_default(),
    )
    .await?;
    created.insert(
        "channel_ids".to_string(),
        json!([
            val_str(&ch_airbnb, "id", &airbnb_id.to_string()),
            val_str(&ch_booking, "id", &booking_id.to_string()),
        ]),
    );

    // Listings
    let listing_a = create_row(
        pool,
        "listings",
        &serde_json::from_value(json!({
            "id": listing_a_id.to_string(),
            "organization_id": org_id,
            "unit_id": unit_a_id.to_string(),
            "channel_id": airbnb_id.to_string(),
            "external_listing_id": "airbnb-demo-VM-A1",
            "public_name": "VM A1 (Demo Airbnb)",
            "is_active": "true",
        }))
        .unwrap_or_default(),
    )
    .await?;
    let listing_b = create_row(
        pool,
        "listings",
        &serde_json::from_value(json!({
            "id": listing_b_id.to_string(),
            "organization_id": org_id,
            "unit_id": unit_b_id.to_string(),
            "channel_id": booking_id.to_string(),
            "external_listing_id": "booking-demo-VM-B1",
            "public_name": "VM B1 (Demo Booking)",
            "is_active": "true",
        }))
        .unwrap_or_default(),
    )
    .await?;
    created.insert(
        "listing_ids".to_string(),
        json!([
            val_str(&listing_a, "id", &listing_a_id.to_string()),
            val_str(&listing_b, "id", &listing_b_id.to_string()),
        ]),
    );

    // Guest
    let guest = create_row(
        pool,
        "guests",
        &serde_json::from_value(json!({
            "id": guest_id.to_string(),
            "organization_id": org_id,
            "full_name": "Ana Perez (Demo)",
            "email": "ana.perez@example.com",
            "phone_e164": "+595981000000",
            "preferred_language": "es",
        }))
        .unwrap_or_default(),
    )
    .await?;
    created.insert(
        "guest_id".to_string(),
        Value::String(val_str(&guest, "id", &guest_id.to_string())),
    );

    // Reservation
    let reservation = create_row(
        pool,
        "reservations",
        &serde_json::from_value(json!({
            "id": reservation_id.to_string(),
            "organization_id": org_id,
            "unit_id": unit_a_id.to_string(),
            "listing_id": listing_a_id.to_string(),
            "channel_id": airbnb_id.to_string(),
            "guest_id": guest_id.to_string(),
            "status": "confirmed",
            "source": "manual",
            "check_in_date": check_in.format("%Y-%m-%d").to_string(),
            "check_out_date": check_out.format("%Y-%m-%d").to_string(),
            "currency": "PYG",
            "nightly_rate": "250000",
            "cleaning_fee": "80000",
            "total_amount": "830000",
            "owner_payout_estimate": "830000",
        }))
        .unwrap_or_default(),
    )
    .await?;
    created.insert(
        "reservation_id".to_string(),
        Value::String(val_str(&reservation, "id", &reservation_id.to_string())),
    );

    // Calendar block
    let block = create_row(
        pool,
        "calendar_blocks",
        &serde_json::from_value(json!({
            "id": block_id.to_string(),
            "organization_id": org_id,
            "unit_id": unit_a_id.to_string(),
            "source": "manual",
            "starts_on": maintenance_start.format("%Y-%m-%d").to_string(),
            "ends_on": maintenance_end.format("%Y-%m-%d").to_string(),
            "reason": "Maintenance (Demo)",
        }))
        .unwrap_or_default(),
    )
    .await?;
    created.insert(
        "calendar_block_id".to_string(),
        Value::String(val_str(&block, "id", &block_id.to_string())),
    );

    // Task + items
    let task = create_row(
        pool,
        "tasks",
        &serde_json::from_value(json!({
            "id": task_id.to_string(),
            "organization_id": org_id,
            "property_id": property_id.to_string(),
            "unit_id": unit_a_id.to_string(),
            "reservation_id": reservation_id.to_string(),
            "type": "cleaning",
            "status": "todo",
            "priority": "high",
            "title": "Turnover cleaning (Demo)",
            "description": "Auto-generated demo task for the next reservation.",
        }))
        .unwrap_or_default(),
    )
    .await?;
    created.insert(
        "task_id".to_string(),
        Value::String(val_str(&task, "id", &task_id.to_string())),
    );

    create_row(
        pool,
        "task_items",
        &serde_json::from_value(json!({
            "id": task_item_1.to_string(),
            "task_id": task_id.to_string(),
            "sort_order": "1",
            "label": "Replace linens + towels",
            "is_required": "true",
            "is_completed": "false",
        }))
        .unwrap_or_default(),
    )
    .await?;
    create_row(
        pool,
        "task_items",
        &serde_json::from_value(json!({
            "id": task_item_2.to_string(),
            "task_id": task_id.to_string(),
            "sort_order": "2",
            "label": "Restock water + coffee",
            "is_required": "true",
            "is_completed": "false",
        }))
        .unwrap_or_default(),
    )
    .await?;

    // Expense
    let expense = create_row(
        pool,
        "expenses",
        &serde_json::from_value(json!({
            "id": expense_id.to_string(),
            "organization_id": org_id,
            "property_id": property_id.to_string(),
            "unit_id": unit_a_id.to_string(),
            "reservation_id": reservation_id.to_string(),
            "category": "supplies",
            "vendor_name": "Supermarket (Demo)",
            "expense_date": today.format("%Y-%m-%d").to_string(),
            "amount": "95000",
            "currency": "PYG",
            "payment_method": "cash",
            "notes": "Cleaning supplies for turnover.",
        }))
        .unwrap_or_default(),
    )
    .await?;
    created.insert(
        "expense_id".to_string(),
        Value::String(val_str(&expense, "id", &expense_id.to_string())),
    );

    // Owner statement
    let statement = create_row(
        pool,
        "owner_statements",
        &serde_json::from_value(json!({
            "id": statement_id.to_string(),
            "organization_id": org_id,
            "property_id": property_id.to_string(),
            "period_start": period_start.format("%Y-%m-%d").to_string(),
            "period_end": period_end.format("%Y-%m-%d").to_string(),
            "currency": "PYG",
            "gross_revenue": "830000",
            "operating_expenses": "95000",
            "net_payout": "735000",
            "status": "draft",
        }))
        .unwrap_or_default(),
    )
    .await?;
    created.insert(
        "owner_statement_id".to_string(),
        Value::String(val_str(&statement, "id", &statement_id.to_string())),
    );

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "ok": true,
            "organization_id": org_id,
            "created": Value::Object(created),
        })),
    ))
}

fn db_pool(state: &AppState) -> AppResult<&sqlx::PgPool> {
    state.db_pool.as_ref().ok_or_else(|| {
        AppError::Dependency(
            "Supabase database is not configured. Set SUPABASE_DB_URL or DATABASE_URL.".to_string(),
        )
    })
}

fn val_str(row: &Value, key: &str, fallback: &str) -> String {
    row.as_object()
        .and_then(|obj| obj.get(key))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| fallback.to_string())
}
