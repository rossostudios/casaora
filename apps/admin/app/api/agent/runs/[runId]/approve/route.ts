import { NextResponse } from "next/server";

import { forwardAgentRequest } from "@/app/api/agent/_proxy";

type RouteParams = {
  params: Promise<{ runId: string }>;
};

type ApprovePayload = {
  org_id?: string;
  note?: string | null;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { runId } = await params;

  let payload: ApprovePayload;
  try {
    payload = (await request.json()) as ApprovePayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const orgId = payload.org_id?.trim() ?? "";
  if (!(runId && orgId)) {
    return NextResponse.json(
      { ok: false, error: "runId and org_id are required." },
      { status: 400 }
    );
  }

  return forwardAgentRequest(
    `/agent/runs/${encodeURIComponent(runId)}/approve?org_id=${encodeURIComponent(orgId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        note: typeof payload.note === "string" ? payload.note : null,
      }),
    }
  );
}
