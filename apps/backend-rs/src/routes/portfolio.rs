use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Map, Value};
use sqlx::Row;

use crate::{
    auth::require_user_id,
    error::{AppError, AppResult},
    repository::table_service::{get_row, list_rows},
    routes::properties::build_property_hierarchy,
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
            "/portfolio/overview",
            axum::routing::get(portfolio_overview),
        )
        .route(
            "/portfolio/simulate",
            axum::routing::post(simulate_scenario),
        )
        .route(
            "/portfolio/properties/overview",
            axum::routing::get(portfolio_properties_overview),
        )
        .route(
            "/portfolio/units/overview",
            axum::routing::get(portfolio_units_overview),
        )
        .route(
            "/portfolio/properties/{property_id}/overview",
            axum::routing::get(portfolio_property_overview),
        )
        .route(
            "/portfolio/units/{unit_id}/overview",
            axum::routing::get(portfolio_unit_overview),
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

#[derive(Deserialize)]
struct PortfolioOverviewQuery {
    org_id: String,
    period: Option<String>,
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
    .map_err(|e| AppError::Internal(format!("portfolio KPI query failed: {e}")))?;

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
    .map_err(|e| AppError::Internal(format!("portfolio comparison query failed: {e}")))?;

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
    .map_err(|e| AppError::Internal(format!("portfolio snapshots query failed: {e}")))?;

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

/// GET /portfolio/overview — operational portfolio scan with trend and attention.
async fn portfolio_overview(
    State(state): State<AppState>,
    Query(query): Query<PortfolioOverviewQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;

    let pool = state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database not configured".into()))?;

    let period = OverviewPeriod::parse(query.period.as_deref());
    let mut property_rows =
        fetch_property_overview_rows(pool, &query.org_id, None, None, None, None).await?;
    let mut unit_rows =
        fetch_unit_overview_rows(pool, &query.org_id, None, None, None, None, None, None).await?;

    sort_property_rows(&mut property_rows, Some("health_desc"));
    sort_unit_rows(&mut unit_rows, Some("risk_desc"));

    let total_properties = property_rows.len() as i64;
    let total_units = property_rows.iter().map(|row| row.total_units).sum::<i64>();
    let occupied_units = property_rows
        .iter()
        .map(|row| row.occupied_units)
        .sum::<i64>();
    let open_tasks = property_rows.iter().map(|row| row.open_tasks).sum::<i64>();
    let overdue_collections = property_rows
        .iter()
        .map(|row| row.overdue_collections)
        .sum::<i64>();
    let monthly_revenue = property_rows
        .iter()
        .map(|row| row.monthly_revenue)
        .sum::<f64>();

    let monthly_expenses = sqlx::query_scalar::<_, f64>(
        "SELECT COALESCE(SUM(amount), 0)::float8
         FROM expenses
         WHERE organization_id = $1::uuid
           AND expense_date >= date_trunc('month', current_date)::date
           AND expense_date < (date_trunc('month', current_date) + interval '1 month')::date
           AND approval_status != 'rejected'",
    )
    .bind(&query.org_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    let snapshot_rows = sqlx::query(
        "SELECT snapshot_date, revenue::float8 AS revenue, noi::float8 AS noi, occupancy::float8 AS occupancy
         FROM portfolio_snapshots
         WHERE organization_id = $1::uuid
           AND snapshot_date >= current_date - ($2::int || ' days')::interval
         ORDER BY snapshot_date ASC",
    )
    .bind(&query.org_id)
    .bind(period.days())
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Internal(format!("portfolio overview trend query failed: {e}")))?;

    let mut trend_points = snapshot_rows
        .iter()
        .map(|row| {
            let snapshot_date = row
                .try_get::<chrono::NaiveDate, _>("snapshot_date")
                .map(|date| date.to_string())
                .unwrap_or_default();
            let occupancy = row.try_get::<f64, _>("occupancy").unwrap_or(0.0);
            json!({
                "date": snapshot_date,
                "occupancyRate": round_currency(occupancy * 100.0),
                "revenue": round_currency(row.try_get::<f64, _>("revenue").unwrap_or(0.0)),
                "noi": round_currency(row.try_get::<f64, _>("noi").unwrap_or(0.0)),
            })
        })
        .collect::<Vec<_>>();

    let has_current_data = total_properties > 0 || total_units > 0;
    if trend_points.is_empty() && has_current_data {
        trend_points.push(json!({
            "date": current_date_key(),
            "occupancyRate": percentage(occupied_units, total_units),
            "revenue": round_currency(monthly_revenue),
            "noi": round_currency(monthly_revenue - monthly_expenses),
        }));
    }

    let delta = if trend_points.len() >= 2 {
        let first = &trend_points[0];
        let last = trend_points.last().unwrap_or(first);

        let first_revenue = first.get("revenue").and_then(Value::as_f64).unwrap_or(0.0);
        let last_revenue = last.get("revenue").and_then(Value::as_f64).unwrap_or(0.0);
        let first_noi = first.get("noi").and_then(Value::as_f64).unwrap_or(0.0);
        let last_noi = last.get("noi").and_then(Value::as_f64).unwrap_or(0.0);
        let first_occupancy = first
            .get("occupancyRate")
            .and_then(Value::as_f64)
            .unwrap_or(0.0);
        let last_occupancy = last
            .get("occupancyRate")
            .and_then(Value::as_f64)
            .unwrap_or(0.0);

        json!({
            "revenuePct": percent_change(last_revenue, first_revenue),
            "occupancyPts": round_currency(last_occupancy - first_occupancy),
            "noiPct": percent_change(last_noi, first_noi),
        })
    } else {
        json!({
            "revenuePct": Value::Null,
            "occupancyPts": Value::Null,
            "noiPct": Value::Null,
        })
    };

    let top_properties = property_rows
        .iter()
        .take(8)
        .map(|row| {
            json!({
                "id": row.id,
                "name": row.name,
                "occupiedUnits": row.occupied_units,
                "totalUnits": row.total_units,
                "openTasks": row.open_tasks,
                "overdueCollections": row.overdue_collections,
                "health": property_health(row),
                "href": format!("/module/properties/{}", row.id),
                "unitsHref": format!("/module/units?property_id={}", row.id),
            })
        })
        .collect::<Vec<_>>();

    let mut attention_items = property_rows
        .iter()
        .filter(|row| property_health(row) != "good")
        .map(|row| {
            json!({
                "id": format!("property:{}", row.id),
                "kind": "property",
                "severity": if property_health(row) == "critical" { "high" } else { "medium" },
                "title": row.name,
                "subtitle": format!(
                    "{} open tasks · {} overdue collections · {}/{} units occupied",
                    row.open_tasks,
                    row.overdue_collections,
                    row.occupied_units,
                    row.total_units
                ),
                "href": format!("/module/properties/{}", row.id),
            })
        })
        .collect::<Vec<_>>();

    attention_items.extend(
        unit_rows
            .iter()
            .filter(|row| {
                unit_maintenance_risk(row) != "none"
                    || row.ending_soon
                    || row.overdue_collections > 0
            })
            .map(|row| {
                let severity =
                    if unit_maintenance_risk(row) == "high" || row.overdue_collections > 0 {
                        "high"
                    } else {
                        "medium"
                    };
                let mut parts = Vec::new();
                parts.push(format!("{} · {}", row.property_name, row.code));
                if unit_maintenance_risk(row) != "none" {
                    parts.push(format!("maintenance {}", unit_maintenance_risk(row)));
                }
                if row.ending_soon {
                    parts.push("lease ending soon".to_string());
                }
                if row.open_tasks > 0 {
                    parts.push(format!("{} open tasks", row.open_tasks));
                }
                if row.overdue_collections > 0 {
                    parts.push(format!("{} overdue collections", row.overdue_collections));
                }

                json!({
                    "id": format!("unit:{}", row.id),
                    "kind": "unit",
                    "severity": severity,
                    "title": format!("Unit {}", row.code),
                    "subtitle": parts.join(" · "),
                    "href": format!("/module/units/{}", row.id),
                })
            }),
    );

    attention_items.sort_by(|left, right| {
        attention_rank(
            right
                .get("severity")
                .and_then(Value::as_str)
                .unwrap_or_default(),
        )
        .cmp(&attention_rank(
            left.get("severity")
                .and_then(Value::as_str)
                .unwrap_or_default(),
        ))
        .then_with(|| {
            left.get("title")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .cmp(
                    right
                        .get("title")
                        .and_then(Value::as_str)
                        .unwrap_or_default(),
                )
        })
    });
    attention_items.truncate(8);

    Ok(Json(json!({
        "summary": {
            "totalProperties": total_properties,
            "totalUnits": total_units,
            "occupiedUnits": occupied_units,
            "occupancyRate": percentage(occupied_units, total_units),
            "openTasks": open_tasks,
            "overdueCollections": overdue_collections,
            "monthlyRevenue": round_currency(monthly_revenue),
        },
        "trend": {
            "period": period.id(),
            "points": trend_points,
            "delta": delta,
        },
        "topProperties": top_properties,
        "attentionItems": attention_items,
        "hasData": has_current_data || !snapshot_rows.is_empty(),
    })))
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

fn default_overview_limit() -> i64 {
    50
}

fn clamp_overview_limit(limit: i64) -> i64 {
    limit.clamp(1, 100)
}

fn clamp_offset(offset: i64) -> i64 {
    offset.max(0)
}

#[derive(Clone, Copy)]
enum OverviewPeriod {
    ThirtyDays,
    NinetyDays,
    TwelveMonths,
}

impl OverviewPeriod {
    fn parse(raw: Option<&str>) -> Self {
        match raw
            .map(str::trim)
            .unwrap_or_default()
            .to_ascii_lowercase()
            .as_str()
        {
            "90d" => Self::NinetyDays,
            "12m" => Self::TwelveMonths,
            _ => Self::ThirtyDays,
        }
    }

    fn id(self) -> &'static str {
        match self {
            Self::ThirtyDays => "30d",
            Self::NinetyDays => "90d",
            Self::TwelveMonths => "12m",
        }
    }

    fn days(self) -> i32 {
        match self {
            Self::ThirtyDays => 30,
            Self::NinetyDays => 90,
            Self::TwelveMonths => 365,
        }
    }
}

#[derive(Deserialize)]
struct PropertiesOverviewQuery {
    org_id: String,
    q: Option<String>,
    status: Option<String>,
    property_type: Option<String>,
    neighborhood: Option<String>,
    health: Option<String>,
    view: Option<String>,
    sort: Option<String>,
    #[serde(default = "default_overview_limit")]
    limit: i64,
    #[serde(default)]
    offset: i64,
}

#[derive(Deserialize)]
struct UnitsOverviewQuery {
    org_id: String,
    q: Option<String>,
    property_id: Option<String>,
    status: Option<String>,
    unit_type: Option<String>,
    condition_status: Option<String>,
    floor_level: Option<i16>,
    view: Option<String>,
    sort: Option<String>,
    #[serde(default = "default_overview_limit")]
    limit: i64,
    #[serde(default)]
    offset: i64,
}

#[derive(Deserialize)]
struct PortfolioPropertyPath {
    property_id: String,
}

#[derive(Deserialize)]
struct PortfolioUnitPath {
    unit_id: String,
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

#[derive(Clone)]
struct PropertyOverviewRow {
    id: String,
    name: String,
    address: String,
    city: String,
    status: String,
    property_type: String,
    occupied_units: i64,
    total_units: i64,
    open_tasks: i64,
    urgent_tasks: i64,
    open_collections: i64,
    overdue_collections: i64,
    monthly_revenue: f64,
}

#[derive(Clone)]
struct UnitOverviewRow {
    id: String,
    code: String,
    name: String,
    property_id: String,
    property_name: String,
    unit_type: String,
    condition_status: String,
    floor_level: Option<i16>,
    bedrooms: i64,
    bathrooms: f64,
    currency: String,
    is_active: bool,
    rent_amount: f64,
    has_active_lease: bool,
    ending_soon: bool,
    open_tasks: i64,
    urgent_tasks: i64,
    overdue_collections: i64,
}

async fn fetch_property_overview_rows(
    pool: &sqlx::PgPool,
    org_id: &str,
    status: Option<String>,
    property_type: Option<String>,
    neighborhood: Option<String>,
    search: Option<String>,
) -> AppResult<Vec<PropertyOverviewRow>> {
    let rows = sqlx::query(
        "SELECT
            p.id::text AS id,
            COALESCE(p.name, '') AS name,
            COALESCE(p.address_line1, '') AS address,
            COALESCE(p.city, '') AS city,
            COALESCE(p.status::text, 'active') AS status,
            COALESCE(p.property_type, '') AS property_type,
            COALESCE(unit_counts.total_units, 0) AS total_units,
            COALESCE(lease_counts.occupied_units, 0) AS occupied_units,
            COALESCE(lease_counts.monthly_revenue, 0)::float8 AS monthly_revenue,
            COALESCE(task_counts.open_tasks, 0) AS open_tasks,
            COALESCE(task_counts.urgent_tasks, 0) AS urgent_tasks,
            COALESCE(collection_counts.open_collections, 0) AS open_collections,
            COALESCE(collection_counts.overdue_collections, 0) AS overdue_collections
         FROM properties p
         LEFT JOIN (
            SELECT u.property_id, COUNT(*) AS total_units
            FROM units u
            WHERE u.organization_id = $1::uuid
            GROUP BY u.property_id
         ) AS unit_counts ON unit_counts.property_id = p.id
         LEFT JOIN (
            SELECT
              u.property_id,
              COUNT(DISTINCT l.id) FILTER (WHERE lower(COALESCE(l.lease_status::text, '')) = 'active') AS occupied_units,
              COALESCE(SUM(
                CASE WHEN lower(COALESCE(l.lease_status::text, '')) = 'active'
                  THEN COALESCE(l.monthly_rent, 0)
                  ELSE 0
                END
              ), 0)::float8 AS monthly_revenue
            FROM units u
            LEFT JOIN leases l ON l.unit_id = u.id
            WHERE u.organization_id = $1::uuid
            GROUP BY u.property_id
         ) AS lease_counts ON lease_counts.property_id = p.id
         LEFT JOIN (
            SELECT
              t.property_id,
              COUNT(*) FILTER (
                WHERE lower(COALESCE(t.status::text, '')) NOT IN ('done', 'completed', 'cancelled', 'resolved')
              ) AS open_tasks,
              COUNT(*) FILTER (
                WHERE lower(COALESCE(t.status::text, '')) NOT IN ('done', 'completed', 'cancelled', 'resolved')
                  AND (
                    lower(COALESCE(t.priority::text, '')) IN ('critical', 'urgent', 'high')
                    OR (t.due_at IS NOT NULL AND t.due_at < now())
                  )
              ) AS urgent_tasks
            FROM tasks t
            WHERE t.organization_id = $1::uuid
            GROUP BY t.property_id
         ) AS task_counts ON task_counts.property_id = p.id
         LEFT JOIN (
            SELECT
              l.property_id,
              COUNT(*) FILTER (
                WHERE lower(COALESCE(c.status::text, '')) NOT IN ('paid', 'cancelled')
              ) AS open_collections,
              COUNT(*) FILTER (
                WHERE lower(COALESCE(c.status::text, '')) NOT IN ('paid', 'cancelled')
                  AND c.due_date IS NOT NULL
                  AND c.due_date < current_date
              ) AS overdue_collections
            FROM leases l
            JOIN collections c ON c.lease_id = l.id
            WHERE l.organization_id = $1::uuid
            GROUP BY l.property_id
         ) AS collection_counts ON collection_counts.property_id = p.id
         WHERE p.organization_id = $1::uuid
           AND ($2::text IS NULL OR lower(COALESCE(p.status::text, '')) = $2)
           AND ($3::text IS NULL OR lower(COALESCE(p.property_type, '')) = $3)
           AND ($4::text IS NULL OR lower(COALESCE(p.neighborhood, '')) LIKE $4)
           AND (
             $5::text IS NULL
             OR lower(concat_ws(' ',
               COALESCE(p.name, ''),
               COALESCE(p.code, ''),
               COALESCE(p.address_line1, ''),
               COALESCE(p.city, ''),
               COALESCE(p.neighborhood, '')
             )) LIKE $5
           )",
    )
    .bind(org_id)
    .bind(status)
    .bind(property_type)
    .bind(neighborhood)
    .bind(search)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Internal(format!("portfolio properties overview query failed: {e}")))?;

    Ok(rows
        .iter()
        .map(|row| PropertyOverviewRow {
            id: row.try_get::<String, _>("id").unwrap_or_default(),
            name: row.try_get::<String, _>("name").unwrap_or_default(),
            address: row.try_get::<String, _>("address").unwrap_or_default(),
            city: row.try_get::<String, _>("city").unwrap_or_default(),
            status: row
                .try_get::<String, _>("status")
                .unwrap_or_else(|_| "active".to_string()),
            property_type: row
                .try_get::<String, _>("property_type")
                .unwrap_or_default(),
            occupied_units: row.try_get::<i64, _>("occupied_units").unwrap_or(0),
            total_units: row.try_get::<i64, _>("total_units").unwrap_or(0),
            open_tasks: row.try_get::<i64, _>("open_tasks").unwrap_or(0),
            urgent_tasks: row.try_get::<i64, _>("urgent_tasks").unwrap_or(0),
            open_collections: row.try_get::<i64, _>("open_collections").unwrap_or(0),
            overdue_collections: row.try_get::<i64, _>("overdue_collections").unwrap_or(0),
            monthly_revenue: row.try_get::<f64, _>("monthly_revenue").unwrap_or(0.0),
        })
        .collect())
}

#[allow(clippy::too_many_arguments)]
async fn fetch_unit_overview_rows(
    pool: &sqlx::PgPool,
    org_id: &str,
    property_id: Option<String>,
    status: Option<String>,
    unit_type: Option<String>,
    condition_status: Option<String>,
    floor_level: Option<i16>,
    search: Option<String>,
) -> AppResult<Vec<UnitOverviewRow>> {
    let rows = sqlx::query(
        "SELECT
            u.id::text AS id,
            COALESCE(u.code, '') AS code,
            COALESCE(u.name, '') AS name,
            u.property_id::text AS property_id,
            COALESCE(p.name, '') AS property_name,
            COALESCE(u.unit_type, '') AS unit_type,
            COALESCE(u.condition_status, '') AS condition_status,
            u.floor_level AS floor_level,
            COALESCE(u.bedrooms, 0) AS bedrooms,
            COALESCE(u.bathrooms, 0)::float8 AS bathrooms,
            COALESCE(u.currency, 'PYG') AS currency,
            COALESCE(u.is_active, true) AS is_active,
            COALESCE(lease_data.active_monthly_rent, u.base_price_monthly, 0)::float8 AS rent_amount,
            COALESCE(lease_data.active_lease_count, 0) AS active_lease_count,
            COALESCE(lease_data.ending_soon_count, 0) AS ending_soon_count,
            COALESCE(task_counts.open_tasks, 0) AS open_tasks,
            COALESCE(task_counts.urgent_tasks, 0) AS urgent_tasks,
            COALESCE(collection_counts.overdue_collections, 0) AS overdue_collections
         FROM units u
         JOIN properties p ON p.id = u.property_id
         LEFT JOIN (
            SELECT
              l.unit_id,
              COUNT(*) FILTER (WHERE lower(COALESCE(l.lease_status::text, '')) = 'active') AS active_lease_count,
              COUNT(*) FILTER (
                WHERE lower(COALESCE(l.lease_status::text, '')) = 'active'
                  AND l.ends_on IS NOT NULL
                  AND l.ends_on <= current_date + 30
              ) AS ending_soon_count,
              COALESCE(MAX(
                CASE WHEN lower(COALESCE(l.lease_status::text, '')) = 'active'
                  THEN COALESCE(l.monthly_rent, 0)
                  ELSE NULL
                END
              ), 0)::float8 AS active_monthly_rent
            FROM leases l
            WHERE l.organization_id = $1::uuid
            GROUP BY l.unit_id
         ) AS lease_data ON lease_data.unit_id = u.id
         LEFT JOIN (
            SELECT
              t.unit_id,
              COUNT(*) FILTER (
                WHERE lower(COALESCE(t.status::text, '')) NOT IN ('done', 'completed', 'cancelled', 'resolved')
              ) AS open_tasks,
              COUNT(*) FILTER (
                WHERE lower(COALESCE(t.status::text, '')) NOT IN ('done', 'completed', 'cancelled', 'resolved')
                  AND (
                    lower(COALESCE(t.priority::text, '')) IN ('critical', 'urgent', 'high')
                    OR (t.due_at IS NOT NULL AND t.due_at < now())
                  )
              ) AS urgent_tasks
            FROM tasks t
            WHERE t.organization_id = $1::uuid
            GROUP BY t.unit_id
         ) AS task_counts ON task_counts.unit_id = u.id
         LEFT JOIN (
            SELECT
              l.unit_id,
              COUNT(*) FILTER (
                WHERE lower(COALESCE(c.status::text, '')) NOT IN ('paid', 'cancelled')
                  AND c.due_date IS NOT NULL
                  AND c.due_date < current_date
              ) AS overdue_collections
            FROM leases l
            JOIN collections c ON c.lease_id = l.id
            WHERE l.organization_id = $1::uuid
            GROUP BY l.unit_id
         ) AS collection_counts ON collection_counts.unit_id = u.id
         WHERE u.organization_id = $1::uuid
           AND ($2::text IS NULL OR u.property_id::text = $2)
           AND (
             $3::text IS NULL
             OR ($3 = 'active' AND COALESCE(u.is_active, true) = true)
             OR ($3 = 'inactive' AND COALESCE(u.is_active, true) = false)
           )
           AND ($4::text IS NULL OR lower(COALESCE(u.unit_type, '')) = $4)
           AND ($5::text IS NULL OR lower(COALESCE(u.condition_status, '')) = $5)
           AND ($6::smallint IS NULL OR u.floor_level = $6)
           AND (
             $7::text IS NULL
             OR lower(concat_ws(' ',
               COALESCE(u.name, ''),
               COALESCE(u.code, ''),
               COALESCE(p.name, '')
             )) LIKE $7
           )",
    )
    .bind(org_id)
    .bind(property_id)
    .bind(status)
    .bind(unit_type)
    .bind(condition_status)
    .bind(floor_level)
    .bind(search)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Internal(format!("portfolio units overview query failed: {e}")))?;

    Ok(rows
        .iter()
        .map(|row| UnitOverviewRow {
            id: row.try_get::<String, _>("id").unwrap_or_default(),
            code: row.try_get::<String, _>("code").unwrap_or_default(),
            name: row.try_get::<String, _>("name").unwrap_or_default(),
            property_id: row.try_get::<String, _>("property_id").unwrap_or_default(),
            property_name: row
                .try_get::<String, _>("property_name")
                .unwrap_or_default(),
            unit_type: row.try_get::<String, _>("unit_type").unwrap_or_default(),
            condition_status: row
                .try_get::<String, _>("condition_status")
                .unwrap_or_default(),
            floor_level: row.try_get::<Option<i16>, _>("floor_level").ok().flatten(),
            bedrooms: row.try_get::<i64, _>("bedrooms").unwrap_or(0),
            bathrooms: row.try_get::<f64, _>("bathrooms").unwrap_or(0.0),
            currency: row
                .try_get::<String, _>("currency")
                .unwrap_or_else(|_| "PYG".to_string()),
            is_active: row.try_get::<bool, _>("is_active").unwrap_or(true),
            rent_amount: row.try_get::<f64, _>("rent_amount").unwrap_or(0.0),
            has_active_lease: row.try_get::<i64, _>("active_lease_count").unwrap_or(0) > 0,
            ending_soon: row.try_get::<i64, _>("ending_soon_count").unwrap_or(0) > 0,
            open_tasks: row.try_get::<i64, _>("open_tasks").unwrap_or(0),
            urgent_tasks: row.try_get::<i64, _>("urgent_tasks").unwrap_or(0),
            overdue_collections: row.try_get::<i64, _>("overdue_collections").unwrap_or(0),
        })
        .collect())
}

async fn portfolio_properties_overview(
    State(state): State<AppState>,
    Query(query): Query<PropertiesOverviewQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;
    let pool = state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database not configured".into()))?;

    let status = normalize_filter(query.status.as_deref());
    let property_type = normalize_filter(query.property_type.as_deref());
    let neighborhood = like_filter(query.neighborhood.as_deref());
    let search = like_filter(query.q.as_deref());
    let mut derived_rows = fetch_property_overview_rows(
        pool,
        &query.org_id,
        status,
        property_type,
        neighborhood,
        search,
    )
    .await?;

    let saved_views = json!([
        { "id": "all", "count": derived_rows.len() as i64 },
        {
            "id": "needs_attention",
            "count": derived_rows
                .iter()
                .filter(|row| property_health(row) != "good")
                .count() as i64
        },
        {
            "id": "vacancy_risk",
            "count": derived_rows
                .iter()
                .filter(|row| row.total_units == 0 || row.occupied_units < row.total_units)
                .count() as i64
        },
        {
            "id": "healthy",
            "count": derived_rows
                .iter()
                .filter(|row| property_health(row) == "good")
                .count() as i64
        }
    ]);

    let health_filter = normalize_property_health(query.health.as_deref());
    let view = normalize_property_view(query.view.as_deref());
    derived_rows.retain(|row| {
        let health = property_health(row);
        let matches_health = health_filter
            .as_deref()
            .map(|value| health == value)
            .unwrap_or(true);
        matches_health && property_matches_view(row, view.as_deref())
    });

    sort_property_rows(&mut derived_rows, query.sort.as_deref());

    let total = derived_rows.len() as i64;
    let limit = clamp_overview_limit(query.limit);
    let offset = clamp_offset(query.offset);
    let paged_rows = derived_rows
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect::<Vec<_>>();

    let occupied_units = paged_rows.iter().map(|row| row.occupied_units).sum::<i64>();
    let total_units = paged_rows.iter().map(|row| row.total_units).sum::<i64>();
    let open_tasks = paged_rows.iter().map(|row| row.open_tasks).sum::<i64>();
    let overdue_collections = paged_rows
        .iter()
        .map(|row| row.overdue_collections)
        .sum::<i64>();
    let monthly_revenue = paged_rows
        .iter()
        .map(|row| row.monthly_revenue)
        .sum::<f64>();

    let payload_rows = paged_rows
        .iter()
        .map(|row| {
            json!({
                "id": row.id,
                "name": row.name,
                "address": if row.address.trim().is_empty() { Value::Null } else { Value::String(row.address.clone()) },
                "status": if row.status.trim().is_empty() { Value::Null } else { Value::String(row.status.clone()) },
                "propertyType": if row.property_type.trim().is_empty() { Value::Null } else { Value::String(row.property_type.clone()) },
                "occupiedUnits": row.occupied_units,
                "totalUnits": row.total_units,
                "openTasks": row.open_tasks,
                "collectionsRisk": property_collections_risk(row),
                "health": property_health(row),
                "primaryHref": format!("/module/properties/{}", row.id),
                "unitsHref": format!("/module/units?property_id={}", row.id),
                "city": if row.city.trim().is_empty() { Value::Null } else { Value::String(row.city.clone()) },
                "monthlyRevenue": round_currency(row.monthly_revenue),
            })
        })
        .collect::<Vec<_>>();

    Ok(Json(json!({
        "rows": payload_rows,
        "summary": {
            "totalProperties": payload_rows.len() as i64,
            "totalUnits": total_units,
            "occupiedUnits": occupied_units,
            "vacantUnits": (total_units - occupied_units).max(0),
            "occupancyRate": percentage(occupied_units, total_units),
            "openTasks": open_tasks,
            "overdueCollections": overdue_collections,
            "monthlyRevenue": round_currency(monthly_revenue),
        },
        "savedViews": saved_views,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "hasMore": offset + limit < total,
        }
    })))
}

