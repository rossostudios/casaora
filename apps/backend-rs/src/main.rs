mod auth;
mod config;
mod db;
mod error;
mod middleware;
mod repository;
mod routes;
mod schemas;
mod services;
mod state;
mod tenancy;

use std::net::SocketAddr;

use axum::{middleware::from_fn_with_state, Router};
use config::AppConfig;
use middleware::{cors::build_cors_layer, security::enforce_trusted_hosts};
use state::AppState;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::dotenv();
    init_tracing();

    let config = AppConfig::from_env();
    let state = AppState::build(config)?;

    let app = Router::new()
        .nest(&state.config.api_prefix, routes::v1_router())
        .layer(TraceLayer::new_for_http())
        .layer(build_cors_layer(&state.config))
        .layer(from_fn_with_state(state.clone(), enforce_trusted_hosts))
        .with_state(state.clone());

    let socket_addr: SocketAddr = format!("{}:{}", state.config.host, state.config.port).parse()?;
    let listener = tokio::net::TcpListener::bind(socket_addr).await?;

    tracing::info!(
        app_name = %state.config.app_name,
        environment = %state.config.environment,
        api_prefix = %state.config.api_prefix,
        docs_enabled_runtime = state.config.docs_enabled_runtime(),
        "Rust backend listening"
    );

    axum::serve(listener, app).await?;
    Ok(())
}

fn init_tracing() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,tower_http=info"));
    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_target(false)
        .compact()
        .init();
}
