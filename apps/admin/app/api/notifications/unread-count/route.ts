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
  return forwardNotificationsRequest(
    `/notifications/unread-count?${qs.toString()}`
  );
}
