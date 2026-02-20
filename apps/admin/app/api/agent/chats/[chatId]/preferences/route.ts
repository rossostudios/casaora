import { NextResponse } from "next/server";

import { forwardAgentRequest } from "@/app/api/agent/_proxy";

type RouteParams = {
  params: Promise<{ chatId: string }>;
};

type UpdatePreferencesPayload = {
  org_id?: string;
  preferred_model?: string | null;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const { chatId } = await params;

  let payload: UpdatePreferencesPayload;
  try {
    payload = (await request.json()) as UpdatePreferencesPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const orgId = payload.org_id?.trim() ?? "";

  if (!(chatId && orgId)) {
    return NextResponse.json(
      { ok: false, error: "chatId and org_id are required." },
      { status: 400 }
    );
  }

  return forwardAgentRequest(
    `/agent/chats/${encodeURIComponent(chatId)}/preferences?org_id=${encodeURIComponent(orgId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        preferred_model:
          typeof payload.preferred_model === "string"
            ? payload.preferred_model
            : null,
      }),
    }
  );
}