async fn portfolio_units_overview(
    State(state): State<AppState>,
    Query(query): Query<UnitsOverviewQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;
    let pool = state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database not configured".into()))?;

    let search = like_filter(query.q.as_deref());
    let property_id = normalize_filter(query.property_id.as_deref());
    let status = normalize_filter(query.status.as_deref());
    let unit_type = normalize_filter(query.unit_type.as_deref());
    let condition_status = normalize_filter(query.condition_status.as_deref());
    let mut derived_rows = fetch_unit_overview_rows(
        pool,
        &query.org_id,
        property_id,
        status,
        unit_type,
        condition_status,
        query.floor_level,
        search,
    )
    .await?;

    let saved_views = json!([
        { "id": "all", "count": derived_rows.len() as i64 },
        {
            "id": "vacant",
            "count": derived_rows.iter().filter(|row| unit_lease_state(row) == "vacant").count() as i64
        },
        {
            "id": "needs_turn",
            "count": derived_rows.iter().filter(|row| unit_maintenance_risk(row) != "none").count() as i64
        },
        {
            "id": "lease_risk",
            "count": derived_rows.iter().filter(|row| row.ending_soon || row.overdue_collections > 0).count() as i64
        }
    ]);

    let view = normalize_unit_view(query.view.as_deref());
    derived_rows.retain(|row| unit_matches_view(row, view.as_deref()));
    sort_unit_rows(&mut derived_rows, query.sort.as_deref());

    let total = derived_rows.len() as i64;
    let limit = clamp_overview_limit(query.limit);
    let offset = clamp_offset(query.offset);
    let paged_rows = derived_rows
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect::<Vec<_>>();

    let property_facets = {
        let mut counts = std::collections::BTreeMap::<String, (String, i64)>::new();
        for row in &paged_rows {
            let entry = counts
                .entry(row.property_id.clone())
                .or_insert_with(|| (row.property_name.clone(), 0));
            entry.1 += 1;
        }
        counts
            .into_iter()
            .map(|(id, (name, count))| {
                json!({
                    "id": id,
                    "name": name,
                    "count": count,
                })
            })
            .collect::<Vec<_>>()
    };

    let rent_sum = paged_rows.iter().map(|row| row.rent_amount).sum::<f64>();
    let payload_rows = paged_rows
        .iter()
        .map(|row| {
            json!({
                "id": row.id,
                "code": row.code,
                "name": if row.name.trim().is_empty() { Value::Null } else { Value::String(row.name.clone()) },
                "propertyId": row.property_id,
                "propertyName": row.property_name,
                "status": if row.is_active { "active" } else { "inactive" },
                "unitType": if row.unit_type.trim().is_empty() { Value::Null } else { Value::String(row.unit_type.clone()) },
                "conditionStatus": if row.condition_status.trim().is_empty() { Value::Null } else { Value::String(row.condition_status.clone()) },
                "floorLevel": row.floor_level,
                "bedrooms": row.bedrooms,
                "bathrooms": round_currency(row.bathrooms),
                "rentAmount": round_currency(row.rent_amount),
                "currency": row.currency,
                "leaseState": unit_lease_state(row),
                "maintenanceRisk": unit_maintenance_risk(row),
                "primaryHref": format!("/module/units/{}", row.id),
                "propertyHref": format!("/module/properties/{}", row.property_id),
            })
        })
        .collect::<Vec<_>>();

    Ok(Json(json!({
        "rows": payload_rows,
        "summary": {
            "totalUnits": payload_rows.len() as i64,
            "vacantUnits": paged_rows.iter().filter(|row| unit_lease_state(row) == "vacant").count() as i64,
            "endingSoonUnits": paged_rows.iter().filter(|row| row.ending_soon).count() as i64,
            "highRiskUnits": paged_rows.iter().filter(|row| unit_maintenance_risk(row) == "high").count() as i64,
            "averageRent": if paged_rows.is_empty() { 0.0 } else { round_currency(rent_sum / paged_rows.len() as f64) },
        },
        "savedViews": saved_views,
        "facets": {
            "properties": property_facets,
        },
        "bulkUpdate": {
            "supportedPatchFields": [
                "condition_status",
                "floor_level",
                "unit_type",
                "base_price_monthly",
                "is_active"
            ]
        },
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "hasMore": offset + limit < total,
        }
    })))
}

