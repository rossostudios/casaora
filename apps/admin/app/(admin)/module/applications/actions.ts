"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { postJson } from "@/lib/api";

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalNumber(
  value: FormDataEntryValue | null,
): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeNext(path: string, fallback: string): string {
  const next = path.trim();
  if (!next.startsWith("/")) return fallback;
  return next;
}

function withParams(
  path: string,
  params: { success?: string; error?: string },
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

function applicationsUrl(params?: {
  success?: string;
  error?: string;
}): string {
  return withParams("/module/applications", params ?? {});
}

function revalidateApplicationPaths(applicationId: string) {
  revalidatePath("/module/applications");
  revalidatePath(`/module/applications/${applicationId}`);
}

export async function setApplicationStatusAction(formData: FormData) {
  const application_id = toStringValue(formData.get("application_id"));
  const status = toStringValue(formData.get("status"));
  const note = toStringValue(formData.get("note"));
  const rejected_reason = toStringValue(formData.get("rejected_reason"));

  if (!application_id) {
    redirect(applicationsUrl({ error: "application_id is required" }));
  }
  if (!status) {
    redirect(applicationsUrl({ error: "status is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    applicationsUrl(),
  );

  try {
    await postJson(
      `/applications/${encodeURIComponent(application_id)}/status`,
      {
        status,
        ...(note ? { note } : {}),
        ...(rejected_reason ? { rejected_reason } : {}),
      },
    );

    revalidateApplicationPaths(application_id);
    redirect(withParams(next, { success: "application-updated" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function assignApplicationAction(formData: FormData) {
  const application_id = toStringValue(formData.get("application_id"));
  const status = toStringValue(formData.get("status"));
  const assignedRaw = toStringValue(formData.get("assigned_user_id"));
  const note = toStringValue(formData.get("note")) || "Assignment updated";

  if (!application_id) {
    redirect(applicationsUrl({ error: "application_id is required" }));
  }
  if (!status) {
    redirect(applicationsUrl({ error: "status is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    applicationsUrl(),
  );

  const payload: Record<string, unknown> = { status, note };
  if (assignedRaw === "__unassigned__") {
    payload.clear_assignee = true;
  } else if (assignedRaw) {
    payload.assigned_user_id = assignedRaw;
  }

  try {
    await postJson(
      `/applications/${encodeURIComponent(application_id)}/status`,
      payload,
    );

    revalidateApplicationPaths(application_id);
    redirect(withParams(next, { success: "application-assignment-updated" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function convertApplicationToLeaseAction(formData: FormData) {
  const application_id = toStringValue(formData.get("application_id"));
  const starts_on = toStringValue(formData.get("starts_on"));
  const platform_fee = toOptionalNumber(formData.get("platform_fee")) ?? 0;

  if (!application_id) {
    redirect(applicationsUrl({ error: "application_id is required" }));
  }
  if (!starts_on) {
    redirect(applicationsUrl({ error: "starts_on is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    applicationsUrl(),
  );

  try {
    const created = (await postJson(
      `/applications/${encodeURIComponent(application_id)}/convert-to-lease`,
      {
        starts_on,
        currency: "PYG",
        platform_fee,
        generate_first_collection: true,
      },
    )) as { lease?: { id?: string } } | undefined;

    revalidateApplicationPaths(application_id);
    revalidatePath("/module/leases");
    revalidatePath("/module/collections");
    const leaseId = created?.lease?.id;
    redirect(
      withParams(
        leaseId
          ? `/module/leases/${leaseId}?return_to=${encodeURIComponent(next)}`
          : next,
        { success: "application-converted-to-lease" },
      ),
    );
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function sendApplicationMessageAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  const application_id = toStringValue(formData.get("application_id"));
  const channel = toStringValue(formData.get("channel"));
  const recipient = toStringValue(formData.get("recipient"));
  const template_id = toStringValue(formData.get("template_id")) || undefined;
  const body = toStringValue(formData.get("body"));
  const subject = toStringValue(formData.get("subject")) || undefined;

  if (!organization_id || !application_id) {
    redirect(applicationsUrl({ error: "Missing application context." }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    applicationsUrl(),
  );

  if (!channel) {
    redirect(withParams(next, { error: "Channel is required." }));
  }
  if (!recipient) {
    redirect(withParams(next, { error: "Recipient is required." }));
  }
  if (!(body || template_id)) {
    redirect(
      withParams(next, { error: "Message body or template is required." }),
    );
  }
  if (channel === "email" && !recipient.includes("@")) {
    redirect(withParams(next, { error: "Email recipient is invalid." }));
  }
  if (channel === "whatsapp" && recipient.replaceAll(/\D/g, "").length < 8) {
    redirect(withParams(next, { error: "WhatsApp recipient is invalid." }));
  }

  try {
    await postJson("/messages/send", {
      organization_id,
      application_id,
      channel,
      recipient,
      ...(template_id ? { template_id } : {}),
      ...(body ? { body } : {}),
      ...(subject ? { subject } : {}),
    });

    revalidateApplicationPaths(application_id);
    redirect(withParams(next, { success: "application-follow-up-sent" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}
