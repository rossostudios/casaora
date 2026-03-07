import { NextResponse } from "next/server";

import { forwardAgentRequest } from "@/app/api/agent/_proxy";

type RouteParams = {
  params: Promise<{ runId: string }>;
};

type CancelPayload = {
  org_id?: string;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { runId } = await params;

  let payload: CancelPayload;
  try {
    payload = (await request.json()) as CancelPayload;
  } catch {
    payload = {};
  }

  const orgId = payload.org_id?.trim() ?? "";
  if (!(runId && orgId)) {
    return NextResponse.json(
      { ok: false, error: "runId and org_id are required." },
      { status: 400 }
    );
  }

  return forwardAgentRequest(
    `/agent/runs/${encodeURIComponent(runId)}/cancel?org_id=${encodeURIComponent(orgId)}`,
    {
      method: "POST",
    }
  );
}
