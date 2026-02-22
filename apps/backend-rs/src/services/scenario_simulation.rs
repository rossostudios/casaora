use serde_json::{json, Map, Value};

use crate::error::AppResult;

/// Parametric financial calculator for investment scenario simulation.
/// This is not LLM-dependent — it uses pure math to project cash flows.
pub fn tool_simulate_investment_scenario(args: &Map<String, Value>) -> AppResult<Value> {
    let base_revenue = args
        .get("base_monthly_revenue")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let base_expenses = args
        .get("base_monthly_expenses")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let revenue_growth = args
        .get("revenue_growth_pct")
        .and_then(Value::as_f64)
        .unwrap_or(0.0)
        / 100.0;
    let expense_growth = args
        .get("expense_growth_pct")
        .and_then(Value::as_f64)
        .unwrap_or(0.0)
        / 100.0;
    let investment = args
        .get("investment_amount")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let months = args
        .get("projection_months")
        .and_then(Value::as_i64)
        .unwrap_or(12)
        .clamp(1, 120) as usize;

    if base_revenue <= 0.0 {
        return Ok(json!({
            "ok": false,
            "error": "base_monthly_revenue must be positive.",
        }));
    }

    let mut monthly_projections = Vec::with_capacity(months);
    let mut cumulative_revenue = 0.0_f64;
    let mut cumulative_expenses = 0.0_f64;
    let mut cumulative_noi = 0.0_f64;
    let mut break_even_month: Option<usize> = None;

    for month in 1..=months {
        let m = month as f64;
        let projected_revenue = base_revenue * (1.0 + revenue_growth).powf(m - 1.0);
        let projected_expenses = base_expenses * (1.0 + expense_growth).powf(m - 1.0);
        let monthly_noi = projected_revenue - projected_expenses;

        cumulative_revenue += projected_revenue;
        cumulative_expenses += projected_expenses;
        cumulative_noi += monthly_noi;

        // Check break-even (cumulative NOI exceeds investment)
        if break_even_month.is_none() && investment > 0.0 && cumulative_noi >= investment {
            break_even_month = Some(month);
        }

        monthly_projections.push(json!({
            "month": month,
            "revenue": (projected_revenue * 100.0).round() / 100.0,
            "expenses": (projected_expenses * 100.0).round() / 100.0,
            "noi": (monthly_noi * 100.0).round() / 100.0,
            "cumulative_noi": (cumulative_noi * 100.0).round() / 100.0,
        }));
    }

    let total_noi = cumulative_noi;
    let roi = if investment > 0.0 {
        (total_noi - investment) / investment * 100.0
    } else {
        0.0
    };

    let annual_noi = if months >= 12 {
        // Use last 12 months average
        let last_12: f64 = monthly_projections
            .iter()
            .rev()
            .take(12)
            .filter_map(|m| m.get("noi").and_then(Value::as_f64))
            .sum();
        last_12
    } else {
        total_noi / months as f64 * 12.0
    };

    let cap_rate = if investment > 0.0 {
        annual_noi / investment * 100.0
    } else {
        0.0
    };

    Ok(json!({
        "ok": true,
        "projection_months": months,
        "investment_amount": (investment * 100.0).round() / 100.0,
        "summary": {
            "total_revenue": (cumulative_revenue * 100.0).round() / 100.0,
            "total_expenses": (cumulative_expenses * 100.0).round() / 100.0,
            "total_noi": (total_noi * 100.0).round() / 100.0,
            "roi_pct": (roi * 100.0).round() / 100.0,
            "cap_rate_pct": (cap_rate * 100.0).round() / 100.0,
            "break_even_month": break_even_month,
            "annualized_noi": (annual_noi * 100.0).round() / 100.0,
        },
        "monthly_projections": monthly_projections,
    }))
}
