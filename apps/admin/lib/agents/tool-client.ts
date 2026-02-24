import type {
  ExecuteToolRequest,
  ExecuteToolResponse,
  ToolDefinition,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";

/**
 * Fetch tool definitions from the Rust backend.
 * Returns AI SDK 6 compatible tool schemas.
 */
export async function fetchToolDefinitions(
  token: string,
  orgId: string,
  agentSlug?: string
): Promise<ToolDefinition[]> {
  const params = new URLSearchParams({ org_id: orgId });
  if (agentSlug) params.set("agent_slug", agentSlug);

  const res = await fetch(`${API_BASE_URL}/agent/tool-definitions?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const payload = (await res.json()) as { tools?: ToolDefinition[] };
  return payload.tools ?? [];
}

/**
 * Execute a single tool via the Rust backend.
 * Used by the AI SDK 6 tool loop to delegate tool execution.
 */
export async function executeToolOnBackend(
  token: string,
  request: ExecuteToolRequest
): Promise<ExecuteToolResponse> {
  const res = await fetch(`${API_BASE_URL}/agent/execute-tool`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Tool execution failed");
    return {
      organization_id: request.org_id,
      tool_name: request.tool_name,
      ok: false,
      result: { ok: false, error: text },
    };
  }

  return (await res.json()) as ExecuteToolResponse;
}
