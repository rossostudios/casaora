import { NextResponse } from "next/server";

import { forwardAgentRequest } from "@/app/api/agent/_proxy";

type RouteParams = {
  params: Promise<{ runId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { runId } = await params;
  const orgId =
    new URL(request.url).searchParams.get("org_id")?.trim() ?? "";

  if (!(runId && orgId)) {
    return NextResponse.json(
      { ok: false, error: "runId and org_id are required." },
      { status: 400 }
    );
  }

  return forwardAgentRequest(
    `/agent/runs/${encodeURIComponent(runId)}/events?org_id=${encodeURIComponent(orgId)}`
  );
}
