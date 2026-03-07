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

/// Commission rates by booking source (approximate industry averages).
fn channel_commission(source: &str) -> f64 {
    match source.to_lowercase().as_str() {
        "airbnb" => 0.15,
        "booking" | "booking.com" => 0.15,
        "vrbo" | "homeaway" => 0.08,
        "expedia" => 0.12,
        "direct" | "website" | "" => 0.0,
        _ => 0.10, // unknown channel default
    }
}

// ---------------------------------------------------------------------------
// AI Tool: get_channel_performance — per-channel revenue breakdown
// ---------------------------------------------------------------------------

pub async fn tool_get_channel_performance(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let property_id = args
        .get("property_id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let days = args
        .get("days")
        .and_then(Value::as_i64)
        .unwrap_or(90)
        .clamp(7, 365) as i32;

    // Query reservations grouped by source channel
    let rows = if let Some(pid) = property_id {
        sqlx::query(
            "SELECT COALESCE(r.source, 'direct') AS channel,
                    COUNT(*)::int AS booking_count,
                    COALESCE(SUM(r.total_amount), 0)::float8 AS total_revenue,
                    COALESCE(AVG(r.nightly_rate), 0)::float8 AS avg_rate,
                    COALESCE(AVG(r.check_out::date - r.check_in::date), 0)::float8 AS avg_los
             FROM reservations r
             JOIN units u ON u.id = r.unit_id
             WHERE r.organization_id = $1::uuid
               AND u.property_id = $2::uuid
               AND r.status IN ('confirmed','checked_in','checked_out')
               AND r.check_in >= CURRENT_DATE - $3
             GROUP BY COALESCE(r.source, 'direct')
             ORDER BY total_revenue DESC",
        )
        .bind(org_id)
        .bind(pid)
        .bind(days)
        .fetch_all(pool)
        .await
    } else {
        sqlx::query(
            "SELECT COALESCE(r.source, 'direct') AS channel,
                    COUNT(*)::int AS booking_count,
                    COALESCE(SUM(r.total_amount), 0)::float8 AS total_revenue,
                    COALESCE(AVG(r.nightly_rate), 0)::float8 AS avg_rate,
                    COALESCE(AVG(r.check_out::date - r.check_in::date), 0)::float8 AS avg_los
             FROM reservations r
             WHERE r.organization_id = $1::uuid
               AND r.status IN ('confirmed','checked_in','checked_out')
               AND r.check_in >= CURRENT_DATE - $2
             GROUP BY COALESCE(r.source, 'direct')
             ORDER BY total_revenue DESC",
        )
        .bind(org_id)
        .bind(days)
        .fetch_all(pool)
        .await
    }
    .map_err(|e| {
        tracing::error!(error = %e, "Channel performance query failed");
        AppError::Dependency("Channel performance query failed.".to_string())
    })?;

    let mut channels = Vec::new();
    let mut total_revenue = 0.0_f64;

    for row in &rows {
        let channel = row.try_get::<String, _>("channel").unwrap_or_default();
        let booking_count = row.try_get::<i32, _>("booking_count").unwrap_or(0);
        let revenue = row.try_get::<f64, _>("total_revenue").unwrap_or(0.0);
        let avg_rate = row.try_get::<f64, _>("avg_rate").unwrap_or(0.0);
        let avg_los = row.try_get::<f64, _>("avg_los").unwrap_or(0.0);

        let commission_rate = channel_commission(&channel);
        let commission_cost = revenue * commission_rate;
        let net_revenue = revenue - commission_cost;

        total_revenue += revenue;

        channels.push(json!({
            "channel": channel,
            "booking_count": booking_count,
            "gross_revenue": (revenue * 100.0).round() / 100.0,
            "commission_rate_pct": (commission_rate * 100.0).round(),
            "commission_cost": (commission_cost * 100.0).round() / 100.0,
            "net_revenue": (net_revenue * 100.0).round() / 100.0,
            "avg_nightly_rate": (avg_rate * 100.0).round() / 100.0,
            "avg_length_of_stay": (avg_los * 10.0).round() / 10.0,
        }));
    }

    // Compute channel share
    for ch in &mut channels {
        if let Some(gross) = ch.get("gross_revenue").and_then(Value::as_f64) {
            let share = if total_revenue > 0.0 {
                (gross / total_revenue * 10000.0).round() / 100.0
            } else {
                0.0
            };
            ch.as_object_mut()
                .unwrap()
                .insert("revenue_share_pct".to_string(), json!(share));
        }
    }

    Ok(json!({
        "ok": true,
        "period_days": days,
        "property_id": property_id,
        "total_gross_revenue": (total_revenue * 100.0).round() / 100.0,
        "channels": channels,
        "channel_count": channels.len(),
    }))
}

// ---------------------------------------------------------------------------
// AI Tool: optimize_channel_rates — recommend per-channel pricing
// ---------------------------------------------------------------------------

pub async fn tool_optimize_channel_rates(
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

    let base_rate = args.get("base_rate").and_then(Value::as_f64).unwrap_or(0.0);

    if base_rate <= 0.0 {
        return Ok(json!({ "ok": false, "error": "base_rate must be positive." }));
    }

    let target_net = args
        .get("target_net_rate")
        .and_then(Value::as_f64)
        .unwrap_or(base_rate); // if not specified, aim for base_rate as net

    // Get historical booking velocity per channel (last 90 days)
    let channel_stats = sqlx::query(
        "SELECT COALESCE(r.source, 'direct') AS channel,
                COUNT(*)::int AS bookings,
                COALESCE(AVG(r.nightly_rate), 0)::float8 AS avg_rate,
                COALESCE(SUM(r.total_amount), 0)::float8 AS revenue
         FROM reservations r
         JOIN units u ON u.id = r.unit_id
         WHERE r.organization_id = $1::uuid
           AND u.property_id = $2::uuid
           AND r.status IN ('confirmed','checked_in','checked_out')
           AND r.check_in >= CURRENT_DATE - 90
         GROUP BY COALESCE(r.source, 'direct')",
    )
    .bind(org_id)
    .bind(property_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Channel stats query failed");
        AppError::Dependency("Channel stats query failed.".to_string())
    })?;

    // Get current occupancy from digital twin
    let current_occ: f64 = sqlx::query_scalar(
        "SELECT COALESCE(occupancy_rate, 0)::float8 FROM property_state
         WHERE organization_id = $1::uuid AND property_id = $2::uuid",
    )
    .bind(org_id)
    .bind(property_id)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
    .unwrap_or(50.0);

    // Get elasticity
    let elasticity = crate::services::ml_pipeline::get_active_elasticity(pool, org_id)
        .await
        .unwrap_or(-0.8);

    // Known channels to always include
    let known_channels = ["airbnb", "booking", "vrbo", "direct"];

    let mut recommendations = Vec::new();

    // Build stats lookup
    let mut stats_map = std::collections::HashMap::new();
    for row in &channel_stats {
        let ch = row.try_get::<String, _>("channel").unwrap_or_default();
        let bookings = row.try_get::<i32, _>("bookings").unwrap_or(0);
        let avg_rate = row.try_get::<f64, _>("avg_rate").unwrap_or(0.0);
        let revenue = row.try_get::<f64, _>("revenue").unwrap_or(0.0);
        stats_map.insert(ch.to_lowercase(), (bookings, avg_rate, revenue));
    }

    for channel in known_channels {
        let commission = channel_commission(channel);
        let (bookings, _hist_avg_rate, _revenue) =
            stats_map.get(channel).copied().unwrap_or((0, 0.0, 0.0));

        // Recommended rate: ensure net revenue >= target_net after commission
        let recommended_rate = if commission > 0.0 {
            target_net / (1.0 - commission)
        } else {
            target_net
        };

        // Demand adjustment: if high-volume channel and low occupancy, discount slightly
        let demand_adj = if current_occ < 50.0 && bookings > 5 {
            -0.03 // 3% discount for high-velocity channels when occupancy is low
        } else if current_occ > 85.0 {
            0.05 // 5% premium when occupancy is high
        } else {
            0.0
        };

        let final_rate = (recommended_rate * (1.0 + demand_adj)).max(0.0);
        let net_after_commission = final_rate * (1.0 - commission);
        let rate_vs_base_pct = if base_rate > 0.0 {
            ((final_rate - base_rate) / base_rate * 100.0).round()
        } else {
            0.0
        };

        recommendations.push(json!({
            "channel": channel,
            "commission_pct": (commission * 100.0).round(),
            "recommended_rate": (final_rate * 100.0).round() / 100.0,
            "net_revenue_per_night": (net_after_commission * 100.0).round() / 100.0,
            "rate_vs_base_pct": rate_vs_base_pct,
            "demand_adjustment_pct": (demand_adj * 100.0).round(),
            "historical_bookings_90d": bookings,
            "rationale": format!(
                "{}% commission → rate {:.0} yields {:.0} net/night{}",
                (commission * 100.0).round(),
                final_rate,
                net_after_commission,
                if demand_adj != 0.0 { format!(" ({}% demand adj)", (demand_adj * 100.0).round()) } else { String::new() }
            ),
        }));
    }

    Ok(json!({
        "ok": true,
        "property_id": property_id,
        "base_rate": base_rate,
        "target_net_rate": target_net,
        "current_occupancy_pct": current_occ,
        "elasticity": elasticity,
        "recommendations": recommendations,
        "note": "Recommendations only — no rates were changed. Use apply_pricing_recommendation to apply.",
    }))
}
