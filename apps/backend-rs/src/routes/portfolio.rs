use axum::{
    extract::{Query, State},
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

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/portfolio/kpis", axum::routing::get(portfolio_kpis))
        .route(
            "/portfolio/comparison",
            axum::routing::get(portfolio_comparison),
        )
        .route(
            "/portfolio/snapshots",
            axum::routing::get(portfolio_snapshots),
        )
        .route(
            "/portfolio/simulate",
            axum::routing::post(simulate_scenario),
        )
}

#[derive(Deserialize)]
struct PortfolioQuery {
    org_id: String,
}

#[derive(Deserialize)]
struct SnapshotsQuery {
    org_id: String,
    #[serde(default = "default_snapshot_limit")]
    limit: i64,
}

fn default_snapshot_limit() -> i64 {
    30
}

/// GET /portfolio/kpis — Cross-property KPIs for the org.
async fn portfolio_kpis(
    State(state): State<AppState>,
    Query(query): Query<PortfolioQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let pool = state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database not configured".into()))?;

    let row = sqlx::query(
        "SELECT
            COALESCE(COUNT(u.id), 0) AS total_units,
            COALESCE(SUM(CASE WHEN l.id IS NOT NULL AND l.status = 'active' THEN 1 ELSE 0 END), 0) AS occupied_units,
            COALESCE(SUM(l.rent_amount), 0)::float8 AS monthly_revenue,
            COALESCE((SELECT SUM(amount) FROM expenses WHERE organization_id = $1::uuid AND date_part('month', expense_date) = date_part('month', now()) AND date_part('year', expense_date) = date_part('year', now())), 0)::float8 AS monthly_expenses
         FROM units u
         LEFT JOIN leases l ON l.unit_id = u.id AND l.status = 'active'
         WHERE u.organization_id = $1::uuid",
    )
    .bind(&query.org_id)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Database(format!("portfolio KPI query failed: {e}")))?;

    let total_units: i64 = row.try_get("total_units").unwrap_or(0);
    let occupied: i64 = row.try_get("occupied_units").unwrap_or(0);
    let revenue: f64 = row.try_get::<f64, _>("monthly_revenue").unwrap_or(0.0);
    let expenses: f64 = row.try_get::<f64, _>("monthly_expenses").unwrap_or(0.0);

    let occupancy = if total_units > 0 {
        occupied as f64 / total_units as f64
    } else {
        0.0
    };
    let noi = revenue - expenses;
    let revpar = if total_units > 0 {
        revenue / total_units as f64
    } else {
        0.0
    };

    Ok(Json(json!({
        "total_units": total_units,
        "occupied_units": occupied,
        "occupancy": (occupancy * 100.0).round() / 100.0,
        "monthly_revenue": revenue,
        "monthly_expenses": expenses,
        "noi": noi,
        "revpar": (revpar * 100.0).round() / 100.0,
    })))
}

/// GET /portfolio/comparison — Per-property performance comparison.
async fn portfolio_comparison(
    State(state): State<AppState>,
    Query(query): Query<PortfolioQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let pool = state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database not configured".into()))?;

    let rows = sqlx::query(
        "SELECT
            p.id::text AS property_id,
            p.name AS property_name,
            COALESCE(COUNT(u.id), 0) AS total_units,
            COALESCE(SUM(CASE WHEN l.id IS NOT NULL AND l.status = 'active' THEN 1 ELSE 0 END), 0) AS occupied,
            COALESCE(SUM(l.rent_amount), 0)::float8 AS revenue
         FROM properties p
         LEFT JOIN units u ON u.property_id = p.id
         LEFT JOIN leases l ON l.unit_id = u.id AND l.status = 'active'
         WHERE p.organization_id = $1::uuid
         GROUP BY p.id, p.name
         ORDER BY revenue DESC
         LIMIT 50",
    )
    .bind(&query.org_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(format!("portfolio comparison query failed: {e}")))?;

    let properties: Vec<Value> = rows
        .iter()
        .map(|r| {
            let total: i64 = r.try_get("total_units").unwrap_or(0);
            let occupied: i64 = r.try_get("occupied").unwrap_or(0);
            let revenue: f64 = r.try_get::<f64, _>("revenue").unwrap_or(0.0);
            let occ = if total > 0 {
                occupied as f64 / total as f64
            } else {
                0.0
            };

            json!({
                "property_id": r.try_get::<String, _>("property_id").unwrap_or_default(),
                "property_name": r.try_get::<String, _>("property_name").unwrap_or_default(),
                "total_units": total,
                "occupied_units": occupied,
                "occupancy": (occ * 100.0).round() / 100.0,
                "monthly_revenue": revenue,
            })
        })
        .collect();

    Ok(Json(json!({ "properties": properties })))
}

