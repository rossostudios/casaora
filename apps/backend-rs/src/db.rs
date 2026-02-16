use std::{str::FromStr, time::Duration};

use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    PgPool,
};

use crate::{config::AppConfig, error::AppError};

pub fn create_pool(config: &AppConfig) -> Result<Option<PgPool>, AppError> {
    let Some(database_url) = config.supabase_db_url.as_ref() else {
        return Ok(None);
    };

    // Parse the URL into connect options so we can set a TCP connect timeout.
    // Without this, the first connection can hang for 60-120s if the DB host
    // is unreachable, which blocks Railway healthchecks.
    let connect_options = PgConnectOptions::from_str(database_url)
        .map_err(|e| AppError::Dependency(format!("Invalid database URL: {e}")))?;

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .idle_timeout(Duration::from_secs(600))
        .test_before_acquire(true)
        .connect_lazy_with(connect_options);

    Ok(Some(pool))
}
