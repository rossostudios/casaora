import { NextResponse } from "next/server";

import { shouldUseSecureCookie } from "@/lib/cookies";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/i18n";

type Body = {
  locale?: string;
  lang?: string;
  value?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const locale = normalizeLocale(body.locale ?? body.lang ?? body.value);

  if (!locale) {
    return NextResponse.json(
      { ok: false, error: "locale is required" },
      { status: 400 }
    );
  }

  // Set cookie on the response to ensure the browser receives `Set-Cookie`.
  // (Some Next versions don't reliably persist mutations via `cookies().set()`.)
  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    // Allow cookies to work when running production builds over plain HTTP
    // (e.g. `next start` locally), while still using Secure cookies on HTTPS.
    secure: shouldUseSecureCookie(request.headers, request.url),
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOCALE_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
