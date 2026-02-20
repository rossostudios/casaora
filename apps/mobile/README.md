# Casaora Mobile (Expo)

## 1) Install dependencies

```bash
cd /Users/christopher/Desktop/puerta-abierta/apps/mobile
npm install
```

## 2) Configure environment

```bash
cp .env.example .env.local
```

Set `EXPO_PUBLIC_API_BASE_URL` to your Rust backend (`/v1` prefix).
Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for auth.
Legacy fallback is also supported with `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
Optionally set `EXPO_PUBLIC_DEFAULT_ORG_ID` to force a default org for `/tasks` list queries.

## 3) Run app

```bash
npm run ios
# or
npm run android
```

## Shared API package

This app consumes:

- `@casaora/shared-api/client`
- `@casaora/shared-api/types`

Source package path:
`/Users/christopher/Desktop/puerta-abierta/packages/shared-api`

## Auth flow

- Sign-in screen lives at `/Users/christopher/Desktop/puerta-abierta/apps/mobile/app/(auth)/sign-in.tsx`
- Protected tabs are gated in `/Users/christopher/Desktop/puerta-abierta/apps/mobile/app/(tabs)/_layout.tsx`
- Supabase session is managed in `/Users/christopher/Desktop/puerta-abierta/apps/mobile/lib/auth.tsx`

## Tasks flow

- Task list tab: `/Users/christopher/Desktop/puerta-abierta/apps/mobile/app/(tabs)/tasks/index.tsx`
- Task detail: `/Users/christopher/Desktop/puerta-abierta/apps/mobile/app/(tabs)/tasks/[id].tsx`
- API bindings: `/Users/christopher/Desktop/puerta-abierta/apps/mobile/lib/api.ts`
