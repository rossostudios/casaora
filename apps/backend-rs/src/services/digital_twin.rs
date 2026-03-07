use chrono::Datelike;
use serde_json::{json, Map, Value};
use sqlx::Row;

use crate::{
    error::{AppError, AppResult},
    state::AppState,
};

fn db_pool(state: &AppState) -> AppResult<&sqlx::PgPool> {
    state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database is not configured.".to_string()))
}

// ---------------------------------------------------------------------------
// refresh_property_state — aggregate live metrics into property_state row
// ---------------------------------------------------------------------------

pub async fn refresh_property_state(pool: &sqlx::PgPool, org_id: &str, property_id: &str) {
    // 1. Occupancy: % of unit-nights occupied in the next 30 days
    let occupancy_rate: f64 = sqlx::query_scalar(
        "WITH unit_count AS (
           SELECT COUNT(*)::float8 AS total FROM units
           WHERE organization_id = $1::uuid AND property_id = $2::uuid AND is_active = true
         ),
         booked AS (
           SELECT COUNT(DISTINCT (r.unit_id, d.d))::float8 AS nights
           FROM reservations r
           CROSS JOIN LATERAL generate_series(
             GREATEST(r.check_in::date, CURRENT_DATE),
             LEAST(r.check_out::date, CURRENT_DATE + 30) - 1,
             '1 day'::interval
           ) AS d(d)
           WHERE r.organization_id = $1::uuid
             AND r.unit_id IN (SELECT id FROM units WHERE property_id = $2::uuid)
             AND r.status IN ('confirmed','checked_in')
             AND r.check_out > CURRENT_DATE
             AND r.check_in < CURRENT_DATE + 30
         )
         SELECT CASE WHEN uc.total > 0
                     THEN LEAST(b.nights / (uc.total * 30.0), 1.0)
                     ELSE 0 END
         FROM unit_count uc, booked b",
    )
    .bind(org_id)
    .bind(property_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    // 2. Average daily rate (last 90 days)
    let avg_daily_rate: f64 = sqlx::query_scalar(
        "SELECT COALESCE(AVG(r.nightly_rate), 0)::float8
         FROM reservations r
         JOIN units u ON u.id = r.unit_id
         WHERE r.organization_id = $1::uuid
           AND u.property_id = $2::uuid
           AND r.status IN ('confirmed','checked_in','checked_out')
           AND r.check_in >= CURRENT_DATE - 90",
    )
    .bind(org_id)
    .bind(property_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    // 3. Revenue MTD
    let revenue_mtd: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(r.total_amount), 0)::float8
         FROM reservations r
         JOIN units u ON u.id = r.unit_id
         WHERE r.organization_id = $1::uuid
           AND u.property_id = $2::uuid
           AND r.status IN ('confirmed','checked_in','checked_out')
           AND r.check_in >= date_trunc('month', CURRENT_DATE)",
    )
    .bind(org_id)
    .bind(property_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    // 4. Pending maintenance (critical + high + medium)
    let pending_maintenance: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM maintenance_requests
         WHERE organization_id = $1::uuid AND property_id = $2::uuid
           AND status NOT IN ('completed','closed')",
    )
    .bind(org_id)
    .bind(property_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    // 5. Average review score (last 10 reviews from reservations)
    let avg_review_score: f64 = sqlx::query_scalar(
        "SELECT COALESCE(AVG(r.review_score), 0)::float8
         FROM reservations r
         JOIN units u ON u.id = r.unit_id
         WHERE r.organization_id = $1::uuid
           AND u.property_id = $2::uuid
           AND r.review_score IS NOT NULL
         ORDER BY r.check_out DESC
         LIMIT 10",
    )
    .bind(org_id)
    .bind(property_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    // 6. Guest sentiment score — proxy from recent anomaly alerts
    let guest_sentiment: f64 = sqlx::query_scalar(
        "SELECT CASE WHEN COUNT(*) = 0 THEN 0.7
                ELSE GREATEST(0, 1.0 - COUNT(*) FILTER (WHERE severity IN ('warning','critical'))::float8
                     / GREATEST(COUNT(*), 1)::float8)
                END
         FROM anomaly_alerts
         WHERE organization_id = $1::uuid
           AND alert_type LIKE '%guest%'
           AND detected_at > now() - interval '30 days'
           AND is_dismissed = false",
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0.7);

    // 7. Vendor reliability — % tasks completed on time
    let vendor_reliability: f64 = sqlx::query_scalar(
        "SELECT CASE WHEN COUNT(*) = 0 THEN 0.8
                ELSE COUNT(*) FILTER (WHERE status = 'done' AND (sla_breached_at IS NULL OR sla_breached_at > completed_at))::float8
                     / GREATEST(COUNT(*), 1)::float8
                END
         FROM tasks
         WHERE organization_id = $1::uuid AND property_id = $2::uuid
           AND created_at > now() - interval '90 days'",
    )
    .bind(org_id)
    .bind(property_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0.8);

    // 8. Compute revenue target ratio (MTD actual vs expected)
    let unit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM units WHERE organization_id = $1::uuid AND property_id = $2::uuid AND is_active = true",
    )
    .bind(org_id)
    .bind(property_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let day_of_month = chrono::Utc::now().day() as f64;
    let expected_revenue = if avg_daily_rate > 0.0 && unit_count > 0 {
        avg_daily_rate * unit_count as f64 * day_of_month * 0.7 // 70% target occupancy
    } else {
        1.0 // avoid division by zero
    };
    let revenue_ratio = if expected_revenue > 0.0 {
        (revenue_mtd / expected_revenue).clamp(0.0, 2.0)
    } else {
        0.5
    };

    // 9. Maintenance health (inverse of pending critical issues)
    let critical_maintenance: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM maintenance_requests
         WHERE organization_id = $1::uuid AND property_id = $2::uuid
           AND status NOT IN ('completed','closed')
           AND urgency IN ('high','emergency')",
    )
    .bind(org_id)
    .bind(property_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let maintenance_health = if critical_maintenance == 0 {
        1.0
    } else {
        (1.0 - (critical_maintenance as f64 * 0.2)).clamp(0.0, 1.0)
    };

    // 10. Compute weighted health score (0-100)
    let review_norm = if avg_review_score > 0.0 {
        (avg_review_score / 5.0).clamp(0.0, 1.0)
    } else {
        0.5 // neutral if no reviews
    };

    let health_score = (occupancy_rate * 25.0
        + revenue_ratio * 20.0
        + maintenance_health * 20.0
        + review_norm * 15.0
        + guest_sentiment * 10.0
        + vendor_reliability * 10.0)
        .clamp(0.0, 100.0);

    // 11. Build risk flags
    let mut risk_flags = Vec::new();
    if occupancy_rate < 0.4 {
        risk_flags.push(json!({"type": "low_occupancy", "severity": "warning", "detail": format!("{:.0}% occupied next 30d", occupancy_rate * 100.0)}));
    }
    if critical_maintenance > 2 {
        risk_flags.push(json!({"type": "maintenance_backlog", "severity": "critical", "detail": format!("{critical_maintenance} critical/high tickets open")}));
    }
    if revenue_ratio < 0.5 {
        risk_flags.push(json!({"type": "revenue_below_target", "severity": "warning", "detail": format!("Revenue at {:.0}% of target", revenue_ratio * 100.0)}));
    }
    if avg_review_score > 0.0 && avg_review_score < 3.5 {
        risk_flags.push(json!({"type": "low_reviews", "severity": "warning", "detail": format!("Avg review {avg_review_score:.1}/5")}));
    }

    // 12. Upsert into property_state
    sqlx::query(
        "INSERT INTO property_state (
           organization_id, property_id, health_score, occupancy_rate, avg_daily_rate,
           revenue_mtd, pending_maintenance, avg_review_score, guest_sentiment_score,
           risk_flags, state_snapshot, refreshed_at
         ) VALUES (
           $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, now()
         )
         ON CONFLICT (organization_id, property_id)
         DO UPDATE SET
           health_score = EXCLUDED.health_score,
           occupancy_rate = EXCLUDED.occupancy_rate,
           avg_daily_rate = EXCLUDED.avg_daily_rate,
           revenue_mtd = EXCLUDED.revenue_mtd,
           pending_maintenance = EXCLUDED.pending_maintenance,
           avg_review_score = EXCLUDED.avg_review_score,
           guest_sentiment_score = EXCLUDED.guest_sentiment_score,
           risk_flags = EXCLUDED.risk_flags,
           state_snapshot = EXCLUDED.state_snapshot,
           refreshed_at = now()",
    )
    .bind(org_id)
    .bind(property_id)
    .bind(health_score)
    .bind(occupancy_rate * 100.0) // store as percentage
    .bind(avg_daily_rate)
    .bind(revenue_mtd)
    .bind(pending_maintenance as i32)
    .bind(avg_review_score)
    .bind(guest_sentiment * 100.0) // store as percentage
    .bind(json!(risk_flags))
    .bind(json!({
        "vendor_reliability": (vendor_reliability * 100.0).round() / 100.0,
        "revenue_ratio": (revenue_ratio * 100.0).round() / 100.0,
        "maintenance_health": (maintenance_health * 100.0).round() / 100.0,
        "unit_count": unit_count,
    }))
    .execute(pool)
    .await
    .ok();
}

