"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { patchJson, postJson } from "@/lib/api";

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
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

const MODULE_PATH = "/module/notification-rules";

function rulesUrl(params?: { success?: string; error?: string }): string {
  return withParams(MODULE_PATH, params ?? {});
}

export async function createNotificationRuleAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  if (!organization_id) {
    redirect(rulesUrl({ error: "Missing organization context." }));
  }

  const next = normalizeNext(toStringValue(formData.get("next")), MODULE_PATH);

  const trigger_event = toStringValue(formData.get("trigger_event"));
  const channel = toStringValue(formData.get("channel")) || "whatsapp";
  const message_template_id =
    toStringValue(formData.get("message_template_id")) || undefined;
  const is_active = toStringValue(formData.get("is_active")) !== "false";

  if (!trigger_event) {
    redirect(withParams(next, { error: "trigger_event is required" }));
  }

  try {
    await postJson("/notification-rules", {
      organization_id,
      trigger_event,
      channel,
      is_active,
      ...(message_template_id ? { message_template_id } : {}),
    });

    revalidatePath(MODULE_PATH);
    redirect(withParams(next, { success: "rule-created" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function toggleNotificationRuleAction(formData: FormData) {
  const rule_id = toStringValue(formData.get("rule_id"));
  if (!rule_id) {
    redirect(rulesUrl({ error: "rule_id is required" }));
  }

  const next = normalizeNext(toStringValue(formData.get("next")), MODULE_PATH);
  const is_active = toStringValue(formData.get("is_active")) === "true";

  try {
    await patchJson(
      `/notification-rules/${encodeURIComponent(rule_id)}`,
      { is_active }
    );
    revalidatePath(MODULE_PATH);
    redirect(
      withParams(next, {
        success: is_active ? "rule-activated" : "rule-deactivated",
      })
    );
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}
