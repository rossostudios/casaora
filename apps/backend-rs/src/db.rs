use std::time::Duration;

use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions, PgSslMode},
    PgPool,
};
use url::Url;

use crate::{config::AppConfig, error::AppError};

pub fn create_pool(config: &AppConfig) -> Result<Option<PgPool>, AppError> {
    let Some(database_url) = config.supabase_db_url.as_ref() else {
        return Ok(None);
    };

    // Parse the URL manually so we preserve the full username.
    // sqlx's PgConnectOptions::from_str can strip the project ref suffix
    // (e.g. "postgres.thzhbiojhdeifjqhhzli" → "postgres") which breaks
    // Supabase's session-mode pooler authentication.
    let url = Url::parse(database_url)
        .map_err(|e| AppError::Dependency(format!("Invalid database URL: {e}")))?;

    let username = url.username();
    let password = url.password().unwrap_or("");
    let host = url.host_str().unwrap_or("localhost");
    let port = url.port().unwrap_or(5432);
    let database = url.path().trim_start_matches('/');

    // Check for ?sslmode= in the URL, default to Require for pooler connections.
    let ssl_mode = url
        .query_pairs()
        .find(|(k, _)| k == "sslmode")
        .map(|(_, v)| match v.as_ref() {
            "disable" => PgSslMode::Disable,
            "prefer" => PgSslMode::Prefer,
            "require" => PgSslMode::Require,
            "verify-ca" => PgSslMode::VerifyCa,
            "verify-full" => PgSslMode::VerifyFull,
            _ => PgSslMode::Require,
        })
        .unwrap_or(PgSslMode::Require);

    tracing::info!(
        db_user = username,
        db_host = host,
        db_port = port,
        db_name = database,
        ssl_mode = ?ssl_mode,
        "Configuring database pool"
    );

    let connect_options = PgConnectOptions::new()
        .host(host)
        .port(port)
        .username(username)
        .password(password)
        .database(database)
        .ssl_mode(ssl_mode);

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .idle_timeout(Duration::from_secs(600))
        .test_before_acquire(true)
        .connect_lazy_with(connect_options);

    Ok(Some(pool))
}
