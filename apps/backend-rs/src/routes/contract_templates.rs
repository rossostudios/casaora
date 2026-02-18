use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Map, Value};

use crate::{
    auth::require_user_id,
    error::{AppError, AppResult},
    repository::table_service::{create_row, delete_row, get_row, list_rows, update_row},
    schemas::{
        clamp_limit, remove_nulls, serialize_to_map, ContractTemplatePath, ContractTemplatesQuery,
        CreateContractTemplateInput, RenderContractInput, UpdateContractTemplateInput,
    },
    services::audit::write_audit_log,
    state::AppState,
    tenancy::{assert_org_member, assert_org_role},
};

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route(
            "/contract-templates",
            axum::routing::get(list_templates).post(create_template),
        )
        .route(
            "/contract-templates/{template_id}",
            axum::routing::get(get_template)
                .patch(update_template)
                .delete(delete_template),
        )
        .route(
            "/contract-templates/{template_id}/render",
            axum::routing::post(render_template),
        )
}

fn db_pool(state: &AppState) -> AppResult<&sqlx::PgPool> {
    state
        .db_pool
        .as_ref()
        .ok_or_else(|| AppError::Dependency("Database is not configured.".to_string()))
}

async fn list_templates(
    State(state): State<AppState>,
    Query(query): Query<ContractTemplatesQuery>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_member(&state, &user_id, &query.org_id).await?;
    let pool = db_pool(&state)?;

    let mut filters = Map::new();
    filters.insert(
        "organization_id".to_string(),
        Value::String(query.org_id.clone()),
    );

    let rows = list_rows(
        pool,
        "contract_templates",
        Some(&filters),
        clamp_limit(query.limit),
        0,
        "created_at",
        false,
    )
    .await?;

    Ok(Json(json!({ "data": rows })))
}

async fn create_template(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateContractTemplateInput>,
) -> AppResult<impl IntoResponse> {
    let user_id = require_user_id(&state, &headers).await?;
    assert_org_role(&state, &user_id, &payload.organization_id, &["owner_admin"]).await?;
    let pool = db_pool(&state)?;

    let mut record = Map::new();
    record.insert(
        "organization_id".to_string(),
        Value::String(payload.organization_id.clone()),
    );
    record.insert("name".to_string(), Value::String(payload.name));
    record.insert("language".to_string(), Value::String(payload.language));
    record.insert(
        "body_template".to_string(),
        Value::String(payload.body_template),
    );
    record.insert(
        "variables".to_string(),
        serde_json::to_value(&payload.variables).unwrap_or(Value::Array(vec![])),
    );
    record.insert("is_default".to_string(), Value::Bool(payload.is_default));

    let created = create_row(pool, "contract_templates", &record).await?;

    write_audit_log(
        Some(pool),
        Some(&payload.organization_id),
        Some(&user_id),
        "create",
        "contract_template",
        created.get("id").and_then(Value::as_str),
        None,
        Some(created.clone()),
    )
    .await;

    Ok((StatusCode::CREATED, Json(created)))
}

async fn get_template(
    State(state): State<AppState>,
    Path(path): Path<ContractTemplatePath>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let row = get_row(pool, "contract_templates", &path.template_id, "id").await?;
    let org_id = row
        .as_object()
        .and_then(|o| o.get("organization_id"))
        .and_then(Value::as_str)
        .unwrap_or("");
    assert_org_member(&state, &user_id, org_id).await?;

    Ok(Json(row))
}

