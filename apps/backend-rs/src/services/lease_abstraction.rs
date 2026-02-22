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

/// Extract key terms from a lease document using LLM structured extraction.
pub async fn tool_abstract_lease_document(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let document_id = args
        .get("document_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let lease_id = args.get("lease_id").and_then(Value::as_str);

    if document_id.is_empty() {
        return Ok(json!({ "ok": false, "error": "document_id is required." }));
    }

    // Fetch document content from knowledge_chunks
    let chunks = sqlx::query(
        "SELECT content FROM knowledge_chunks
         WHERE document_id = $1::uuid AND organization_id = $2::uuid
         ORDER BY chunk_index ASC",
    )
    .bind(document_id)
    .bind(org_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to fetch document chunks");
        AppError::Dependency("Failed to fetch document chunks.".to_string())
    })?;

    if chunks.is_empty() {
        return Ok(json!({
            "ok": false,
            "error": "No content found for this document. Ensure it has been processed and embedded.",
        }));
    }

    let full_text: String = chunks
        .iter()
        .filter_map(|r| r.try_get::<String, _>("content").ok())
        .collect::<Vec<_>>()
        .join("\n\n");

    // Use LLM to extract structured terms
    let api_key = state
        .config
        .openai_api_key
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            AppError::ServiceUnavailable("OPENAI_API_KEY is required for lease abstraction.".to_string())
        })?;

    let base_url = state.config.openai_api_base_url.trim_end_matches('/');
    let chat_url = format!("{base_url}/v1/chat/completions");

    let extraction_prompt = format!(
        "Extract the key terms from this lease/rental agreement. Return a JSON object with these fields:\n\
         - parties: array of {{name, role}} (e.g., landlord, tenant, guarantor)\n\
         - property_address: string\n\
         - lease_start: string (YYYY-MM-DD if available)\n\
         - lease_end: string (YYYY-MM-DD if available)\n\
         - monthly_rent: number\n\
         - currency: string\n\
         - security_deposit: number\n\
         - payment_due_day: number\n\
         - late_fee: number or null\n\
         - renewal_terms: string or null\n\
         - termination_clause: string or null\n\
         - special_clauses: array of strings\n\
         - obligations_landlord: array of strings\n\
         - obligations_tenant: array of strings\n\n\
         Document text:\n{}", &full_text[..full_text.len().min(8000)]
    );

    let response = state
        .http_client
        .post(&chat_url)
        .header("Authorization", format!("Bearer {api_key}"))
        .json(&json!({
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are a legal document analyst specializing in lease agreements. Extract structured data accurately."},
                {"role": "user", "content": extraction_prompt}
            ],
            "temperature": 0.1,
            "response_format": { "type": "json_object" },
        }))
        .timeout(std::time::Duration::from_secs(45))
        .send()
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Lease extraction API failed");
            AppError::Dependency("Lease extraction API failed.".to_string())
        })?;

    let body: Value = response.json().await.map_err(|e| {
        tracing::error!(error = %e, "Failed to parse extraction response");
        AppError::Dependency("Failed to parse extraction response.".to_string())
    })?;

    let extracted_text = body
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|c| c.first())
        .and_then(Value::as_object)
        .and_then(|c| c.get("message"))
        .and_then(Value::as_object)
        .and_then(|m| m.get("content"))
        .and_then(Value::as_str)
        .unwrap_or("{}");

    let extracted: Value =
        serde_json::from_str(extracted_text).unwrap_or_else(|_| json!({"error": "parse_failed"}));

    // Store abstraction
    let abstraction = sqlx::query(
        "INSERT INTO lease_abstractions (
            organization_id, document_id, lease_id,
            extracted_terms, confidence, reviewed
         ) VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5, false)
         RETURNING id::text",
    )
    .bind(org_id)
    .bind(document_id)
    .bind(lease_id)
    .bind(&extracted)
    .bind(0.85_f64)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    let abstraction_id = abstraction
        .and_then(|r| r.try_get::<String, _>("id").ok())
        .unwrap_or_default();

    Ok(json!({
        "ok": true,
        "abstraction_id": abstraction_id,
        "document_id": document_id,
        "lease_id": lease_id,
        "extracted_terms": extracted,
        "confidence": 0.85,
        "reviewed": false,
    }))
}

