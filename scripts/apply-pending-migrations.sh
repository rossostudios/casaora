#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-${ROOT_DIR}/db/migrations}"
LEDGER_MIGRATION="${LEDGER_MIGRATION:-${MIGRATIONS_DIR}/2026-03-07_schema-migrations-ledger.sql}"
EXECUTOR="${CASAORA_MIGRATION_EXECUTOR:-local}"
BASE_RUNNER="${AWS_SQL_RUNNER:-${ROOT_DIR}/scripts/aws/run-rds-sql-task.sh}"
BASELINE_EXISTING=0

usage() {
  cat <<'EOF'
Usage:
  ./scripts/apply-pending-migrations.sh [--baseline-existing]

Environment:
  CASAORA_MIGRATION_EXECUTOR=local|aws   Default: local
  DATABASE_URL                          Required for local executor
  AWS_SQL_RUNNER                        Optional override for AWS executor
  MIGRATIONS_DIR                        Optional override for migrations directory

Notes:
  --baseline-existing marks all current migration files as applied in the
  schema_migrations ledger without executing them. Use only after verifying the
  target database already matches the repo schema.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --baseline-existing)
      BASELINE_EXISTING=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "Migrations directory not found: ${MIGRATIONS_DIR}" >&2
  exit 1
fi

if [[ ! -f "${LEDGER_MIGRATION}" ]]; then
  echo "Ledger migration file not found: ${LEDGER_MIGRATION}" >&2
  exit 1
fi

require_bin() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

checksum_file() {
  local file="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    sha256sum "$file" | awk '{print $1}'
  fi
}

sql_escape() {
  printf '%s' "$1" | sed "s/'/''/g"
}

make_temp_sql() {
  local path
  path="${TMPDIR:-/tmp}/casaora-migration-${RANDOM}-${RANDOM}.sql"
  : > "${path}"
  printf '%s\n' "${path}"
}

run_sql_file() {
  local sql_file="$1"
  case "${EXECUTOR}" in
    local)
      if [[ -z "${DATABASE_URL:-}" ]]; then
        echo "DATABASE_URL is required when CASAORA_MIGRATION_EXECUTOR=local" >&2
        exit 1
      fi
      psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${sql_file}"
      ;;
    aws)
      SQL_FILE="${sql_file}" "${BASE_RUNNER}"
      ;;
    *)
      echo "Unsupported CASAORA_MIGRATION_EXECUTOR: ${EXECUTOR}" >&2
      exit 1
      ;;
  esac
}

query_ledger() {
  local sql_file output
  sql_file="$(make_temp_sql)"
  cat > "${sql_file}" <<'SQL'
\pset format unaligned
\pset tuples_only on
SELECT filename || '|' || checksum_sha256
FROM schema_migrations
ORDER BY filename;
SQL
  output="$(run_sql_file "${sql_file}" 2>&1 || true)"
  rm -f "${sql_file}"
  printf '%s\n' "${output}" \
    | tr '\t' '\n' \
    | grep -Eo '20[0-9]{2}-[0-9]{2}[^[:space:]]+\.sql\|[0-9a-f]{64}' || true
}

insert_ledger_row_sql() {
  local filename="$1"
  local checksum="$2"
  local applied_by="$3"
  local escaped_filename escaped_checksum escaped_applied_by
  escaped_filename="$(sql_escape "${filename}")"
  escaped_checksum="$(sql_escape "${checksum}")"
  escaped_applied_by="$(sql_escape "${applied_by}")"
  cat <<SQL
INSERT INTO schema_migrations (filename, checksum_sha256, applied_by)
VALUES ('${escaped_filename}', '${escaped_checksum}', '${escaped_applied_by}')
ON CONFLICT (filename) DO NOTHING;
SQL
}

apply_migration() {
  local file="$1"
  local filename checksum applied_by sql_file start_ts end_ts duration_ms
  filename="$(basename "${file}")"
  checksum="$(checksum_file "${file}")"
  applied_by="${MIGRATION_APPLIED_BY:-${USER:-unknown}@$(hostname)}"
  sql_file="$(make_temp_sql)"
  start_ts="$(date +%s)"
  cat "${file}" > "${sql_file}"
  printf '\n%s\n' "$(insert_ledger_row_sql "${filename}" "${checksum}" "${applied_by}")" >> "${sql_file}"
  run_sql_file "${sql_file}"
  rm -f "${sql_file}"
  end_ts="$(date +%s)"
  duration_ms="$(( (end_ts - start_ts) * 1000 ))"
  echo "applied ${filename} (${duration_ms}ms)"
}

lookup_applied_checksum() {
  local filename="$1"
  local ledger_file="$2"
  awk -F'|' -v target="${filename}" '$1 == target { print $2; exit }' "${ledger_file}"
}

require_bin awk
require_bin grep
require_bin sort
require_bin tr
if [[ "${EXECUTOR}" == "local" ]]; then
  require_bin psql
fi

echo "==> Bootstrapping schema_migrations ledger"
run_sql_file "${LEDGER_MIGRATION}" >/dev/null

ledger_cache_file="$(make_temp_sql)"
query_ledger > "${ledger_cache_file}"

if ! find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name '*.sql' | grep -q .; then
  rm -f "${ledger_cache_file}"
  echo "No migration files found in ${MIGRATIONS_DIR}"
  exit 0
fi

pending_count=0
baseline_sql_file=""
if [[ "${BASELINE_EXISTING}" -eq 1 ]]; then
  baseline_sql_file="$(make_temp_sql)"
fi
while IFS= read -r file; do
  filename="$(basename "${file}")"
  checksum="$(checksum_file "${file}")"
  applied_checksum="$(lookup_applied_checksum "${filename}" "${ledger_cache_file}")"

  if [[ -n "${applied_checksum}" ]]; then
    if [[ "${applied_checksum}" != "${checksum}" ]]; then
      rm -f "${ledger_cache_file}"
      echo "Checksum mismatch for applied migration ${filename}" >&2
      echo "  ledger: ${applied_checksum}" >&2
      echo "  local:  ${checksum}" >&2
      exit 2
    fi
    continue
  fi

  pending_count=$((pending_count + 1))
  if [[ "${BASELINE_EXISTING}" -eq 1 ]]; then
    insert_ledger_row_sql \
      "${filename}" \
      "${checksum}" \
      "${MIGRATION_APPLIED_BY:-${USER:-unknown}@$(hostname)} [baseline]" \
      >> "${baseline_sql_file}"
  else
    apply_migration "${file}"
  fi
done < <(find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name '*.sql' | sort)

rm -f "${ledger_cache_file}"

if [[ "${pending_count}" -eq 0 ]]; then
  rm -f "${baseline_sql_file:-}"
  echo "No pending migrations."
elif [[ "${BASELINE_EXISTING}" -eq 1 ]]; then
  run_sql_file "${baseline_sql_file}" >/dev/null
  rm -f "${baseline_sql_file}"
  echo "Baselined ${pending_count} migration(s) into schema_migrations."
else
  echo "Applied ${pending_count} pending migration(s)."
fi