async fn portfolio_property_overview(
    State(state): State<AppState>,
    Path(path): Path<PortfolioPropertyPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database not configured".into()))?;

    let property = get_row(pool, "properties", &path.property_id, "id").await?;
    let org_id = value_str(&property, "organization_id");
    assert_org_member(&state, &user_id, &org_id).await?;

    let hierarchy_filters = json_map(&[
        ("organization_id", Value::String(org_id.clone())),
        ("property_id", Value::String(path.property_id.clone())),
    ]);

    let (floors, units, spaces, beds, tasks, leases, reservations, expenses, owner_statements) = tokio::try_join!(
        list_rows(
            pool,
            "property_floors",
            Some(&hierarchy_filters),
            5_000,
            0,
            "created_at",
            true
        ),
        list_rows(
            pool,
            "units",
            Some(&hierarchy_filters),
            10_000,
            0,
            "created_at",
            true
        ),
        list_rows(
            pool,
            "unit_spaces",
            Some(&hierarchy_filters),
            20_000,
            0,
            "created_at",
            true
        ),
        list_rows(
            pool,
            "unit_beds",
            Some(&hierarchy_filters),
            30_000,
            0,
            "created_at",
            true
        ),
        list_rows(
            pool,
            "tasks",
            Some(&hierarchy_filters),
            500,
            0,
            "created_at",
            true
        ),
        list_rows(
            pool,
            "leases",
            Some(&hierarchy_filters),
            500,
            0,
            "created_at",
            true
        ),
        list_rows(
            pool,
            "reservations",
            Some(&hierarchy_filters),
            300,
            0,
            "created_at",
            true
        ),
        list_rows(
            pool,
            "expenses",
            Some(&hierarchy_filters),
            300,
            0,
            "created_at",
            true
        ),
        list_rows(
            pool,
            "owner_statements",
            Some(&hierarchy_filters),
            120,
            0,
            "created_at",
            true
        ),
    )?;

    let hierarchy = build_property_hierarchy(property.clone(), floors, units.clone(), spaces, beds);

    let collection_rows = sqlx::query(
        "SELECT
            c.id::text AS id,
            COALESCE(c.status::text, '') AS status,
            COALESCE(c.amount, 0)::float8 AS amount,
            COALESCE(c.currency, 'PYG') AS currency,
            COALESCE(c.due_date::text, '') AS due_date,
            COALESCE(c.created_at::text, '') AS created_at,
            COALESCE(l.unit_id::text, '') AS unit_id
         FROM collections c
         JOIN leases l ON l.id = c.lease_id
         WHERE l.property_id = $1::uuid",
    )
    .bind(&path.property_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Internal(format!("portfolio property collections query failed: {e}")))?;

    let active_leases = leases
        .iter()
        .filter(|lease| normalized_status(value_str(lease, "lease_status")) == "active")
        .collect::<Vec<_>>();
    let open_tasks = tasks
        .iter()
        .filter(|task| !is_closed_task(value_str(task, "status")))
        .collect::<Vec<_>>();
    let overdue_collections = collection_rows
        .iter()
        .filter(|row| {
            let status = row.try_get::<String, _>("status").unwrap_or_default();
            let due_date = row.try_get::<String, _>("due_date").unwrap_or_default();
            !matches!(status.to_lowercase().as_str(), "paid" | "cancelled")
                && due_date < current_date_key()
        })
        .count() as i64;

    let occupied_unit_ids = active_leases
        .iter()
        .filter_map(|lease| value_opt_str(lease, "unit_id"))
        .collect::<std::collections::HashSet<_>>();

    let mut task_count_by_unit = std::collections::HashMap::<String, i64>::new();
    let mut urgent_task_count_by_unit = std::collections::HashMap::<String, i64>::new();
    for task in &open_tasks {
        if let Some(unit_id) = value_opt_str(task, "unit_id") {
            *task_count_by_unit.entry(unit_id.clone()).or_default() += 1;
            if is_urgent_task(task) {
                *urgent_task_count_by_unit.entry(unit_id).or_default() += 1;
            }
        }
    }

    let mut overdue_collections_by_unit = std::collections::HashMap::<String, i64>::new();
    for row in &collection_rows {
        let status = row.try_get::<String, _>("status").unwrap_or_default();
        let due_date = row.try_get::<String, _>("due_date").unwrap_or_default();
        if matches!(status.to_lowercase().as_str(), "paid" | "cancelled")
            || due_date >= current_date_key()
        {
            continue;
        }
        let unit_id = row.try_get::<String, _>("unit_id").unwrap_or_default();
        if !unit_id.is_empty() {
            *overdue_collections_by_unit.entry(unit_id).or_default() += 1;
        }
    }

    let linked_units = units
        .iter()
        .map(|unit| {
            let unit_id = value_str(unit, "id");
            let lease_state = if occupied_unit_ids.contains(&unit_id) {
                "occupied"
            } else {
                "vacant"
            };
            let maintenance_risk = if urgent_task_count_by_unit.get(&unit_id).copied().unwrap_or(0) > 0 {
                "high"
            } else if task_count_by_unit.get(&unit_id).copied().unwrap_or(0) > 0 {
                "watch"
            } else {
                "none"
            };
            json!({
                "id": unit_id,
                "code": value_str(unit, "code"),
                "name": value_opt_str(unit, "name"),
                "conditionStatus": value_opt_str(unit, "condition_status"),
                "floorLevel": value_opt_i64(unit, "floor_level"),
                "leaseState": lease_state,
                "maintenanceRisk": maintenance_risk,
                "openTasks": task_count_by_unit.get(&value_str(unit, "id")).copied().unwrap_or(0),
                "overdueCollections": overdue_collections_by_unit.get(&value_str(unit, "id")).copied().unwrap_or(0),
                "href": format!("/module/units/{}", value_str(unit, "id")),
            })
        })
        .collect::<Vec<_>>();

    let total_units = linked_units.len() as i64;
    let occupied_units = occupied_unit_ids.len() as i64;
    let monthly_revenue = active_leases
        .iter()
        .map(|lease| value_f64(lease, "monthly_rent"))
        .sum::<f64>();
    let monthly_expenses = expenses
        .iter()
        .map(|expense| value_f64(expense, "amount"))
        .sum::<f64>();

    let recent_activity = build_property_recent_activity(
        &tasks,
        &leases,
        &reservations,
        &owner_statements,
        &collection_rows,
    );

    Ok(Json(json!({
        "property": property,
        "summary": {
            "totalUnits": total_units,
            "occupiedUnits": occupied_units,
            "vacantUnits": (total_units - occupied_units).max(0),
            "occupancyRate": percentage(occupied_units, total_units),
            "openTasks": open_tasks.len() as i64,
            "urgentTasks": open_tasks.iter().filter(|task| is_urgent_task(task)).count() as i64,
            "activeLeases": active_leases.len() as i64,
            "activeReservations": reservations
                .iter()
                .filter(|reservation| matches!(normalized_status(value_str(reservation, "status")).as_str(), "pending" | "confirmed" | "checked_in"))
                .count() as i64,
            "overdueCollections": overdue_collections,
            "monthlyRevenue": round_currency(monthly_revenue),
            "monthlyExpenses": round_currency(monthly_expenses),
            "health": property_health_from_metrics(
                open_tasks.iter().filter(|task| is_urgent_task(task)).count() as i64,
                open_tasks.len() as i64,
                overdue_collections,
                occupied_units,
                total_units,
            ),
        },
        "hierarchy": hierarchy,
        "linkedUnits": linked_units,
        "recentActivity": recent_activity,
    })))
}

