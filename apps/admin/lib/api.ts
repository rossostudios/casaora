import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";

type QueryValue = string | number | boolean | undefined | null;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function fetchJson<T>(
  path: string,
  query?: Record<string, QueryValue>,
  init?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    const token = await getAccessToken();
    response = await fetch(buildUrl(path, query), {
      cache: "no-store",
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `API fetch failed for ${path}. Is the backend running at ${API_BASE_URL}? (${message})`
    );
  }

  if (!response.ok) {
    let detailsText = "";
    try {
      detailsText = await response.text();
    } catch {
      detailsText = "";
    }

    let detailMessage = detailsText;
    if (detailsText) {
      try {
        const parsed = JSON.parse(detailsText) as {
          detail?: unknown;
          error?: unknown;
          message?: unknown;
        };
        const detail =
          parsed?.detail ?? parsed?.error ?? parsed?.message ?? detailsText;

        if (typeof detail === "string") {
          detailMessage = detail;
        } else if (Array.isArray(detail)) {
          // FastAPI validation errors are usually an array with `msg` fields.
          const messages = detail
            .map((item) => {
              if (!item || typeof item !== "object") return "";
              const record = item as Record<string, unknown>;
              return typeof record.msg === "string" ? record.msg : "";
            })
            .filter(Boolean);
          if (messages.length) detailMessage = messages.join("; ");
        }
      } catch {
        // Keep the raw response text when it isn't JSON.
      }
    }

    const suffix = detailMessage ? `: ${detailMessage.slice(0, 240)}` : "";
    throw new Error(
      `API request failed (${response.status}) for ${path}${suffix}`
    );
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function fetchList(
  path: string,
  orgId: string,
  limit = 50,
  extraQuery?: Record<string, QueryValue>
): Promise<unknown[]> {
  const data = await fetchJson<{ data?: unknown[] }>(path, {
    org_id: orgId,
    limit,
    ...(extraQuery ?? {}),
  });
  return data.data ?? [];
}

export async function fetchOrganizations(limit = 50): Promise<unknown[]> {
  const data = await fetchJson<{ data?: unknown[] }>("/organizations", {
    limit,
  });
  return data.data ?? [];
}

export function fetchOwnerSummary(
  path: string,
  orgId: string
): Promise<Record<string, unknown>> {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const to = today.toISOString().slice(0, 10);

  return fetchJson<Record<string, unknown>>(path, { org_id: orgId, from, to });
}

export function postJson(
  path: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  return fetchJson(path, undefined, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function patchJson(
  path: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  return fetchJson(path, undefined, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function deleteJson(path: string): Promise<unknown> {
  return fetchJson(path, undefined, {
    method: "DELETE",
  });
}