/// GET /portfolio/snapshots — Historical portfolio snapshots.
async fn portfolio_snapshots(
    State(state): State<AppState>,
    Query(query): Query<SnapshotsQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let pool = state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database not configured".into()))?;

    let limit = query.limit.clamp(1, 365);

    let rows = sqlx::query(
        "SELECT snapshot_date, total_units, occupied_units, revenue::text, expenses::text, noi::text, occupancy, revpar::text
         FROM portfolio_snapshots
         WHERE organization_id = $1::uuid
         ORDER BY snapshot_date DESC
         LIMIT $2",
    )
    .bind(&query.org_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(format!("portfolio snapshots query failed: {e}")))?;

    let snapshots: Vec<Value> = rows
        .iter()
        .map(|r| {
            json!({
                "date": r.try_get::<chrono::NaiveDate, _>("snapshot_date").ok().map(|d| d.to_string()),
                "total_units": r.try_get::<i32, _>("total_units").unwrap_or(0),
                "occupied_units": r.try_get::<i32, _>("occupied_units").unwrap_or(0),
                "revenue": r.try_get::<String, _>("revenue").unwrap_or_default(),
                "expenses": r.try_get::<String, _>("expenses").unwrap_or_default(),
                "noi": r.try_get::<String, _>("noi").unwrap_or_default(),
                "occupancy": r.try_get::<f64, _>("occupancy").unwrap_or(0.0),
                "revpar": r.try_get::<String, _>("revpar").unwrap_or_default(),
            })
        })
        .collect();

    Ok(Json(json!({ "snapshots": snapshots })))
}

#[derive(Deserialize)]
struct SimulateInput {
    org_id: String,
    base_revenue: f64,
    base_expenses: f64,
    #[serde(default = "default_revenue_growth")]
    revenue_growth_pct: f64,
    #[serde(default)]
    expense_growth_pct: f64,
    #[serde(default = "default_projection_months")]
    projection_months: u32,
    #[serde(default)]
    initial_investment: f64,
}

fn default_revenue_growth() -> f64 {
    2.0
}
fn default_projection_months() -> u32 {
    12
}

/// POST /portfolio/simulate — Run investment scenario simulation.
async fn simulate_scenario(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<SimulateInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &input.org_id).await?;

    let months = input.projection_months.clamp(1, 120);
    let mut projections = Vec::new();
    let mut cumulative_noi = 0.0_f64;

    for m in 1..=months {
        let factor = (1.0 + input.revenue_growth_pct / 100.0).powi(m as i32);
        let exp_factor = (1.0 + input.expense_growth_pct / 100.0).powi(m as i32);
        let rev = input.base_revenue * factor;
        let exp = input.base_expenses * exp_factor;
        let noi = rev - exp;
        cumulative_noi += noi;

        projections.push(json!({
            "month": m,
            "revenue": (rev * 100.0).round() / 100.0,
            "expenses": (exp * 100.0).round() / 100.0,
            "noi": (noi * 100.0).round() / 100.0,
            "cumulative_noi": (cumulative_noi * 100.0).round() / 100.0,
        }));
    }

    let annual_noi = if months >= 12 {
        projections[11]["noi"].as_f64().unwrap_or(0.0) * 12.0
    } else {
        cumulative_noi / months as f64 * 12.0
    };

    let roi_pct = if input.initial_investment > 0.0 {
        (cumulative_noi / input.initial_investment) * 100.0
    } else {
        0.0
    };

    let cap_rate = if input.initial_investment > 0.0 {
        (annual_noi / input.initial_investment) * 100.0
    } else {
        0.0
    };

    let break_even_month = if input.initial_investment > 0.0 {
        projections
            .iter()
            .find(|p| {
                p["cumulative_noi"]
                    .as_f64()
                    .map(|c| c >= input.initial_investment)
                    .unwrap_or(false)
            })
            .and_then(|p| p["month"].as_u64())
    } else {
        None
    };

    Ok(Json(json!({
        "projections": projections,
        "summary": {
            "total_noi": (cumulative_noi * 100.0).round() / 100.0,
            "annualized_noi": (annual_noi * 100.0).round() / 100.0,
            "roi_pct": (roi_pct * 100.0).round() / 100.0,
            "cap_rate_pct": (cap_rate * 100.0).round() / 100.0,
            "break_even_month": break_even_month,
            "projection_months": months,
        }
    })))
}