async fn portfolio_unit_overview(
    State(state): State<AppState>,
    Path(path): Path<PortfolioUnitPath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database not configured".into()))?;

    let unit = get_row(pool, "units", &path.unit_id, "id").await?;
    let org_id = value_str(&unit, "organization_id");
    assert_org_member(&state, &user_id, &org_id).await?;

    let property_id = value_str(&unit, "property_id");
    let property = get_row(pool, "properties", &property_id, "id").await?;
    let unit_filters = json_map(&[
        ("organization_id", Value::String(org_id.clone())),
        ("property_id", Value::String(property_id.clone())),
    ]);

    let sibling_units = list_rows(
        pool,
        "units",
        Some(&unit_filters),
        500,
        0,
        "created_at",
        true,
    )
    .await?;
    let open_tasks = list_rows(
        pool,
        "tasks",
        Some(&json_map(&[
            ("organization_id", Value::String(org_id.clone())),
            ("unit_id", Value::String(path.unit_id.clone())),
        ])),
        100,
        0,
        "created_at",
        true,
    )
    .await?;

    let active_lease_row = sqlx::query(
        "SELECT
            l.id::text AS id,
            COALESCE(l.tenant_full_name, '') AS tenant_full_name,
            COALESCE(l.monthly_rent, 0)::float8 AS monthly_rent,
            COALESCE(l.currency, 'PYG') AS currency,
            COALESCE(l.ends_on::text, '') AS ends_on
         FROM leases l
         WHERE l.unit_id = $1::uuid
           AND lower(COALESCE(l.lease_status::text, '')) = 'active'
         ORDER BY l.ends_on ASC NULLS LAST, l.created_at DESC
         LIMIT 1",
    )
    .bind(&path.unit_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Internal(format!("portfolio unit lease query failed: {e}")))?;

    let upcoming_reservations = sqlx::query(
        "SELECT
            r.id::text AS id,
            COALESCE(r.status::text, '') AS status,
            COALESCE(r.check_in_date::text, '') AS check_in_date,
            COALESCE(r.check_out_date::text, '') AS check_out_date,
            COALESCE(r.total_amount, 0)::float8 AS total_amount,
            COALESCE(r.currency, 'PYG') AS currency
         FROM reservations r
         WHERE r.unit_id = $1::uuid
           AND r.check_out_date >= current_date
         ORDER BY r.check_in_date ASC
         LIMIT 5",
    )
    .bind(&path.unit_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Internal(format!("portfolio unit reservations query failed: {e}")))?;

    let collection_rows = sqlx::query(
        "SELECT
            COALESCE(c.status::text, '') AS status,
            COALESCE(c.due_date::text, '') AS due_date
         FROM collections c
         JOIN leases l ON l.id = c.lease_id
         WHERE l.unit_id = $1::uuid",
    )
    .bind(&path.unit_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Internal(format!("portfolio unit collections query failed: {e}")))?;

    let total_units = sibling_units.len() as i64;
    let occupied_units = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*)::bigint
         FROM leases
         WHERE property_id = $1::uuid
           AND lower(COALESCE(lease_status::text, '')) = 'active'",
    )
    .bind(&property_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let overdue_collections = collection_rows
        .iter()
        .filter(|row| {
            let status = row.try_get::<String, _>("status").unwrap_or_default();
            let due_date = row.try_get::<String, _>("due_date").unwrap_or_default();
            !matches!(status.to_lowercase().as_str(), "paid" | "cancelled")
                && due_date < current_date_key()
        })
        .count() as i64;

    let active_lease = active_lease_row.map(|row| {
        json!({
            "id": row.try_get::<String, _>("id").unwrap_or_default(),
            "tenantName": row.try_get::<String, _>("tenant_full_name").unwrap_or_default(),
            "monthlyRent": round_currency(row.try_get::<f64, _>("monthly_rent").unwrap_or(0.0)),
            "currency": row.try_get::<String, _>("currency").unwrap_or_else(|_| "PYG".to_string()),
            "endsOn": empty_string_to_null(row.try_get::<String, _>("ends_on").unwrap_or_default()),
            "href": format!("/module/leases/{}", row.try_get::<String, _>("id").unwrap_or_default()),
        })
    });

    let siblings = sibling_units
        .iter()
        .map(|sibling| {
            let sibling_id = value_str(sibling, "id");
            let ending_soon = false;
            let lease_state = if sibling_id == path.unit_id {
                if active_lease.is_some() {
                    "active"
                } else {
                    "vacant"
                }
            } else {
                "vacant"
            };
            json!({
                "id": sibling_id,
                "code": value_str(sibling, "code"),
                "name": value_opt_str(sibling, "name"),
                "leaseState": if ending_soon { "ending_soon" } else { lease_state },
                "conditionStatus": value_opt_str(sibling, "condition_status"),
                "primaryHref": format!("/module/units/{}", value_str(sibling, "id")),
            })
        })
        .collect::<Vec<_>>();

    Ok(Json(json!({
        "unit": unit,
        "summary": {
            "leaseState": if active_lease.is_some() { "active" } else { "vacant" },
            "maintenanceRisk": if open_tasks.iter().filter(|task| is_urgent_task(task)).count() > 0 {
                "high"
            } else if !open_tasks.is_empty() || normalized_status(value_str(&unit, "condition_status")) != "clean" {
                "watch"
            } else {
                "none"
            },
            "openTasks": open_tasks.len() as i64,
            "overdueCollections": overdue_collections,
        },
        "parentProperty": {
            "id": property_id,
            "name": value_str(&property, "name"),
            "address": empty_string_to_null(value_str(&property, "address_line1")),
            "status": empty_string_to_null(value_str(&property, "status")),
            "totalUnits": total_units,
            "occupiedUnits": occupied_units,
            "href": format!("/module/properties/{}", value_str(&property, "id")),
            "unitsHref": format!("/module/units?property_id={}", value_str(&property, "id")),
        },
        "siblings": siblings,
        "activeLease": active_lease,
        "upcomingReservations": upcoming_reservations
            .iter()
            .map(|row| json!({
                "id": row.try_get::<String, _>("id").unwrap_or_default(),
                "status": row.try_get::<String, _>("status").unwrap_or_default(),
                "checkInDate": empty_string_to_null(row.try_get::<String, _>("check_in_date").unwrap_or_default()),
                "checkOutDate": empty_string_to_null(row.try_get::<String, _>("check_out_date").unwrap_or_default()),
                "totalAmount": round_currency(row.try_get::<f64, _>("total_amount").unwrap_or(0.0)),
                "currency": row.try_get::<String, _>("currency").unwrap_or_else(|_| "PYG".to_string()),
                "href": format!("/module/reservations/{}", row.try_get::<String, _>("id").unwrap_or_default()),
            }))
            .collect::<Vec<_>>(),
        "openTasks": open_tasks
            .iter()
            .map(|task| json!({
                "id": value_str(task, "id"),
                "title": value_opt_str(task, "title"),
                "status": value_opt_str(task, "status"),
                "priority": value_opt_str(task, "priority"),
                "href": format!("/module/tasks/{}", value_str(task, "id")),
            }))
            .collect::<Vec<_>>(),
    })))
}

