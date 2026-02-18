#![allow(dead_code)]

use axum::http::HeaderMap;
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use serde::Deserialize;
use serde_json::Value;

use crate::{error::AppError, state::AppState};

#[derive(Debug, Clone, Deserialize)]
pub struct SupabaseUser {
    pub id: String,
    pub email: Option<String>,
    #[serde(default)]
    pub user_metadata: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct JwtClaims {
    sub: String,
    email: Option<String>,
    #[serde(default)]
    user_metadata: Option<Value>,
}

pub fn bearer_token(headers: &HeaderMap) -> Option<String> {
    let authorization = headers.get("authorization")?.to_str().ok()?;
    let (scheme, token) = authorization.split_once(' ')?;
    if !scheme.eq_ignore_ascii_case("bearer") {
        return None;
    }
    let trimmed = token.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed.to_string())
}

pub async fn current_user_id(state: &AppState, headers: &HeaderMap) -> Option<String> {
    if state.config.auth_dev_overrides_enabled() {
        if let Some(x_user_id) = header_string(headers, "x-user-id") {
            return Some(x_user_id);
        }
    }

    if let Some(token) = bearer_token(headers) {
        if let Some(user) = resolve_user(state, &token).await {
            return Some(user.id);
        }
    }

    if state.config.auth_dev_overrides_enabled() {
        return state.config.default_user_id.clone();
    }

    None
}

pub async fn current_supabase_user(state: &AppState, headers: &HeaderMap) -> Option<SupabaseUser> {
    if state.config.auth_dev_overrides_enabled() && header_string(headers, "x-user-id").is_some() {
        return None;
    }

    let token = bearer_token(headers)?;
    resolve_user(state, &token).await
}

pub async fn require_user_id(state: &AppState, headers: &HeaderMap) -> Result<String, AppError> {
    current_user_id(state, headers).await.ok_or_else(|| {
        AppError::Unauthorized(
            "Unauthorized: missing or invalid Supabase access token.".to_string(),
        )
    })
}

pub async fn require_supabase_user(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<SupabaseUser, AppError> {
    current_supabase_user(state, headers).await.ok_or_else(|| {
        AppError::Unauthorized(
            "Unauthorized: missing or invalid Supabase access token.".to_string(),
        )
    })
}

fn header_string(headers: &HeaderMap, key: &str) -> Option<String> {
    headers
        .get(key)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

/// Try local JWT validation first (ES256 via JWKS); fall back to the Supabase
/// HTTP endpoint when no JWKS URL is configured.
async fn resolve_user(state: &AppState, token: &str) -> Option<SupabaseUser> {
    if let Some(user) = validate_jwt_with_jwks(state, token).await {
        return Some(user);
    }
    fetch_supabase_user_for_token(state, token).await
}

/// Validate a Supabase JWT using the ES256 public key from the JWKS endpoint.
/// Returns None if JWKS is not configured or validation fails.
async fn validate_jwt_with_jwks(state: &AppState, token: &str) -> Option<SupabaseUser> {
    let jwks_cache = state.jwks_cache.as_ref()?;

    let header = decode_header(token).ok()?;
    let kid = header.kid.as_deref()?;

    // Try with cached keys first
    let mut jwks = jwks_cache.get_jwks().await.ok()?;
    let mut jwk = jwks
        .keys
        .iter()
        .find(|k| k.common.key_id.as_deref() == Some(kid));

    // If kid not found, refresh once (handles key rotation)
    if jwk.is_none() {
        jwks = jwks_cache.refresh().await.ok()?;
        jwk = jwks
            .keys
            .iter()
            .find(|k| k.common.key_id.as_deref() == Some(kid));
    }

    let jwk = jwk?;
    let decoding_key = DecodingKey::from_jwk(jwk).ok()?;

    let issuer = format!(
        "{}/auth/v1",
        state
            .config
            .supabase_url
            .as_deref()
            .unwrap_or_default()
            .trim_end_matches('/')
    );

    let mut validation = Validation::new(Algorithm::ES256);
    validation.set_audience(&["authenticated"]);
    validation.set_issuer(&[&issuer]);

    let token_data = decode::<JwtClaims>(token, &decoding_key, &validation).ok()?;

    Some(SupabaseUser {
        id: token_data.claims.sub,
        email: token_data.claims.email,
        user_metadata: token_data.claims.user_metadata,
    })
}

async fn fetch_supabase_user_for_token(state: &AppState, token: &str) -> Option<SupabaseUser> {
    let supabase_url = state.config.supabase_url.as_deref()?;
    let service_key = state.config.supabase_service_role_key.as_deref()?;

    let endpoint = format!("{}/auth/v1/user", supabase_url.trim_end_matches('/'));
    let response = state
        .http_client
        .get(endpoint)
        .header("Authorization", format!("Bearer {token}"))
        .header("apikey", service_key)
        .send()
        .await
        .ok()?;

    if !response.status().is_success() {
        return None;
    }

    response.json::<SupabaseUser>().await.ok()
}
