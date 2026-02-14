#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-full}"

echo "==> Puerta Abierta quality gate (${MODE})"

echo "==> Admin checks"
(
  cd "${ROOT_DIR}/apps/admin"
  npm run brand:check
  npm run deadcode:check
  npm run lint
  npm run typecheck
  if [[ "${MODE}" == "full" ]]; then
    npm run build
  fi
)

echo "==> Backend checks"
(
  cd "${ROOT_DIR}/apps/backend"
  if [[ ! -x "./.venv/bin/python" ]]; then
    echo "Missing backend virtualenv at apps/backend/.venv"
    exit 1
  fi
  ./.venv/bin/python -m ruff check app tests
  ./.venv/bin/python -m unittest discover -s tests -p "test_*.py"
)

if [[ -d "${ROOT_DIR}/apps/backend-rs" ]]; then
  echo "==> Rust backend checks"
  (
    cd "${ROOT_DIR}/apps/backend-rs"
    cargo fmt --all --check
    cargo clippy --all-targets --all-features -- -D warnings
    cargo test --all-targets --all-features
  )
fi

if [[ "${RUN_PARITY:-0}" == "1" ]]; then
  echo "==> FastAPI vs Rust parity checks"
  (
    cd "${ROOT_DIR}"
    python3 scripts/parity/run_parity.py \
      --fastapi-base-url "${PARITY_FASTAPI_URL:-http://localhost:8000}" \
      --rust-base-url "${PARITY_RUST_URL:-http://localhost:8100}"
  )
fi

echo "==> Quality gate passed"