// ---------------------------------------------------------------------------
// refresh_all_twins — iterate all active properties and refresh their state
// ---------------------------------------------------------------------------

pub async fn refresh_all_twins(pool: &sqlx::PgPool) {
    let properties: Vec<(String, String)> = sqlx::query_as(
        "SELECT p.organization_id::text, p.id::text
         FROM properties p
         JOIN organizations o ON o.id = p.organization_id
         WHERE o.is_active = true AND p.status = 'active'
         LIMIT 500",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let count = properties.len();
    for (org_id, property_id) in &properties {
        refresh_property_state(pool, org_id, property_id).await;
    }

    if count > 0 {
        tracing::info!(
            properties = count,
            "Digital twin: refreshed property states"
        );
    }
}

// ---------------------------------------------------------------------------
// get_property_state — fetch the twin state for API/route use
// ---------------------------------------------------------------------------

pub async fn get_property_state(
    pool: &sqlx::PgPool,
    org_id: &str,
    property_id: &str,
) -> AppResult<Value> {
    let row = sqlx::query(
        "SELECT id::text, organization_id::text, property_id::text,
                health_score::float8, occupancy_rate::float8, avg_daily_rate::float8,
                revenue_mtd::float8, pending_maintenance, avg_review_score::float8,
                guest_sentiment_score::float8, risk_flags, state_snapshot,
                refreshed_at::text, created_at::text
         FROM property_state
         WHERE organization_id = $1::uuid AND property_id = $2::uuid",
    )
    .bind(org_id)
    .bind(property_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to fetch property state");
        AppError::Dependency("Failed to fetch property state.".to_string())
    })?;

    match row {
        Some(r) => Ok(json!({
            "id": r.try_get::<String, _>("id").unwrap_or_default(),
            "organization_id": r.try_get::<String, _>("organization_id").unwrap_or_default(),
            "property_id": r.try_get::<String, _>("property_id").unwrap_or_default(),
            "health_score": r.try_get::<f64, _>("health_score").unwrap_or(0.0),
            "occupancy_rate": r.try_get::<f64, _>("occupancy_rate").unwrap_or(0.0),
            "avg_daily_rate": r.try_get::<f64, _>("avg_daily_rate").unwrap_or(0.0),
            "revenue_mtd": r.try_get::<f64, _>("revenue_mtd").unwrap_or(0.0),
            "pending_maintenance": r.try_get::<i32, _>("pending_maintenance").unwrap_or(0),
            "avg_review_score": r.try_get::<f64, _>("avg_review_score").unwrap_or(0.0),
            "guest_sentiment_score": r.try_get::<f64, _>("guest_sentiment_score").unwrap_or(0.0),
            "risk_flags": r.try_get::<Value, _>("risk_flags").unwrap_or(json!([])),
            "state_snapshot": r.try_get::<Value, _>("state_snapshot").unwrap_or(json!({})),
            "refreshed_at": r.try_get::<String, _>("refreshed_at").unwrap_or_default(),
            "created_at": r.try_get::<String, _>("created_at").unwrap_or_default(),
        })),
        None => Ok(json!({
            "ok": false,
            "error": "No digital twin state found for this property. It will be generated on the next refresh cycle."
        })),
    }
}

