use std::sync::Arc;

use reqwest::Client;
use sqlx::PgPool;

use crate::{config::AppConfig, db::create_pool, error::AppResult};

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub db_pool: Option<PgPool>,
    pub http_client: Client,
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

        Ok(Self {
            config: Arc::new(config),
            db_pool,
            http_client,
        })
    }
}
