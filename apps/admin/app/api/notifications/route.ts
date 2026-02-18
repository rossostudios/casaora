import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { forwardNotificationsRequest } from "@/app/api/notifications/_proxy";

export function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("org_id")?.trim();
  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "Missing org_id" },
      { status: 400 }
    );
  }

  const qs = new URLSearchParams();
  qs.set("org_id", orgId);

  const limit = request.nextUrl.searchParams.get("limit")?.trim();
  if (limit) qs.set("limit", limit);

  const cursor = request.nextUrl.searchParams.get("cursor")?.trim();
  if (cursor) qs.set("cursor", cursor);

  const status = request.nextUrl.searchParams.get("status")?.trim();
  if (status) qs.set("status", status);

  const category = request.nextUrl.searchParams.get("category")?.trim();
  if (category) qs.set("category", category);

  return forwardNotificationsRequest(`/notifications?${qs.toString()}`);
}
