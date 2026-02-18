import { NextResponse } from "next/server";

import { forwardNotificationsRequest } from "@/app/api/notifications/_proxy";

type ReadAllPayload = {
  org_id?: string;
};

export async function POST(request: Request) {
  let payload: ReadAllPayload;
  try {
    payload = (await request.json()) as ReadAllPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const orgId = payload.org_id?.trim();
  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "Missing org_id" },
      { status: 400 }
    );
  }

  return forwardNotificationsRequest("/notifications/read-all", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ org_id: orgId }),
  });
}
