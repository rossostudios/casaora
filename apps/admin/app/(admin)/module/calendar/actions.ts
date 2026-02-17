"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { deleteJson, postJson } from "@/lib/api";

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function calendarUrl(params?: { success?: string; error?: string }): string {
  const qs = new URLSearchParams();
  if (params?.success) qs.set("success", params.success);
  if (params?.error) qs.set("error", params.error);
  const suffix = qs.toString();
  return suffix ? `/module/calendar?${suffix}` : "/module/calendar";
}

export async function createCalendarBlockAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  const unit_id = toStringValue(formData.get("unit_id"));
  const starts_on = toStringValue(formData.get("starts_on"));
  const ends_on = toStringValue(formData.get("ends_on"));
  const reason = toStringValue(formData.get("reason")) || undefined;
  const recurrence_rule = toStringValue(formData.get("recurrence_rule")) || undefined;
  const recurrence_end_date = toStringValue(formData.get("recurrence_end_date")) || undefined;

  if (!organization_id) {
    redirect(calendarUrl({ error: "Missing organization context." }));
  }
  if (!unit_id) {
    redirect(calendarUrl({ error: "unit_id is required" }));
  }
  if (!(starts_on && ends_on)) {
    redirect(calendarUrl({ error: "starts_on and ends_on are required" }));
  }

  try {
    await postJson("/calendar/blocks", {
      organization_id,
      unit_id,
      starts_on,
      ends_on,
      source: "manual",
      ...(reason ? { reason } : {}),
      ...(recurrence_rule ? { recurrence_rule } : {}),
      ...(recurrence_end_date ? { recurrence_end_date } : {}),
    });

    revalidatePath("/module/calendar");
    redirect(calendarUrl({ success: "block-created" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(calendarUrl({ error: message.slice(0, 240) }));
  }
}

export async function deleteCalendarBlockAction(formData: FormData) {
  const block_id = toStringValue(formData.get("block_id"));

  if (!block_id) {
    redirect(calendarUrl({ error: "block_id is required" }));
  }

  try {
    await deleteJson(`/calendar/blocks/${encodeURIComponent(block_id)}`);

    revalidatePath("/module/calendar");
    redirect(calendarUrl({ success: "block-deleted" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(calendarUrl({ error: message.slice(0, 240) }));
  }
}
