#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export CASAORA_MIGRATION_EXECUTOR=local
exec "${ROOT_DIR}/scripts/apply-pending-migrations.sh" "$@"