fn normalize_filter(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.to_ascii_lowercase())
}

fn like_filter(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| format!("%{}%", value.to_ascii_lowercase()))
}

fn normalize_property_health(value: Option<&str>) -> Option<String> {
    match value
        .map(str::trim)
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "good" | "stable" => Some("good".to_string()),
        "watch" => Some("watch".to_string()),
        "critical" => Some("critical".to_string()),
        _ => None,
    }
}

fn normalize_property_view(value: Option<&str>) -> Option<String> {
    match value
        .map(str::trim)
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "all" => None,
        "needs_attention" => Some("needs_attention".to_string()),
        "vacancy_risk" => Some("vacancy_risk".to_string()),
        "healthy" => Some("healthy".to_string()),
        _ => None,
    }
}

fn normalize_unit_view(value: Option<&str>) -> Option<String> {
    match value
        .map(str::trim)
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "all" => None,
        "vacant" => Some("vacant".to_string()),
        "needs_turn" => Some("needs_turn".to_string()),
        "lease_risk" => Some("lease_risk".to_string()),
        _ => None,
    }
}

fn property_collections_risk(row: &PropertyOverviewRow) -> &'static str {
    if row.overdue_collections > 0 {
        "high"
    } else if row.open_collections > 0 {
        "watch"
    } else {
        "none"
    }
}

