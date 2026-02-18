use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};

use reqwest::Client;
use serde_json::Value;
use sqlx::PgPool;
use tokio::sync::{Mutex, RwLock};

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
    pub org_membership_cache: OrgMembershipCache,
    pub public_listings_cache: PublicListingsCache,
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

        let jwks_cache = config
            .supabase_jwks_url
            .as_ref()
            .map(|url| JwksCache::new(url.clone(), http_client.clone()));

        let org_membership_cache = OrgMembershipCache::new(
            config.org_membership_cache_ttl_seconds,
            config.org_membership_cache_max_entries,
        );
        let public_listings_cache = PublicListingsCache::new(
            config.public_listings_cache_ttl_seconds,
            config.public_listings_cache_max_entries,
        );

        Ok(Self {
            config: Arc::new(config),
            db_pool,
            http_client,
            jwks_cache,
            org_membership_cache,
            public_listings_cache,
        })
    }
}

#[derive(Clone)]
pub struct OrgMembershipCache {
    ttl: Duration,
    max_entries: usize,
    entries: Arc<RwLock<HashMap<String, CachedOrgMembership>>>,
    key_locks: Arc<Mutex<HashMap<String, Arc<Mutex<()>>>>>,
}

#[derive(Clone)]
struct CachedOrgMembership {
    value: Option<Value>,
    expires_at: Instant,
}

#[derive(Clone)]
pub struct PublicListingsCache {
    ttl: Duration,
    max_entries: usize,
    entries: Arc<RwLock<HashMap<String, CachedPublicListings>>>,
    key_locks: Arc<Mutex<HashMap<String, Arc<Mutex<()>>>>>,
}

#[derive(Clone)]
struct CachedPublicListings {
    value: Value,
    expires_at: Instant,
}

impl OrgMembershipCache {
    pub fn new(ttl_seconds: u64, max_entries: usize) -> Self {
        Self {
            ttl: Duration::from_secs(ttl_seconds.max(1)),
            max_entries: max_entries.max(100),
            entries: Arc::new(RwLock::new(HashMap::new())),
            key_locks: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn key(user_id: &str, org_id: &str) -> String {
        format!("{org_id}:{user_id}")
    }

    pub async fn get(&self, user_id: &str, org_id: &str) -> Option<Option<Value>> {
        let key = Self::key(user_id, org_id);
        let now = Instant::now();
        let entry = {
            let entries = self.entries.read().await;
            entries.get(&key).cloned()
        };

        match entry {
            Some(cached) if cached.expires_at > now => Some(cached.value),
            Some(_) => {
                self.entries.write().await.remove(&key);
                None
            }
            None => None,
        }
    }

    pub async fn put(&self, user_id: &str, org_id: &str, value: Option<Value>) {
        let key = Self::key(user_id, org_id);
        let mut entries = self.entries.write().await;
        if entries.len() >= self.max_entries {
            let now = Instant::now();
            entries.retain(|_, cached| cached.expires_at > now);
            if entries.len() >= self.max_entries {
                entries.clear();
            }
        }
        entries.insert(
            key,
            CachedOrgMembership {
                value,
                expires_at: Instant::now() + self.ttl,
            },
        );
    }

    pub async fn invalidate(&self, user_id: &str, org_id: &str) {
        let key = Self::key(user_id, org_id);
        self.entries.write().await.remove(&key);
    }

    pub async fn key_lock(&self, user_id: &str, org_id: &str) -> Arc<Mutex<()>> {
        let key = Self::key(user_id, org_id);
        let mut locks = self.key_locks.lock().await;
        if locks.len() >= self.max_entries {
            locks.clear();
        }
        locks
            .entry(key)
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    }
}

impl PublicListingsCache {
    pub fn new(ttl_seconds: u64, max_entries: usize) -> Self {
        Self {
            ttl: Duration::from_secs(ttl_seconds.max(1)),
            max_entries: max_entries.max(100),
            entries: Arc::new(RwLock::new(HashMap::new())),
            key_locks: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn get(&self, key: &str) -> Option<Value> {
        let now = Instant::now();
        let entry = {
            let entries = self.entries.read().await;
            entries.get(key).cloned()
        };

        match entry {
            Some(cached) if cached.expires_at > now => Some(cached.value),
            Some(_) => {
                self.entries.write().await.remove(key);
                None
            }
            None => None,
        }
    }

    pub async fn put(&self, key: String, value: Value) {
        let mut entries = self.entries.write().await;
        if entries.len() >= self.max_entries {
            let now = Instant::now();
            entries.retain(|_, cached| cached.expires_at > now);
            if entries.len() >= self.max_entries {
                entries.clear();
            }
        }

        entries.insert(
            key,
            CachedPublicListings {
                value,
                expires_at: Instant::now() + self.ttl,
            },
        );
    }

    pub async fn clear(&self) {
        self.entries.write().await.clear();
    }

    pub async fn key_lock(&self, key: &str) -> Arc<Mutex<()>> {
        let mut locks = self.key_locks.lock().await;
        if locks.len() >= self.max_entries {
            locks.clear();
        }
        locks
            .entry(key.to_string())
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    }
}
