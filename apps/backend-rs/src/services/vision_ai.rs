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

/// Analyze inspection photos using OpenAI Vision API.
pub async fn tool_analyze_inspection_photos(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let unit_id = args
        .get("unit_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let photo_urls = args
        .get("photo_urls")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let inspection_type = args
        .get("inspection_type")
        .and_then(Value::as_str)
        .unwrap_or("routine");

    if unit_id.is_empty() || photo_urls.is_empty() {
        return Ok(json!({
            "ok": false,
            "error": "unit_id and photo_urls are required.",
        }));
    }

    let api_key = state
        .config
        .openai_api_key
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| {
            AppError::ServiceUnavailable("OPENAI_API_KEY is required for vision analysis.".to_string())
        })?;

    // Build vision API request with photo URLs
    let mut content_parts: Vec<Value> = vec![json!({
        "type": "text",
        "text": format!(
            "You are a property inspection assistant. Analyze these photos from a {} inspection of a rental unit. \
             For each room/area visible, provide:\n\
             1. Room identification\n\
             2. Condition score (1-5, where 5 is excellent)\n\
             3. Any defects or damage found\n\
             4. Maintenance recommendations\n\n\
             Return a JSON object with: overall_score (1-5), rooms (array of {{room, score, defects[], recommendations[]}}), \
             summary (text), urgent_issues (array of strings).",
            inspection_type
        )
    })];

    for url in &photo_urls {
        if let Some(url_str) = url.as_str() {
            content_parts.push(json!({
                "type": "image_url",
                "image_url": { "url": url_str }
            }));
        }
    }

    let base_url = state.config.openai_api_base_url.trim_end_matches('/');
    let chat_url = format!("{base_url}/v1/chat/completions");

    let response = state
        .http_client
        .post(&chat_url)
        .header("Authorization", format!("Bearer {api_key}"))
        .json(&json!({
            "model": "gpt-4o",
            "messages": [{
                "role": "user",
                "content": content_parts,
            }],
            "max_tokens": 2000,
            "response_format": { "type": "json_object" },
        }))
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Vision API request failed");
            AppError::Dependency("Vision API request failed.".to_string())
        })?;

    let status = response.status();
    let body: Value = response.json().await.map_err(|e| {
        tracing::error!(error = %e, "Failed to parse vision response");
        AppError::Dependency("Failed to parse vision response.".to_string())
    })?;

    if !status.is_success() {
        let err = body
            .get("error")
            .and_then(|e| e.get("message"))
            .and_then(Value::as_str)
            .unwrap_or("Unknown error");
        return Ok(json!({
            "ok": false,
            "error": format!("Vision API error: {err}"),
        }));
    }

    let analysis_text = body
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|c| c.first())
        .and_then(Value::as_object)
        .and_then(|c| c.get("message"))
        .and_then(Value::as_object)
        .and_then(|m| m.get("content"))
        .and_then(Value::as_str)
        .unwrap_or("{}");

    let analysis: Value =
        serde_json::from_str(analysis_text).unwrap_or_else(|_| json!({ "error": "parse_failed" }));

    let overall_score = analysis
        .get("overall_score")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);

    // Store inspection report
    let report = sqlx::query(
        "INSERT INTO inspection_reports (
            organization_id, unit_id, inspection_type,
            photos, ai_analysis, condition_score, defects
         ) VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb)
         RETURNING id::text",
    )
    .bind(org_id)
    .bind(unit_id)
    .bind(inspection_type)
    .bind(&Value::Array(photo_urls.clone()))
    .bind(&analysis)
    .bind(overall_score)
    .bind(
        analysis
            .get("rooms")
            .and_then(Value::as_array)
            .map(|rooms| {
                let defects: Vec<Value> = rooms
                    .iter()
                    .filter_map(|r| r.get("defects"))
                    .filter_map(Value::as_array)
                    .flatten()
                    .cloned()
                    .collect();
                Value::Array(defects)
            })
            .unwrap_or_else(|| json!([])),
    )
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    let report_id = report
        .and_then(|r| r.try_get::<String, _>("id").ok())
        .unwrap_or_default();

    Ok(json!({
        "ok": true,
        "report_id": report_id,
        "unit_id": unit_id,
        "inspection_type": inspection_type,
        "overall_score": overall_score,
        "analysis": analysis,
        "photos_analyzed": photo_urls.len(),
    }))
}