// ---------------------------------------------------------------------------
// AI Tool: get_property_twin
// ---------------------------------------------------------------------------

pub async fn tool_get_property_twin(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let property_id = args
        .get("property_id")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default();

    if property_id.is_empty() {
        return Ok(json!({ "ok": false, "error": "property_id is required." }));
    }

    let twin = get_property_state(pool, org_id, property_id).await?;

    // If there's an error field (no twin found), return it
    if twin.get("error").is_some() {
        return Ok(twin);
    }

    Ok(json!({
        "ok": true,
        "twin": twin,
    }))
}

// ---------------------------------------------------------------------------
// AI Tool: simulate_on_twin — what-if analysis using digital twin
// ---------------------------------------------------------------------------

pub async fn tool_simulate_on_twin(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let property_id = args
        .get("property_id")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default();

    if property_id.is_empty() {
        return Ok(json!({ "ok": false, "error": "property_id is required." }));
    }

    let rate_change_pct = args
        .get("rate_change_pct")
        .and_then(Value::as_f64)
        .unwrap_or(0.0)
        .clamp(-50.0, 100.0);

    // Get current twin state
    let twin = get_property_state(pool, org_id, property_id).await?;
    if twin.get("error").is_some() {
        return Ok(json!({ "ok": false, "error": "No twin state available to simulate against." }));
    }

    let current_occ = twin
        .get("occupancy_rate")
        .and_then(Value::as_f64)
        .unwrap_or(0.0)
        / 100.0;
    let current_adr = twin
        .get("avg_daily_rate")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let _current_rev = twin
        .get("revenue_mtd")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);

    // Get elasticity from ML model (or use default)
    let elasticity = crate::services::ml_pipeline::get_active_elasticity(pool, org_id)
        .await
        .unwrap_or(-0.8);

    // Simulate: if rate changes by X%, occupancy changes by elasticity * X%
    let rate_multiplier = 1.0 + rate_change_pct / 100.0;
    let new_adr = current_adr * rate_multiplier;

    let occ_change_pct = elasticity * rate_change_pct;
    let new_occ = (current_occ + current_occ * occ_change_pct / 100.0).clamp(0.0, 1.0);

    // Revenue projection (30-day)
    let unit_count = twin
        .get("state_snapshot")
        .and_then(|s| s.get("unit_count"))
        .and_then(Value::as_i64)
        .unwrap_or(1);

    let projected_revenue_30d = new_adr * new_occ * 30.0 * unit_count as f64;
    let current_revenue_30d = current_adr * current_occ * 30.0 * unit_count as f64;
    let revenue_delta = projected_revenue_30d - current_revenue_30d;
    let revenue_delta_pct = if current_revenue_30d > 0.0 {
        (revenue_delta / current_revenue_30d * 100.0).round()
    } else {
        0.0
    };

    Ok(json!({
        "ok": true,
        "simulation": {
            "rate_change_pct": rate_change_pct,
            "elasticity_used": elasticity,
            "current": {
                "adr": (current_adr * 100.0).round() / 100.0,
                "occupancy_pct": (current_occ * 10000.0).round() / 100.0,
                "projected_revenue_30d": (current_revenue_30d * 100.0).round() / 100.0,
            },
            "simulated": {
                "adr": (new_adr * 100.0).round() / 100.0,
                "occupancy_pct": (new_occ * 10000.0).round() / 100.0,
                "projected_revenue_30d": (projected_revenue_30d * 100.0).round() / 100.0,
            },
            "delta": {
                "revenue_30d": (revenue_delta * 100.0).round() / 100.0,
                "revenue_delta_pct": revenue_delta_pct,
            },
            "note": "Simulation only — no data was modified.",
        }
    }))
}
