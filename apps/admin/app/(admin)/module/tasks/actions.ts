"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { deleteJson, patchJson, postJson } from "@/lib/api";

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function toBooleanValue(value: FormDataEntryValue | null): boolean | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function normalizeNext(path: string, fallback: string): string {
  const next = path.trim();
  if (!next.startsWith("/")) return fallback;
  return next;
}

function withParams(
  path: string,
  params: { success?: string; error?: string }
): string {
  const [base, query] = path.split("?", 2);
  const qs = new URLSearchParams(query ?? "");

  if (params.success) {
    qs.set("success", params.success);
    qs.delete("error");
  }
  if (params.error) {
    qs.set("error", params.error);
    qs.delete("success");
  }

  const suffix = qs.toString();
  return suffix ? `${base}?${suffix}` : base;
}

function tasksUrl(params?: { success?: string; error?: string }): string {
  return withParams("/module/tasks", params ?? {});
}

function taskUrl(
  taskId: string,
  params?: { success?: string; error?: string }
) {
  return withParams(
    `/module/tasks/${encodeURIComponent(taskId)}`,
    params ?? {}
  );
}

export async function createTaskAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  const title = toStringValue(formData.get("title"));

  const type = toStringValue(formData.get("type")) || "custom";
  const priority = toStringValue(formData.get("priority")) || "medium";

  const unit_id = toStringValue(formData.get("unit_id")) || undefined;
  const reservation_id =
    toStringValue(formData.get("reservation_id")) || undefined;
  const description = toStringValue(formData.get("description")) || undefined;

  const due_on = toStringValue(formData.get("due_on")) || undefined;
  const due_at = due_on ? `${due_on}T12:00:00Z` : undefined;

  if (!organization_id) {
    redirect(tasksUrl({ error: "Missing organization context." }));
  }
  if (!title) {
    redirect(tasksUrl({ error: "title is required" }));
  }

  try {
    await postJson("/tasks", {
      organization_id,
      title,
      type,
      priority,
      ...(unit_id ? { unit_id } : {}),
      ...(reservation_id ? { reservation_id } : {}),
      ...(description ? { description } : {}),
      ...(due_at ? { due_at } : {}),
    });

    revalidatePath("/module/tasks");
    redirect(tasksUrl({ success: "task-created" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(tasksUrl({ error: message.slice(0, 240) }));
  }
}

export async function updateTaskStatusAction(formData: FormData) {
  const task_id = toStringValue(formData.get("task_id"));
  const status = toStringValue(formData.get("status"));

  if (!task_id) {
    redirect(tasksUrl({ error: "task_id is required" }));
  }
  if (!status) {
    redirect(tasksUrl({ error: "status is required" }));
  }

  const next = normalizeNext(toStringValue(formData.get("next")), tasksUrl());

  try {
    await patchJson(`/tasks/${encodeURIComponent(task_id)}`, {
      status,
    });

    revalidatePath("/module/tasks");
    revalidatePath(`/module/tasks/${encodeURIComponent(task_id)}`);
    redirect(withParams(next, { success: "task-updated" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function completeTaskAction(formData: FormData) {
  const task_id = toStringValue(formData.get("task_id"));
  const completion_notes =
    toStringValue(formData.get("completion_notes")) || undefined;

  if (!task_id) {
    redirect(tasksUrl({ error: "task_id is required" }));
  }

  const next = normalizeNext(toStringValue(formData.get("next")), tasksUrl());

  try {
    await postJson(`/tasks/${encodeURIComponent(task_id)}/complete`, {
      ...(completion_notes ? { completion_notes } : {}),
    });

    revalidatePath("/module/tasks");
    revalidatePath(`/module/tasks/${encodeURIComponent(task_id)}`);
    redirect(withParams(next, { success: "task-completed" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function setTaskAssigneeAction(formData: FormData) {
  const task_id = toStringValue(formData.get("task_id"));
  const assigned_user_id = toStringValue(formData.get("assigned_user_id"));

  if (!task_id) {
    redirect(tasksUrl({ error: "task_id is required" }));
  }

  const fallback = taskUrl(task_id);
  const next = normalizeNext(toStringValue(formData.get("next")), fallback);

  try {
    await patchJson(`/tasks/${encodeURIComponent(task_id)}`, {
      assigned_user_id: assigned_user_id || null,
    });

    revalidatePath("/module/tasks");
    revalidatePath(`/module/tasks/${encodeURIComponent(task_id)}`);
    redirect(next);
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function createTaskItemAction(formData: FormData) {
  const task_id = toStringValue(formData.get("task_id"));
  const label = toStringValue(formData.get("label"));

  if (!task_id) {
    redirect(tasksUrl({ error: "task_id is required" }));
  }
  if (!label) {
    redirect(taskUrl(task_id, { error: "label is required" }));
  }

  const fallback = taskUrl(task_id);
  const next = normalizeNext(toStringValue(formData.get("next")), fallback);

  try {
    await postJson(`/tasks/${encodeURIComponent(task_id)}/items`, {
      label,
      is_required: true,
    });

    revalidatePath("/module/tasks");
    revalidatePath(`/module/tasks/${encodeURIComponent(task_id)}`);
    redirect(next);
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function updateTaskItemAction(formData: FormData) {
  const task_id = toStringValue(formData.get("task_id"));
  const item_id = toStringValue(formData.get("item_id"));
  const is_completed = toBooleanValue(formData.get("is_completed"));

  if (!task_id) {
    redirect(tasksUrl({ error: "task_id is required" }));
  }
  if (!item_id) {
    redirect(taskUrl(task_id, { error: "item_id is required" }));
  }
  if (is_completed === null) {
    redirect(taskUrl(task_id, { error: "is_completed is required" }));
  }

  const fallback = taskUrl(task_id);
  const next = normalizeNext(toStringValue(formData.get("next")), fallback);

  try {
    await patchJson(
      `/tasks/${encodeURIComponent(task_id)}/items/${encodeURIComponent(item_id)}`,
      {
        is_completed,
      }
    );

    revalidatePath("/module/tasks");
    revalidatePath(`/module/tasks/${encodeURIComponent(task_id)}`);
    redirect(next);
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function deleteTaskItemAction(formData: FormData) {
  const task_id = toStringValue(formData.get("task_id"));
  const item_id = toStringValue(formData.get("item_id"));

  if (!task_id) {
    redirect(tasksUrl({ error: "task_id is required" }));
  }
  if (!item_id) {
    redirect(taskUrl(task_id, { error: "item_id is required" }));
  }

  const fallback = taskUrl(task_id);
  const next = normalizeNext(toStringValue(formData.get("next")), fallback);

  try {
    await deleteJson(
      `/tasks/${encodeURIComponent(task_id)}/items/${encodeURIComponent(item_id)}`
    );

    revalidatePath("/module/tasks");
    revalidatePath(`/module/tasks/${encodeURIComponent(task_id)}`);
    redirect(next);
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}
