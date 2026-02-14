# Puerta Abierta Rust Backend (Migration Service)

This service is the Axum + SQLx backend used to migrate off FastAPI while preserving `/v1` API compatibility.

## Migration status

All 123/123 FastAPI endpoints have been migrated to Rust (Axum) with full wire compatibility. The proxy fallback (`PROXY_UNMIGRATED_TO`) is no longer required for any endpoint.

## Run locally

```bash
cd /Users/christopher/Desktop/puerta-abierta/apps/backend-rs
cp .env.example .env
cargo run
```

Default port is `8100` in this service to support dual-run with FastAPI (`8000`).
