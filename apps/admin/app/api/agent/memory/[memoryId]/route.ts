import { NextResponse } from "next/server";

import { forwardAgentRequest } from "@/app/api/agent/_proxy";

export function DELETE(
  request: Request,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  return params.then(({ memoryId }) => {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("org_id")?.trim() ?? "";

    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "org_id is required." },
        { status: 400 }
      );
    }

    return forwardAgentRequest(
      `/agent/memory/${encodeURIComponent(memoryId)}?org_id=${encodeURIComponent(orgId)}`,
      { method: "DELETE" }
    );
  });
}
