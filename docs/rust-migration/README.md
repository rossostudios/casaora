# Rust Migration Guide

This folder tracks migration from FastAPI (`apps/backend`) to Axum (`apps/backend-rs`) with strict wire compatibility.

## Current implementation in this repository

- New Rust service scaffold in `apps/backend-rs`
- Config parity surface in `apps/backend-rs/src/config.rs`
- Security/trusted-host middleware parity in `apps/backend-rs/src/middleware/security.rs`
- All 123/123 FastAPI endpoints migrated to Rust (Axum)
- Proxy fallback (`PROXY_UNMIGRATED_TO`) is no longer needed for any endpoint
- Route inventory generator:
  - `scripts/migration/build_route_matrix.py`
- Parity harness:
  - `scripts/parity/run_parity.py`
  - `scripts/parity/request-corpus.json`

## Generate/refresh migration matrix

```bash
cd /Users/christopher/Desktop/puerta-abierta
python3 scripts/migration/build_route_matrix.py
```

Outputs:

- `docs/rust-migration/route-matrix.md`
- `docs/rust-migration/route-matrix.json`

## Build OpenAPI coverage gap report

```bash
cd /Users/christopher/Desktop/puerta-abierta
python3 scripts/migration/build_openapi_gap_report.py
```

Output:

- `docs/rust-migration/openapi-gap-report.md`

## Run parity checks

```bash
python3 scripts/parity/run_parity.py \
  --fastapi-base-url http://localhost:8000 \
  --rust-base-url http://localhost:8100
```

Or via quality gate:

```bash
RUN_PARITY=1 ./scripts/quality-gate.sh fast
```
