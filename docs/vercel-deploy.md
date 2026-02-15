# Vercel + Railway Deployment Checklist

Use this split deployment:

- Admin (`apps/admin`) on Vercel
- Backend (`apps/backend-rs`) on Railway

## 1) Backend project (`apps/backend-rs`) on Railway

Root directory: `apps/backend-rs`

Config-as-code in repo:

- `apps/backend-rs/railway.toml` sets:
  - `startCommand` to run the compiled Rust binary
  - `healthcheckPath = "/v1/health"`

Required environment variables:

- `ENVIRONMENT=production`
- `CORS_ORIGINS=https://<your-admin-domain>`
- `SUPABASE_URL=<your-supabase-url>`
- `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`

Smoke checks:

- `GET https://<backend-domain>/v1/health` returns `200`

## 2) Admin project (`apps/admin`) on Vercel

Root directory: `apps/admin`

Required environment variables:

- `NEXT_PUBLIC_API_BASE_URL=https://<backend-domain>/v1`
- `NEXT_PUBLIC_SITE_URL=https://<admin-domain>`
- `NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>`

Optional:

- `API_TIMEOUT_MS=15000`
- `NEXT_PUBLIC_DEFAULT_ORG_ID=<org-uuid>`

Smoke checks:

- `GET https://<admin-domain>/login` returns `200`
- `GET https://<admin-domain>/` redirects to `/login` when signed out
- `GET https://<admin-domain>/api/me` returns `401` when signed out

## 3) Notes

Railway is the recommended host for the Rust/Axum backend. The compiled binary runs with minimal resource overhead.
