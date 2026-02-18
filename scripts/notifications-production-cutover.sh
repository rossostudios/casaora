#!/usr/bin/env bash
set -euo pipefail

RUN=0
KEEP_STAGING=0
BACKEND_URL="${BACKEND_URL:-https://casaora.up.railway.app}"

STAGING_ENV="${STAGING_ENV:-staging}"
PROD_ENV="${PROD_ENV:-production}"
BACKEND_SERVICE="${BACKEND_SERVICE:-puerta-abierta}"

PROCESS_FUNCTION="${PROCESS_FUNCTION:-process-notifications}"
RETENTION_FUNCTION="${RETENTION_FUNCTION:-notifications-retention}"

PROCESS_PATH="${PROCESS_PATH:-apps/backend-rs/railway-functions/process-notifications.ts}"
RETENTION_PATH="${RETENTION_PATH:-apps/backend-rs/railway-functions/notifications-retention.ts}"

PROCESS_CRON="${PROCESS_CRON:-*/5 * * * *}"
RETENTION_CRON="${RETENTION_CRON:-15 3 * * *}"

usage() {
  cat <<'USAGE'
Usage: ./scripts/notifications-production-cutover.sh [options]

Options:
  --run                 Execute commands. Without this, prints a dry run only.
  --keep-staging        Keep staging schedulers (skip staging function deletion).
  --backend-url <url>   Override backend URL used for smoke checks.
  -h, --help            Show this help.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run)
      RUN=1
      ;;
    --keep-staging)
      KEEP_STAGING=1
      ;;
    --backend-url)
      shift
      BACKEND_URL="${1:-}"
      if [[ -z "$BACKEND_URL" ]]; then
        echo "Missing value for --backend-url"
        exit 1
      fi
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd"
    exit 1
  fi
}

require_cmd railway
require_cmd jq
require_cmd curl
require_cmd grep

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

run_cmd() {
  printf '+'
  for arg in "$@"; do
    printf ' %q' "$arg"
  done
  printf '\n'
  if [[ "$RUN" -eq 1 ]]; then
    "$@"
  fi
}

function_exists() {
  local env="$1"
  local name="$2"
  railway functions -e "$env" list 2>/dev/null | grep -q "^${name} "
}

wait_for_backend_deploy() {
  local max_attempts=60
  local sleep_seconds=3
  local attempt=1

  while [[ "$attempt" -le "$max_attempts" ]]; do
    local json
    local deploy_id
    local deploy_status

    json="$(railway deployment list -s "$BACKEND_SERVICE" -e "$PROD_ENV" --json --limit 1)"
    deploy_id="$(echo "$json" | jq -r '.[0].id // "unknown"')"
    deploy_status="$(echo "$json" | jq -r '.[0].status // "unknown"')"

    echo "Deploy check ${attempt}/${max_attempts}: ${deploy_id} ${deploy_status}"

    case "$deploy_status" in
      SUCCESS)
        return 0
        ;;
      QUEUED|BUILDING|DEPLOYING|INITIALIZING)
        sleep "$sleep_seconds"
        ;;
      FAILED|CRASHED|REMOVED|CANCELED)
        echo "Deployment failed with status: $deploy_status"
        return 1
        ;;
      *)
        sleep "$sleep_seconds"
        ;;
    esac

    attempt=$((attempt + 1))
  done

  echo "Timed out waiting for deployment in $PROD_ENV/$BACKEND_SERVICE"
  return 1
}

echo "Cutover mode: $([[ "$RUN" -eq 1 ]] && echo "RUN" || echo "DRY-RUN")"
echo "Backend URL: $BACKEND_URL"
echo "Staging env: $STAGING_ENV"
echo "Production env: $PROD_ENV"
echo

if [[ "$KEEP_STAGING" -eq 0 ]]; then
  if function_exists "$STAGING_ENV" "$PROCESS_FUNCTION"; then
    run_cmd railway functions -e "$STAGING_ENV" delete --function "$PROCESS_FUNCTION" --yes
  else
    echo "Skip delete: $STAGING_ENV/$PROCESS_FUNCTION does not exist."
  fi

  if function_exists "$STAGING_ENV" "$RETENTION_FUNCTION"; then
    run_cmd railway functions -e "$STAGING_ENV" delete --function "$RETENTION_FUNCTION" --yes
  else
    echo "Skip delete: $STAGING_ENV/$RETENTION_FUNCTION does not exist."
  fi
else
  echo "Keeping staging functions because --keep-staging was set."
fi

if function_exists "$PROD_ENV" "$PROCESS_FUNCTION"; then
  run_cmd railway functions -e "$PROD_ENV" delete --function "$PROCESS_FUNCTION" --yes
fi
run_cmd railway functions -e "$PROD_ENV" new --name "$PROCESS_FUNCTION" --path "$PROCESS_PATH" --cron "$PROCESS_CRON" --http false

if function_exists "$PROD_ENV" "$RETENTION_FUNCTION"; then
  run_cmd railway functions -e "$PROD_ENV" delete --function "$RETENTION_FUNCTION" --yes
fi
run_cmd railway functions -e "$PROD_ENV" new --name "$RETENTION_FUNCTION" --path "$RETENTION_PATH" --cron "$RETENTION_CRON" --http false

run_cmd railway variable set NOTIFICATION_RULES_ENFORCED=true -s "$BACKEND_SERVICE" -e "$PROD_ENV"

if [[ "$RUN" -eq 1 ]]; then
  wait_for_backend_deploy

  echo
  echo "Running smoke checks..."
  health_json="$(curl -fsS "$BACKEND_URL/v1/health")"
  process_json="$(curl -fsS -X POST "$BACKEND_URL/v1/internal/process-notifications")"
  retention_json="$(curl -fsS -X POST "$BACKEND_URL/v1/internal/notifications-retention")"

  echo "health: $(echo "$health_json" | jq -c '.')"
  echo "process-notifications: $(echo "$process_json" | jq -c '.')"
  echo "notifications-retention: $(echo "$retention_json" | jq -c '.')"

  mode="$(echo "$process_json" | jq -r '.mode // empty')"
  if [[ "$mode" != "event_rules" ]]; then
    echo "Unexpected process mode: '$mode' (expected 'event_rules')"
    exit 1
  fi
fi

echo
echo "Staging functions:"
run_cmd railway functions -e "$STAGING_ENV" list
echo
echo "Production functions:"
run_cmd railway functions -e "$PROD_ENV" list

echo
if [[ "$RUN" -eq 1 ]]; then
  echo "Cutover complete."
else
  echo "Dry run complete. Re-run with --run to execute."
fi
