import { NextResponse } from "next/server";

import { shouldUseSecureCookie } from "@/lib/cookies";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/i18n";

type Body = {
  locale?: string;
  lang?: string;
  value?: string;
};

function parseOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function expectedOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (!forwardedHost) return url.origin;

  const host = forwardedHost.split(",")[0]?.trim();
  if (!host) return url.origin;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto =
    forwardedProto?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const normalizedProto =
    proto === "http" || proto === "https"
      ? proto
      : url.protocol.replace(":", "");
  return `${normalizedProto}://${host}`;
}

function hasAllowedOrigin(request: Request): boolean {
  const expected = expectedOrigin(request);
  const origin = parseOrigin(request.headers.get("origin"));
  if (origin) return origin === expected;

  const refererOrigin = parseOrigin(request.headers.get("referer"));
  if (refererOrigin) return refererOrigin === expected;

  return false;
}

export async function POST(request: Request) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "origin not allowed" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const locale = normalizeLocale(body.locale ?? body.lang ?? body.value);

  if (!locale) {
    return NextResponse.json(
      { ok: false, error: "locale is required" },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
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
