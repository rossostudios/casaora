import { NextResponse } from "next/server";

import { shouldUseSecureCookie } from "@/lib/cookies";
import { ORG_COOKIE_NAME } from "@/lib/org";

type Body = {
  org_id?: string;
  orgId?: string;
};

function normalizeOrgId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const orgId = normalizeOrgId(body.org_id ?? body.orgId);
  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "org_id is required" },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ ok: true, org_id: orgId });
  response.cookies.set(ORG_COOKIE_NAME, orgId, {
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
  response.cookies.set(ORG_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
