export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing Supabase config: set NEXT_PUBLIC_SUPABASE_URL in apps/admin/.env.local (or your env)."
    );
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_KEY;
  if (!key) {
    throw new Error(
      "Missing Supabase config: set NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in apps/admin/.env.local."
    );
  }
  return key;
}

export function getSiteUrl(): string {
  // Used for auth redirects in local dev + production.
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}
