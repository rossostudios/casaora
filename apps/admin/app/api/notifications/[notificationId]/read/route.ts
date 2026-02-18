import { NextResponse } from "next/server";

import { forwardNotificationsRequest } from "@/app/api/notifications/_proxy";

type ReadPayload = {
  org_id?: string;
};

type Params = {
  params: Promise<{ notificationId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { notificationId } = await params;
  const encodedNotificationId = encodeURIComponent(notificationId);

  const url = new URL(request.url);
  const queryOrgId = url.searchParams.get("org_id")?.trim();

  let bodyOrgId = "";
  if (!queryOrgId) {
    try {
      const payload = (await request.json()) as ReadPayload;
      bodyOrgId = payload.org_id?.trim() ?? "";
    } catch {
      bodyOrgId = "";
    }
  }

  const orgId = queryOrgId || bodyOrgId;
  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "Missing org_id" },
      { status: 400 }
    );
  }

  const qs = new URLSearchParams();
  qs.set("org_id", orgId);

  return forwardNotificationsRequest(
    `/notifications/${encodedNotificationId}/read?${qs.toString()}`,
    {
      method: "POST",
    }
  );
}
