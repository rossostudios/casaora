import { NextResponse } from "next/server";

import { forwardAgentRequest } from "@/app/api/agent/_proxy";

export function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("org_id")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";
  const kind = url.searchParams.get("kind")?.trim() ?? "";
  const priority = url.searchParams.get("priority")?.trim() ?? "";
  const runId = url.searchParams.get("run_id")?.trim() ?? "";

  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "org_id is required." },
      { status: 400 }
    );
  }

  return forwardAgentRequest(
    `/agent/approvals?org_id=${encodeURIComponent(orgId)}${status ? `&status=${encodeURIComponent(status)}` : ""}${kind ? `&kind=${encodeURIComponent(kind)}` : ""}${priority ? `&priority=${encodeURIComponent(priority)}` : ""}${runId ? `&run_id=${encodeURIComponent(runId)}` : ""}`
  );
}