/// Check a lease for compliance issues.
pub async fn tool_check_lease_compliance(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let lease_id = args
        .get("lease_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if lease_id.is_empty() {
        return Ok(json!({ "ok": false, "error": "lease_id is required." }));
    }

    // Fetch lease data
    let lease = sqlx::query(
        "SELECT id::text, tenant_name, unit_id::text, starts_on::text, ends_on::text,
                lease_status, monthly_rent::float8, security_deposit::float8
         FROM leases
         WHERE id = $1::uuid AND organization_id = $2::uuid",
    )
    .bind(lease_id)
    .bind(org_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to fetch lease");
        AppError::Dependency("Failed to fetch lease.".to_string())
    })?;

    let Some(row) = lease else {
        return Ok(json!({ "ok": false, "error": "Lease not found." }));
    };

    let tenant = row
        .try_get::<Option<String>, _>("tenant_name")
        .ok()
        .flatten()
        .unwrap_or_default();
    let starts_on = row
        .try_get::<Option<String>, _>("starts_on")
        .ok()
        .flatten()
        .unwrap_or_default();
    let ends_on = row
        .try_get::<Option<String>, _>("ends_on")
        .ok()
        .flatten()
        .unwrap_or_default();
    let status = row
        .try_get::<String, _>("lease_status")
        .unwrap_or_default();
    let monthly_rent = row.try_get::<f64, _>("monthly_rent").unwrap_or(0.0);
    let deposit = row.try_get::<f64, _>("security_deposit").unwrap_or(0.0);

    let mut issues = Vec::new();
    let mut warnings = Vec::new();

    // Check 1: Lease expiry
    if !ends_on.is_empty() {
        if let Ok(end_date) = chrono::NaiveDate::parse_from_str(&ends_on, "%Y-%m-%d") {
            let today = chrono::Utc::now().date_naive();
            let days_remaining = (end_date - today).num_days();
            if days_remaining < 0 {
                issues.push("Lease has expired and needs renewal or termination.".to_string());
            } else if days_remaining < 30 {
                warnings.push(format!(
                    "Lease expires in {} days. Initiate renewal process.",
                    days_remaining
                ));
            } else if days_remaining < 60 {
                warnings.push(format!(
                    "Lease expires in {} days. Consider sending renewal offer.",
                    days_remaining
                ));
            }
        }
    }

    // Check 2: Security deposit compliance (Paraguayan law: max 1 month rent)
    if deposit > monthly_rent * 1.1 {
        warnings.push(format!(
            "Security deposit ({:.0}) exceeds one month's rent ({:.0}). Review local regulations.",
            deposit, monthly_rent
        ));
    }

    // Check 3: Missing critical data
    if tenant.is_empty() {
        issues.push("Tenant name is missing from lease record.".to_string());
    }
    if starts_on.is_empty() {
        issues.push("Lease start date is not set.".to_string());
    }
    if ends_on.is_empty() {
        warnings.push("Lease has no end date. Consider setting a definite term.".to_string());
    }
    if monthly_rent <= 0.0 {
        issues.push("Monthly rent is not set or is zero.".to_string());
    }

    // Check 4: Status consistency
    if status == "active" && !ends_on.is_empty() {
        if let Ok(end_date) = chrono::NaiveDate::parse_from_str(&ends_on, "%Y-%m-%d") {
            if end_date < chrono::Utc::now().date_naive() {
                issues.push(
                    "Lease is marked as active but has already expired. Update status."
                        .to_string(),
                );
            }
        }
    }

    let compliance_score = if issues.is_empty() && warnings.is_empty() {
        100
    } else if issues.is_empty() {
        80
    } else {
        (100 - issues.len() * 20).max(0)
    };

    Ok(json!({
        "ok": true,
        "lease_id": lease_id,
        "tenant": tenant,
        "status": status,
        "compliance_score": compliance_score,
        "issues": issues,
        "warnings": warnings,
        "issue_count": issues.len(),
        "warning_count": warnings.len(),
    }))
}

/// Check for documents approaching expiry.
pub async fn tool_check_document_expiry(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let days_ahead = args
        .get("days_ahead")
        .and_then(Value::as_i64)
        .unwrap_or(30)
        .clamp(1, 180);

    let rows = sqlx::query(
        "SELECT id::text, title, source_url, expires_at::text,
                (expires_at::date - current_date) AS days_remaining
         FROM knowledge_documents
         WHERE organization_id = $1::uuid
           AND expires_at IS NOT NULL
           AND expires_at <= current_date + ($2::int || ' days')::interval
         ORDER BY expires_at ASC
         LIMIT 50",
    )
    .bind(org_id)
    .bind(days_ahead as i32)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Document expiry check failed");
        AppError::Dependency("Document expiry check failed.".to_string())
    })?;

    let documents: Vec<Value> = rows
        .iter()
        .map(|r| {
            json!({
                "document_id": r.try_get::<String, _>("id").unwrap_or_default(),
                "title": r.try_get::<String, _>("title").unwrap_or_default(),
                "source_url": r.try_get::<Option<String>, _>("source_url").ok().flatten(),
                "expires_at": r.try_get::<Option<String>, _>("expires_at").ok().flatten(),
                "days_remaining": r.try_get::<i32, _>("days_remaining").unwrap_or(0),
            })
        })
        .collect();

    let expired_count = documents
        .iter()
        .filter(|d| {
            d.get("days_remaining")
                .and_then(Value::as_i64)
                .unwrap_or(0)
                < 0
        })
        .count();

    Ok(json!({
        "ok": true,
        "days_ahead": days_ahead,
        "total_flagged": documents.len(),
        "already_expired": expired_count,
        "documents": documents,
    }))
}
