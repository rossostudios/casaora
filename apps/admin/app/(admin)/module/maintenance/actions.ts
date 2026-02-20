"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { patchJson } from "@/lib/api";

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalString(
  value: FormDataEntryValue | null
): string | undefined {
  const text = toStringValue(value);
  return text ? text : undefined;
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

function maintenanceUrl(params?: { success?: string; error?: string }): string {
  return withParams("/module/maintenance", params ?? {});
}

export async function updateMaintenanceRequestAction(formData: FormData) {
  const requestId = toStringValue(formData.get("request_id"));
  if (!requestId) {
    redirect(maintenanceUrl({ error: "request_id is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    maintenanceUrl()
  );

  const patch: Record<string, unknown> = {};

  const status = toOptionalString(formData.get("status"));
  const resolution_notes = toOptionalString(formData.get("resolution_notes"));
  const assigned_user_id = toOptionalString(formData.get("assigned_user_id"));

  if (status) patch.status = status;
  if (resolution_notes) patch.resolution_notes = resolution_notes;
  if (assigned_user_id) patch.assigned_user_id = assigned_user_id;

  try {
    await patchJson(
      `/maintenance-requests/${encodeURIComponent(requestId)}`,
      patch
    );
    revalidatePath("/module/maintenance");
    redirect(withParams(next, { success: "request-updated" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}
