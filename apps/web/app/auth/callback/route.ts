import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3000";

function safeNext(value: string | null): string {
  const fallback = `${ADMIN_URL}/app`;
  if (!value) return fallback;
  // Block javascript: and other dangerous protocols
  if (/^[a-z]+:/i.test(value) && !value.startsWith("http")) return fallback;
  // Allow relative paths (but not protocol-relative //evil.com)
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  // Allow redirects to admin app — reject embedded credentials
  try {
    const url = new URL(value);
    if (url.username || url.password) return fallback;
    const adminOrigin = new URL(ADMIN_URL).origin;
    if (url.origin === adminOrigin) return value;
  } catch {
    // invalid URL
  }
  return fallback;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNext(requestUrl.searchParams.get("next"));

  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(loginUrl);
    }
  }

  // If next is an absolute URL (admin app), redirect there directly
  if (next.startsWith("http")) {
    return NextResponse.redirect(next);
  }

  const redirectUrl = new URL(next, requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