fn property_health(row: &PropertyOverviewRow) -> &'static str {
    property_health_from_metrics(
        row.urgent_tasks,
        row.open_tasks,
        row.overdue_collections,
        row.occupied_units,
        row.total_units,
    )
}

fn property_health_from_metrics(
    urgent_tasks: i64,
    open_tasks: i64,
    overdue_collections: i64,
    occupied_units: i64,
    total_units: i64,
) -> &'static str {
    if overdue_collections > 0 || urgent_tasks > 0 {
        "critical"
    } else if open_tasks > 0 || total_units == 0 || occupied_units < total_units {
        "watch"
    } else {
        "good"
    }
}

fn property_matches_view(row: &PropertyOverviewRow, view: Option<&str>) -> bool {
    match view {
        Some("needs_attention") => property_health(row) != "good",
        Some("vacancy_risk") => row.total_units == 0 || row.occupied_units < row.total_units,
        Some("healthy") => property_health(row) == "good",
        _ => true,
    }
}

fn sort_property_rows(rows: &mut [PropertyOverviewRow], sort: Option<&str>) {
    match sort.unwrap_or("health_desc") {
        "name_asc" => {
            rows.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
        }
        "name_desc" => {
            rows.sort_by(|left, right| right.name.to_lowercase().cmp(&left.name.to_lowercase()))
        }
        "units_desc" => rows.sort_by(|left, right| right.total_units.cmp(&left.total_units)),
        "revenue_desc" => rows.sort_by(|left, right| {
            right
                .monthly_revenue
                .partial_cmp(&left.monthly_revenue)
                .unwrap_or(std::cmp::Ordering::Equal)
        }),
        "tasks_desc" => rows.sort_by(|left, right| right.open_tasks.cmp(&left.open_tasks)),
        _ => rows.sort_by(|left, right| {
            property_health_rank(right)
                .cmp(&property_health_rank(left))
                .then_with(|| right.overdue_collections.cmp(&left.overdue_collections))
                .then_with(|| right.open_tasks.cmp(&left.open_tasks))
                .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
        }),
    }
}

