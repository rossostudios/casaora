# Notifications Production Cutover Runbook

Last updated: February 18, 2026

## Current Status

- Production backend is deployed with notification center/rules engine code.
- Production flag is intentionally dormant: `NOTIFICATION_RULES_ENFORCED=false`.
- Staging has scheduler functions:
  - `process-notifications` (`*/5 * * * *`)
  - `notifications-retention` (`15 3 * * *`)
- Production has no scheduler functions yet due free plan resource limits.

## Goal on Launch Day

Move scheduler jobs from staging to production and enable rule-driven dispatch in production.

## Prerequisites

- Railway CLI authenticated for project `casaora`.
- Local tools installed: `railway`, `jq`, `curl`, `rg`.
- Understand that staging schedulers will be removed during cutover by default.

## One-Command Cutover

From repo root:

```bash
./scripts/notifications-production-cutover.sh --run
```

The script performs:

1. Delete staging scheduler functions (to free plan quota).
2. Create production scheduler functions with the same cron schedules.
3. Set production backend variable `NOTIFICATION_RULES_ENFORCED=true`.
4. Wait for production backend deployment completion.
5. Run smoke checks:
   - `GET /v1/health`
   - `POST /v1/internal/process-notifications` (expects `mode=event_rules`)
   - `POST /v1/internal/notifications-retention`
6. Print final scheduler state for staging and production.

## Dry Run

```bash
./scripts/notifications-production-cutover.sh
```

## Optional Flags

- `--keep-staging`: skip deleting staging functions first.
- `--backend-url https://casaora.up.railway.app`: override smoke-check base URL.

## Rollback

If needed, immediately disable rule-driven dispatch:

```bash
railway variable set NOTIFICATION_RULES_ENFORCED=false -s puerta-abierta -e production
```

Then verify:

```bash
curl -sS -X POST https://casaora.up.railway.app/v1/internal/process-notifications | jq -c .
```

Expected: `mode` should return `legacy`.
