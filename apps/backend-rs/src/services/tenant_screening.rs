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

/// Score a rental application using rule-based screening criteria.
/// Returns a 0-100 score with detailed breakdown.
pub async fn tool_score_application(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let app_id = args
        .get("application_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if app_id.is_empty() {
        return Ok(json!({ "ok": false, "error": "application_id is required." }));
    }

    // Fetch application data
    let app = sqlx::query(
        "SELECT
            id::text,
            applicant_name,
            monthly_income::float8,
            employment_status,
            employment_months::int,
            references_count::int,
            has_guarantor,
            unit_id::text,
            status
         FROM application_submissions
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(app_id)
    .bind(org_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to fetch application");
        AppError::Dependency("Failed to fetch application.".to_string())
    })?;

    let Some(row) = app else {
        return Ok(json!({ "ok": false, "error": "Application not found." }));
    };

    let monthly_income = row.try_get::<f64, _>("monthly_income").unwrap_or(0.0);
    let employment_status = row
        .try_get::<Option<String>, _>("employment_status")
        .ok()
        .flatten()
        .unwrap_or_default();
    let employment_months = row.try_get::<i32, _>("employment_months").unwrap_or(0);
    let references_count = row.try_get::<i32, _>("references_count").unwrap_or(0);
    let has_guarantor = row.try_get::<bool, _>("has_guarantor").unwrap_or(false);
    let unit_id = row
        .try_get::<Option<String>, _>("unit_id")
        .ok()
        .flatten()
        .unwrap_or_default();

    // Get rent amount for income-to-rent ratio
    let monthly_rent: f64 = if !unit_id.is_empty() {
        sqlx::query_scalar(
            "SELECT COALESCE(base_price, 0)::float8
             FROM pricing_templates
             WHERE organization_id = $1::uuid AND unit_id = $2::uuid AND is_active = true
             ORDER BY updated_at DESC LIMIT 1",
        )
        .bind(org_id)
        .bind(&unit_id)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
        .unwrap_or(0.0)
    } else {
        0.0
    };

    let mut breakdown = Vec::new();
    let mut total_score: f64 = 0.0;
    let mut max_possible: f64 = 0.0;

    // 1. Income-to-rent ratio (max 30 points)
    let income_score = if monthly_rent > 0.0 && monthly_income > 0.0 {
        let ratio = monthly_income / monthly_rent;
        if ratio >= 3.0 {
            30.0
        } else if ratio >= 2.5 {
            25.0
        } else if ratio >= 2.0 {
            18.0
        } else if ratio >= 1.5 {
            10.0
        } else {
            5.0
        }
    } else {
        15.0 // Unknown - neutral score
    };
    total_score += income_score;
    max_possible += 30.0;
    breakdown.push(json!({
        "factor": "income_to_rent_ratio",
        "score": income_score,
        "max": 30,
        "detail": if monthly_rent > 0.0 && monthly_income > 0.0 {
            format!("Ratio: {:.1}x", monthly_income / monthly_rent)
        } else {
            "Insufficient data".to_string()
        },
    }));

    // 2. Employment stability (max 25 points)
    let employment_score = match employment_status.as_str() {
        "employed" | "full_time" => {
            if employment_months >= 24 {
                25.0
            } else if employment_months >= 12 {
                20.0
            } else if employment_months >= 6 {
                15.0
            } else {
                10.0
            }
        }
        "self_employed" | "business_owner" => {
            if employment_months >= 24 {
                22.0
            } else {
                15.0
            }
        }
        "retired" | "pensioner" => 20.0,
        "student" => 10.0,
        _ => 12.0,
    };
    total_score += employment_score;
    max_possible += 25.0;
    breakdown.push(json!({
        "factor": "employment_stability",
        "score": employment_score,
        "max": 25,
        "detail": format!("{} for {} months", employment_status, employment_months),
    }));

    // 3. References (max 20 points)
    let reference_score = if references_count >= 3 {
        20.0
    } else if references_count == 2 {
        15.0
    } else if references_count == 1 {
        10.0
    } else {
        5.0
    };
    total_score += reference_score;
    max_possible += 20.0;
    breakdown.push(json!({
        "factor": "references",
        "score": reference_score,
        "max": 20,
        "detail": format!("{} references provided", references_count),
    }));

    // 4. Guarantor (max 15 points)
    let guarantor_score = if has_guarantor { 15.0 } else { 5.0 };
    total_score += guarantor_score;
    max_possible += 15.0;
    breakdown.push(json!({
        "factor": "guarantor",
        "score": guarantor_score,
        "max": 15,
        "detail": if has_guarantor { "Guarantor provided" } else { "No guarantor" },
    }));

    // 5. Application completeness (max 10 points)
    let completeness_score = if monthly_income > 0.0
        && !employment_status.is_empty()
        && references_count > 0
    {
        10.0
    } else if monthly_income > 0.0 || !employment_status.is_empty() {
        6.0
    } else {
        3.0
    };
    total_score += completeness_score;
    max_possible += 10.0;
    breakdown.push(json!({
        "factor": "completeness",
        "score": completeness_score,
        "max": 10,
        "detail": "Application data completeness",
    }));

    // Normalize to 0-100
    let final_score = if max_possible > 0.0 {
        (total_score / max_possible * 100.0).round() as i32
    } else {
        0
    };

    let risk_level = if final_score >= 80 {
        "low"
    } else if final_score >= 60 {
        "medium"
    } else if final_score >= 40 {
        "elevated"
    } else {
        "high"
    };

    // Update application with screening score
    sqlx::query(
        "UPDATE application_submissions
         SET screening_score = $3, screening_breakdown = $4, screened_at = now(), updated_at = now()
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(app_id)
    .bind(org_id)
    .bind(final_score)
    .bind(json!(breakdown))
    .execute(pool)
    .await
    .ok();

    Ok(json!({
        "ok": true,
        "application_id": app_id,
        "score": final_score,
        "risk_level": risk_level,
        "breakdown": breakdown,
        "recommendation": if final_score >= 70 {
            "Recommend approval. Strong application profile."
        } else if final_score >= 50 {
            "Conditional approval. Review highlighted risk factors."
        } else {
            "Additional verification recommended before proceeding."
        },
    }))
}