fn property_health_rank(row: &PropertyOverviewRow) -> i32 {
    match property_health(row) {
        "critical" => 3,
        "watch" => 2,
        _ => 1,
    }
}

fn unit_lease_state(row: &UnitOverviewRow) -> &'static str {
    if row.has_active_lease && row.ending_soon {
        "ending_soon"
    } else if row.has_active_lease {
        "active"
    } else {
        "vacant"
    }
}

fn unit_maintenance_risk(row: &UnitOverviewRow) -> &'static str {
    if matches!(row.condition_status.as_str(), "out_of_order" | "dirty") || row.urgent_tasks > 0 {
        "high"
    } else if row.open_tasks > 0 || row.condition_status == "inspecting" {
        "watch"
    } else {
        "none"
    }
}

fn unit_matches_view(row: &UnitOverviewRow, view: Option<&str>) -> bool {
    match view {
        Some("vacant") => unit_lease_state(row) == "vacant",
        Some("needs_turn") => unit_maintenance_risk(row) != "none",
        Some("lease_risk") => row.ending_soon || row.overdue_collections > 0,
        _ => true,
    }
}

fn sort_unit_rows(rows: &mut [UnitOverviewRow], sort: Option<&str>) {
    match sort.unwrap_or("risk_desc") {
        "property_asc" => rows.sort_by(|left, right| {
            left.property_name
                .to_lowercase()
                .cmp(&right.property_name.to_lowercase())
                .then_with(|| left.code.to_lowercase().cmp(&right.code.to_lowercase()))
        }),
        "code_asc" => {
            rows.sort_by(|left, right| left.code.to_lowercase().cmp(&right.code.to_lowercase()))
        }
        "rent_desc" => rows.sort_by(|left, right| {
            right
                .rent_amount
                .partial_cmp(&left.rent_amount)
                .unwrap_or(std::cmp::Ordering::Equal)
        }),
        _ => rows.sort_by(|left, right| {
            unit_risk_rank(right)
                .cmp(&unit_risk_rank(left))
                .then_with(|| bool_rank(right.ending_soon).cmp(&bool_rank(left.ending_soon)))
                .then_with(|| {
                    left.property_name
                        .to_lowercase()
                        .cmp(&right.property_name.to_lowercase())
                })
                .then_with(|| left.code.to_lowercase().cmp(&right.code.to_lowercase()))
        }),
    }
}

