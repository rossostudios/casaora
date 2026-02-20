import { fetchJson } from "@casaora/shared-api/client";
import type { components, paths } from "@casaora/shared-api/types";

import { getApiBaseUrl, getDefaultOrgId } from "@/lib/config";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type HealthResponse =
  paths["/health"]["get"]["responses"]["200"]["content"]["application/json"];
export type MeResponse =
  paths["/me"]["get"]["responses"]["200"]["content"]["application/json"];
export type Task = components["schemas"]["Task"];
export type TaskStatus = components["schemas"]["TaskStatus"];
export type TaskListResponse =
  paths["/tasks"]["get"]["responses"]["200"]["content"]["application/json"];
export type TaskDetailResponse =
  paths["/tasks/{task_id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type TaskItem = {
  id: string;
  task_id: string;
  label: string;
  sort_order: number;
  is_required: boolean;
  is_completed: boolean;
  photo_urls?: string[] | null;
};

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/health", {
    baseUrl: getApiBaseUrl(),
    method: "GET",
    includeJsonContentType: false,
  });
}

export async function fetchMe(): Promise<MeResponse> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No active Supabase session.");
  }

  return fetchJson<MeResponse>("/me", {
    baseUrl: getApiBaseUrl(),
    method: "GET",
    includeJsonContentType: false,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}

export async function resolveActiveOrgId(): Promise<string> {
  const defaultOrgId = getDefaultOrgId();
  if (defaultOrgId) return defaultOrgId;

  const me = await fetchMe();
  const memberships = Array.isArray(me.memberships) ? me.memberships : [];
  const orgId = memberships
    .map((membership) =>
      typeof membership?.organization_id === "string"
        ? membership.organization_id.trim()
        : ""
    )
    .find((value) => value.length > 0);

  if (!orgId) {
    throw new Error(
      "No organization found in /me. Set EXPO_PUBLIC_DEFAULT_ORG_ID in .env.local."
    );
  }

  return orgId;
}

export async function listTasks(params: {
  orgId: string;
  status?: TaskStatus;
  assignedUserId?: string;
  limit?: number;
}): Promise<Task[]> {
  const payload = await fetchJson<TaskListResponse>("/tasks", {
    baseUrl: getApiBaseUrl(),
    method: "GET",
    includeJsonContentType: false,
    query: {
      org_id: params.orgId,
      status: params.status,
      assigned_user_id: params.assignedUserId,
      limit: params.limit ?? 100,
    },
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
    },
  });

  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getTask(taskId: string): Promise<TaskDetailResponse> {
  return fetchJson<TaskDetailResponse>(`/tasks/${encodeURIComponent(taskId)}`, {
    baseUrl: getApiBaseUrl(),
    method: "GET",
    includeJsonContentType: false,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
    },
  });
}

export async function completeTask(
  taskId: string,
  completionNotes?: string
): Promise<TaskDetailResponse> {
  return fetchJson<TaskDetailResponse>(
    `/tasks/${encodeURIComponent(taskId)}/complete`,
    {
      baseUrl: getApiBaseUrl(),
      method: "POST",
      body:
        completionNotes && completionNotes.trim().length > 0
          ? { completion_notes: completionNotes.trim() }
          : undefined,
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
      },
    }
  );
}

export async function listTaskItems(taskId: string): Promise<TaskItem[]> {
  const payload = await fetchJson<{ data?: TaskItem[] }>(
    `/tasks/${encodeURIComponent(taskId)}/items`,
    {
      baseUrl: getApiBaseUrl(),
      method: "GET",
      includeJsonContentType: false,
      query: { limit: 500 },
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
      },
    }
  );

  const rows = Array.isArray(payload.data) ? payload.data : [];
  return rows.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.label.localeCompare(b.label);
  });
}

export async function updateTaskItem(
  taskId: string,
  itemId: string,
  patch: {
    is_completed?: boolean;
    label?: string;
    is_required?: boolean;
    sort_order?: number;
    photo_urls?: string[];
  }
): Promise<TaskItem> {
  return fetchJson<TaskItem>(
    `/tasks/${encodeURIComponent(taskId)}/items/${encodeURIComponent(itemId)}`,
    {
      baseUrl: getApiBaseUrl(),
      method: "PATCH",
      body: patch,
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
      },
    }
  );
}

export async function createTaskItem(
  taskId: string,
  input: { label: string; is_required?: boolean; sort_order?: number }
): Promise<TaskItem> {
  return fetchJson<TaskItem>(`/tasks/${encodeURIComponent(taskId)}/items`, {
    baseUrl: getApiBaseUrl(),
    method: "POST",
    body: {
      label: input.label,
      is_required: input.is_required ?? true,
      sort_order: input.sort_order,
    },
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
    },
  });
}

async function getAccessToken(): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No active Supabase session.");
  }

  return session.access_token;
}
