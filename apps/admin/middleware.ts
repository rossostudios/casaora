import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { ORG_COOKIE_NAME } from "@/lib/org";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

/**
 * Routes that are publicly accessible without authentication.
 * Matches the start of the pathname.
 */
const PUBLIC_PREFIXES = [
  "/marketplace",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/auth/callback",
  "/api/",
  "/tenant",
  "/pay",
  "/pricing",
  "/platform",
  "/sentry-example-page",
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through without any auth check
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Create a response we can mutate (for refreshing auth cookies)
  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh the session (important: this also refreshes expired tokens)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No authenticated user → redirect to login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated but no active org cookie → redirect to /setup
  // (unless they're already on /setup)
  const hasOrg = request.cookies.get(ORG_COOKIE_NAME)?.value?.trim();
  if (!hasOrg && pathname !== "/setup") {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Static assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