async fn update_template(
    State(state): State<AppState>,
    Path(path): Path<ContractTemplatePath>,
    headers: HeaderMap,
    Json(payload): Json<UpdateContractTemplateInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let existing = get_row(pool, "contract_templates", &path.template_id, "id").await?;
    let org_id = existing
        .as_object()
        .and_then(|o| o.get("organization_id"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    assert_org_role(&state, &user_id, &org_id, &["owner_admin"]).await?;

    let mut patch = remove_nulls(serialize_to_map(&payload));

    if let Some(vars) = payload.variables {
        patch.insert(
            "variables".to_string(),
            serde_json::to_value(&vars).unwrap_or(Value::Array(vec![])),
        );
    }

    if patch.is_empty() {
        return Ok(Json(existing));
    }

    let updated = update_row(pool, "contract_templates", &path.template_id, &patch, "id").await?;

    write_audit_log(
        Some(pool),
        Some(&org_id),
        Some(&user_id),
        "update",
        "contract_template",
        Some(&path.template_id),
        Some(existing),
        Some(updated.clone()),
    )
    .await;

    Ok(Json(updated))
}

async fn delete_template(
    State(state): State<AppState>,
    Path(path): Path<ContractTemplatePath>,
    headers: HeaderMap,
) -> AppResult<impl IntoResponse> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let existing = get_row(pool, "contract_templates", &path.template_id, "id").await?;
    let org_id = existing
        .as_object()
        .and_then(|o| o.get("organization_id"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    assert_org_role(&state, &user_id, &org_id, &["owner_admin"]).await?;

    delete_row(pool, "contract_templates", &path.template_id, "id").await?;

    write_audit_log(
        Some(pool),
        Some(&org_id),
        Some(&user_id),
        "delete",
        "contract_template",
        Some(&path.template_id),
        Some(existing),
        None,
    )
    .await;

    Ok(StatusCode::NO_CONTENT)
}

/// Render a contract template by replacing {{variable}} placeholders with lease data.
async fn render_template(
    State(state): State<AppState>,
    Path(path): Path<ContractTemplatePath>,
    headers: HeaderMap,
    Json(payload): Json<RenderContractInput>,
) -> AppResult<Json<Value>> {
    let user_id = require_user_id(&state, &headers).await?;
    let pool = db_pool(&state)?;

    let template = get_row(pool, "contract_templates", &path.template_id, "id").await?;
    let org_id = template
        .as_object()
        .and_then(|o| o.get("organization_id"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    assert_org_member(&state, &user_id, &org_id).await?;

    let body_template = template
        .as_object()
        .and_then(|o| o.get("body_template"))
        .and_then(Value::as_str)
        .unwrap_or("");

    // Load lease + related data
    let lease = get_row(pool, "leases", &payload.lease_id, "id").await?;
    let lease_obj = lease.as_object().cloned().unwrap_or_default();

    let property_id = lease_obj
        .get("property_id")
        .and_then(Value::as_str)
        .unwrap_or("");
    let unit_id = lease_obj
        .get("unit_id")
        .and_then(Value::as_str)
        .unwrap_or("");

    let property = if !property_id.is_empty() {
        get_row(pool, "properties", property_id, "id").await.ok()
    } else {
        None
    };
    let unit = if !unit_id.is_empty() {
        get_row(pool, "units", unit_id, "id").await.ok()
    } else {
        None
    };
    let org = get_row(pool, "organizations", &org_id, "id").await.ok();

    // Build variable map
    let mut vars: std::collections::HashMap<String, String> = std::collections::HashMap::new();

    // Lease fields
    for key in [
        "tenant_full_name",
        "tenant_email",
        "tenant_phone_e164",
        "starts_on",
        "ends_on",
        "monthly_rent",
        "service_fee_flat",
        "security_deposit",
        "guarantee_option_fee",
        "tax_iva",
        "currency",
        "notes",
        "lease_status",
    ] {
        let val = lease_obj
            .get(key)
            .map(|v| match v {
                Value::String(s) => s.clone(),
                Value::Number(n) => n.to_string(),
                _ => v.to_string(),
            })
            .unwrap_or_default();
        vars.insert(key.to_string(), val);
    }

    // Property fields
    if let Some(prop) = property.as_ref().and_then(Value::as_object) {
        vars.insert(
            "property_name".to_string(),
            prop.get("name")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string(),
        );
        vars.insert(
            "property_address".to_string(),
            prop.get("address_line1")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string(),
        );
        vars.insert(
            "property_city".to_string(),
            prop.get("city")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string(),
        );
    }

    // Unit fields
    if let Some(u) = unit.as_ref().and_then(Value::as_object) {
        vars.insert(
            "unit_name".to_string(),
            u.get("name")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string(),
        );
    }

    // Org fields
    if let Some(o) = org.as_ref().and_then(Value::as_object) {
        vars.insert(
            "org_name".to_string(),
            o.get("name")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string(),
        );
    }

    // Current date
    vars.insert(
        "today".to_string(),
        chrono::Utc::now().format("%Y-%m-%d").to_string(),
    );

    // Replace {{variable}} placeholders
    let mut rendered = body_template.to_string();
    for (key, value) in &vars {
        rendered = rendered.replace(&format!("{{{{{key}}}}}"), value);
    }

    Ok(Json(json!({
        "rendered": rendered,
        "variables_used": vars,
    })))
}
