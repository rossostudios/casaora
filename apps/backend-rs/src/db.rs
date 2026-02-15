use std::time::Duration;

use sqlx::{postgres::PgPoolOptions, PgPool};

use crate::{config::AppConfig, error::AppError};

pub fn create_pool(config: &AppConfig) -> Result<Option<PgPool>, AppError> {
    let Some(database_url) = config.supabase_db_url.as_ref() else {
        return Ok(None);
    };

    PgPoolOptions::new()
        .max_connections(20)
        .min_connections(2)
        .acquire_timeout(Duration::from_secs(5))
        .idle_timeout(Duration::from_secs(600))
        .test_before_acquire(true)
        .connect_lazy(database_url)
        .map(Some)
        .map_err(|error| {
            AppError::Dependency(format!("Could not initialize database pool: {error}"))
        })
}
