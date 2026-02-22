use serde_json::{json, Map, Value};
use sqlx::Row;

use crate::{
    error::{AppError, AppResult},
    state::AppState,
};

fn db_pool(state: &AppState) -> AppResult<&sqlx::PgPool> {
    state.db_pool.as_ref().ok_or_else(|| {
        AppError::Dependency("Database is not configured.".to_string())
    })
}

/// Generate pricing recommendations based on RevPAR/ADR trends and occupancy.
pub async fn tool_generate_pricing_recommendations(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;
    let period_days = args
        .get("period_days")
        .and_then(Value::as_i64)
        .unwrap_or(30)
        .clamp(7, 90);

    // Get current performance metrics
    let metrics = sqlx::query(
        "SELECT
            COUNT(*)::bigint AS total_reservations,
            COALESCE(AVG(nightly_rate), 0)::float8 AS avg_rate,
            COALESCE(SUM(check_out_date - check_in_date), 0)::bigint AS total_nights
         FROM reservations
         WHERE organization_id = $1::uuid
           AND status IN ('confirmed', 'checked_in', 'checked_out')
           AND check_in_date >= current_date - ($2::int || ' days')::interval",
    )
    .bind(org_id)
    .bind(period_days as i32)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Pricing metrics query failed");
        AppError::Dependency("Pricing metrics query failed.".to_string())
    })?;

    let avg_rate = metrics.try_get::<f64, _>("avg_rate").unwrap_or(0.0);
    let total_nights = metrics.try_get::<i64, _>("total_nights").unwrap_or(0);

    let unit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM units WHERE organization_id = $1::uuid AND is_active = true",
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap_or(1)
    .max(1);

    let available_nights = unit_count * period_days;
    let occupancy = if available_nights > 0 {
        total_nights as f64 / available_nights as f64
    } else {
        0.0
    };

    // Generate recommendations per unit with active pricing templates
    let templates = sqlx::query(
        "SELECT pt.id::text, pt.unit_id::text, pt.base_price::float8, u.unit_name
         FROM pricing_templates pt
         JOIN units u ON u.id = pt.unit_id
         WHERE pt.organization_id = $1::uuid AND pt.is_active = true
         ORDER BY u.unit_name
         LIMIT 50",
    )
    .bind(org_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to fetch pricing templates");
        AppError::Dependency("Failed to fetch pricing templates.".to_string())
    })?;

    let mut recommendations = Vec::new();
    for row in &templates {
        let template_id = row.try_get::<String, _>("id").unwrap_or_default();
        let unit_id = row.try_get::<String, _>("unit_id").unwrap_or_default();
        let unit_name = row.try_get::<String, _>("unit_name").unwrap_or_default();
        let current_price = row.try_get::<f64, _>("base_price").unwrap_or(0.0);

        // Simple pricing logic: adjust based on occupancy
        let adjustment_pct = if occupancy > 0.85 {
            10.0 // High demand: increase 10%
        } else if occupancy > 0.70 {
            5.0 // Good demand: increase 5%
        } else if occupancy < 0.40 {
            -10.0 // Low demand: decrease 10%
        } else if occupancy < 0.55 {
            -5.0 // Below average: decrease 5%
        } else {
            0.0 // Stable
        };

        if adjustment_pct.abs() < 0.01 {
            continue;
        }

        let recommended_price = current_price * (1.0 + adjustment_pct / 100.0);
        let reason = if adjustment_pct > 0.0 {
            format!(
                "Occupancy at {:.0}% suggests demand is strong. Recommend {:.0}% increase.",
                occupancy * 100.0,
                adjustment_pct
            )
        } else {
            format!(
                "Occupancy at {:.0}% is below target. Recommend {:.0}% decrease to stimulate bookings.",
                occupancy * 100.0,
                adjustment_pct.abs()
            )
        };

        // Insert recommendation
        let rec = sqlx::query(
            "INSERT INTO pricing_recommendations (
                organization_id, unit_id, pricing_template_id,
                current_price, recommended_price, adjustment_pct, reason, status
             ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, 'pending')
             RETURNING id::text",
        )
        .bind(org_id)
        .bind(&unit_id)
        .bind(&template_id)
        .bind(current_price)
        .bind(recommended_price)
        .bind(adjustment_pct)
        .bind(&reason)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();

        let rec_id = rec
            .and_then(|r| r.try_get::<String, _>("id").ok())
            .unwrap_or_default();

        recommendations.push(json!({
            "recommendation_id": rec_id,
            "unit_id": unit_id,
            "unit_name": unit_name,
            "current_price": (current_price * 100.0).round() / 100.0,
            "recommended_price": (recommended_price * 100.0).round() / 100.0,
            "adjustment_pct": adjustment_pct,
            "reason": reason,
        }));
    }

    Ok(json!({
        "ok": true,
        "period_days": period_days,
        "portfolio_occupancy_pct": (occupancy * 10000.0).round() / 100.0,
        "avg_daily_rate": (avg_rate * 100.0).round() / 100.0,
        "recommendations": recommendations,
        "count": recommendations.len(),
    }))
}

/// Apply a pricing recommendation by updating the pricing template.
pub async fn tool_apply_pricing_recommendation(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let rec_id = args
        .get("recommendation_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if rec_id.is_empty() {
        return Ok(json!({ "ok": false, "error": "recommendation_id is required." }));
    }

    // Fetch recommendation
    let rec = sqlx::query(
        "SELECT pricing_template_id::text, recommended_price::float8
         FROM pricing_recommendations
         WHERE id = $1::uuid AND organization_id = $2::uuid AND status = 'pending'",
    )
    .bind(rec_id)
    .bind(org_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to fetch recommendation");
        AppError::Dependency("Failed to fetch recommendation.".to_string())
    })?;

    let Some(row) = rec else {
        return Ok(json!({ "ok": false, "error": "Recommendation not found or already applied." }));
    };

    let template_id = row
        .try_get::<String, _>("pricing_template_id")
        .unwrap_or_default();
    let new_price = row
        .try_get::<f64, _>("recommended_price")
        .unwrap_or(0.0);

    // Update pricing template
    sqlx::query(
        "UPDATE pricing_templates SET base_price = $3, updated_at = now()
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(&template_id)
    .bind(org_id)
    .bind(new_price)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to update pricing template");
        AppError::Dependency("Failed to update pricing template.".to_string())
    })?;

    // Mark recommendation as applied
    sqlx::query(
        "UPDATE pricing_recommendations
         SET status = 'applied', auto_applied = true, applied_at = now()
         WHERE id = $1::uuid",
    )
    .bind(rec_id)
    .execute(pool)
    .await
    .ok();

    Ok(json!({
        "ok": true,
        "recommendation_id": rec_id,
        "pricing_template_id": template_id,
        "new_price": (new_price * 100.0).round() / 100.0,
        "status": "applied",
    }))
}