fn unit_risk_rank(row: &UnitOverviewRow) -> i32 {
    match unit_maintenance_risk(row) {
        "high" => 3,
        "watch" => 2,
        _ => 1,
    }
}

fn bool_rank(value: bool) -> i32 {
    if value {
        1
    } else {
        0
    }
}

fn attention_rank(value: &str) -> i32 {
    match value {
        "high" => 3,
        "medium" => 2,
        "low" => 1,
        _ => 0,
    }
}

fn percent_change(current: f64, baseline: f64) -> Value {
    if baseline.abs() < f64::EPSILON {
        Value::Null
    } else {
        json!(round_currency(((current - baseline) / baseline) * 100.0))
    }
}

fn round_currency(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn percentage(numerator: i64, denominator: i64) -> f64 {
    if denominator <= 0 {
        0.0
    } else {
        ((numerator as f64 / denominator as f64) * 1000.0).round() / 10.0
    }
}

fn json_map(entries: &[(&str, Value)]) -> Map<String, Value> {
    let mut map = Map::with_capacity(entries.len());
    for (key, value) in entries {
        map.insert((*key).to_string(), value.clone());
    }
    map
}

fn normalized_status(value: String) -> String {
    value.trim().to_ascii_lowercase()
}

fn value_str(value: &Value, key: &str) -> String {
    value
        .as_object()
        .and_then(|object| object.get(key))
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default()
        .to_string()
}

fn value_opt_str(value: &Value, key: &str) -> Option<String> {
    let raw = value_str(value, key);
    if raw.is_empty() {
        None
    } else {
        Some(raw)
    }
}

fn value_opt_i64(value: &Value, key: &str) -> Option<i64> {
    value
        .as_object()
        .and_then(|object| object.get(key))
        .and_then(|raw| match raw {
            Value::Number(number) => number.as_i64(),
            Value::String(text) => text.parse::<i64>().ok(),
            _ => None,
        })
}

fn value_f64(value: &Value, key: &str) -> f64 {
    value
        .as_object()
        .and_then(|object| object.get(key))
        .and_then(|raw| match raw {
            Value::Number(number) => number.as_f64(),
            Value::String(text) => text.parse::<f64>().ok(),
            _ => None,
        })
        .unwrap_or(0.0)
}

fn is_closed_task(status: String) -> bool {
    matches!(
        normalized_status(status).as_str(),
        "done" | "completed" | "cancelled" | "resolved"
    )
}

fn is_urgent_task(task: &Value) -> bool {
    matches!(
        normalized_status(value_str(task, "priority")).as_str(),
        "critical" | "urgent" | "high"
    ) || value_opt_str(task, "due_at")
        .map(|due_at| due_at < now_timestamp_key())
        .unwrap_or(false)
}

fn current_date_key() -> String {
    chrono::Utc::now().date_naive().to_string()
}

fn now_timestamp_key() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn empty_string_to_null(value: String) -> Value {
    if value.trim().is_empty() {
        Value::Null
    } else {
        Value::String(value)
    }
}

fn build_property_recent_activity(
    tasks: &[Value],
    leases: &[Value],
    reservations: &[Value],
    owner_statements: &[Value],
    collections: &[sqlx::postgres::PgRow],
) -> Vec<Value> {
    let mut activity = Vec::new();

    for task in tasks.iter().take(6) {
        let id = value_str(task, "id");
        if id.is_empty() {
            continue;
        }
        activity.push(json!({
            "id": format!("task:{id}"),
            "kind": "task",
            "title": value_opt_str(task, "title"),
            "meta": value_opt_str(task, "status"),
            "createdAt": empty_string_to_null(value_str(task, "updated_at")),
            "href": format!("/module/tasks/{id}"),
        }));
    }

    for lease in leases.iter().take(4) {
        let id = value_str(lease, "id");
        if id.is_empty() {
            continue;
        }
        activity.push(json!({
            "id": format!("lease:{id}"),
            "kind": "lease",
            "title": value_opt_str(lease, "tenant_full_name"),
            "meta": value_opt_str(lease, "lease_status"),
            "createdAt": empty_string_to_null(value_str(lease, "updated_at")),
            "href": format!("/module/leases/{id}"),
        }));
    }

    for reservation in reservations.iter().take(4) {
        let id = value_str(reservation, "id");
        if id.is_empty() {
            continue;
        }
        activity.push(json!({
            "id": format!("reservation:{id}"),
            "kind": "reservation",
            "title": value_opt_str(reservation, "status"),
            "meta": empty_string_to_null(value_str(reservation, "check_in_date")),
            "createdAt": empty_string_to_null(value_str(reservation, "updated_at")),
            "href": format!("/module/reservations/{id}"),
        }));
    }

    for statement in owner_statements.iter().take(2) {
        let id = value_str(statement, "id");
        if id.is_empty() {
            continue;
        }
        activity.push(json!({
            "id": format!("statement:{id}"),
            "kind": "owner_statement",
            "title": value_opt_str(statement, "status"),
            "meta": empty_string_to_null(value_str(statement, "period_end")),
            "createdAt": empty_string_to_null(value_str(statement, "updated_at")),
            "href": format!("/module/owner-statements/{id}"),
        }));
    }

    for row in collections.iter().take(4) {
        let id = row.try_get::<String, _>("id").unwrap_or_default();
        if id.is_empty() {
            continue;
        }
        activity.push(json!({
            "id": format!("collection:{id}"),
            "kind": "collection",
            "title": row.try_get::<String, _>("status").unwrap_or_default(),
            "meta": empty_string_to_null(row.try_get::<String, _>("due_date").unwrap_or_default()),
            "createdAt": empty_string_to_null(row.try_get::<String, _>("created_at").unwrap_or_default()),
            "href": format!("/module/collections/{id}"),
        }));
    }

    activity.sort_by(|left, right| {
        let left_key = left
            .get("createdAt")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        let right_key = right
            .get("createdAt")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        right_key.cmp(&left_key)
    });
    activity.into_iter().take(8).collect()
}
