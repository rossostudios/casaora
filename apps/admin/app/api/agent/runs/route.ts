import { NextResponse } from "next/server";

import { forwardAgentRequest } from "@/app/api/agent/_proxy";

type CreateRunPayload = {
  org_id?: string;
  mode?: string;
  agent_slug?: string;
  task?: string;
  context?: unknown;
  preferred_provider?: string;
  preferred_model?: string;
  allow_mutations?: boolean;
};

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id")?.trim() ?? "";

  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "org_id is required." },
      { status: 400 }
    );
  }

  const nextSearch = new URLSearchParams();
  nextSearch.set("org_id", orgId);
  const status = searchParams.get("status")?.trim() ?? "";
  const mode = searchParams.get("mode")?.trim() ?? "";
  const limit = searchParams.get("limit")?.trim() ?? "";
  if (status) nextSearch.set("status", status);
  if (mode) nextSearch.set("mode", mode);
  if (limit) nextSearch.set("limit", limit);

  return forwardAgentRequest(`/agent/runs?${nextSearch.toString()}`);
}

export async function POST(request: Request) {
  let payload: CreateRunPayload;
  try {
    payload = (await request.json()) as CreateRunPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const orgId = payload.org_id?.trim() ?? "";
  const mode = payload.mode?.trim() ?? "";
  const task = payload.task?.trim() ?? "";

  if (!(orgId && mode && task)) {
    return NextResponse.json(
      { ok: false, error: "org_id, mode, and task are required." },
      { status: 400 }
    );
  }

  return forwardAgentRequest("/agent/runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      org_id: orgId,
      mode,
      agent_slug:
        typeof payload.agent_slug === "string" ? payload.agent_slug : undefined,
      task,
      context:
        payload.context && typeof payload.context === "object"
          ? payload.context
          : {},
      preferred_provider:
        typeof payload.preferred_provider === "string"
          ? payload.preferred_provider
          : undefined,
      preferred_model:
        typeof payload.preferred_model === "string"
          ? payload.preferred_model
          : undefined,
      allow_mutations:
        typeof payload.allow_mutations === "boolean"
          ? payload.allow_mutations
          : false,
    }),
  });
}
