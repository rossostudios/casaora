use std::sync::Arc;

use reqwest::Client;
use sqlx::PgPool;
use tokio::sync::RwLock;

use crate::{config::AppConfig, db::create_pool, error::AppResult};

/// Cached JWKS key set fetched from Supabase's /.well-known/jwks.json endpoint.
#[derive(Clone)]
pub struct JwksCache {
    pub jwks_url: String,
    http_client: Client,
    cached_keys: Arc<RwLock<Option<jsonwebtoken::jwk::JwkSet>>>,
}

impl JwksCache {
    pub fn new(jwks_url: String, http_client: Client) -> Self {
        Self {
            jwks_url,
            http_client,
            cached_keys: Arc::new(RwLock::new(None)),
        }
    }

    /// Return cached JWKS or fetch from the endpoint.
    pub async fn get_jwks(&self) -> Result<jsonwebtoken::jwk::JwkSet, String> {
        {
            let cached = self.cached_keys.read().await;
            if let Some(ref keys) = *cached {
                return Ok(keys.clone());
            }
        }
        self.refresh().await
    }

    /// Force-refresh the JWKS cache (e.g. on kid mismatch / key rotation).
    pub async fn refresh(&self) -> Result<jsonwebtoken::jwk::JwkSet, String> {
        let response = self
            .http_client
            .get(&self.jwks_url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch JWKS: {e}"))?;

        let jwks: jsonwebtoken::jwk::JwkSet = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse JWKS: {e}"))?;

        {
            let mut cached = self.cached_keys.write().await;
            *cached = Some(jwks.clone());
        }

        Ok(jwks)
    }
}

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub db_pool: Option<PgPool>,
    pub http_client: Client,
    pub jwks_cache: Option<JwksCache>,
}

impl AppState {
    pub fn build(config: AppConfig) -> AppResult<Self> {
        let db_pool = create_pool(&config)?;
        let http_client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|error| {
                crate::error::AppError::Internal(format!("Could not build HTTP client: {error}"))
            })?;

        let jwks_cache = config.supabase_jwks_url.as_ref().map(|url| {
            JwksCache::new(url.clone(), http_client.clone())
        });

        Ok(Self {
            config: Arc::new(config),
            db_pool,
            http_client,
            jwks_cache,
        })
    }
}
