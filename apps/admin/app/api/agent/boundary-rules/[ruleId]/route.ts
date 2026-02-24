import { NextResponse } from "next/server";

import { forwardAgentRequest } from "@/app/api/agent/_proxy";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { ruleId } = await params;
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id")?.trim() ?? "";

  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "org_id is required." },
      { status: 400 }
    );
  }

  let body: string;
  try {
    body = JSON.stringify(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  return forwardAgentRequest(
    `/agent/boundary-rules/${encodeURIComponent(ruleId)}?org_id=${encodeURIComponent(orgId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    }
  );
}
