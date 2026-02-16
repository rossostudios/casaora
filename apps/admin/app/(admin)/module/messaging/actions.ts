"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { postJson } from "@/lib/api";

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function messagingUrl(params?: {
  success?: string;
  error?: string;
}): string {
  const qs = new URLSearchParams();
  if (params?.success) qs.set("success", params.success);
  if (params?.error) qs.set("error", params.error);
  const suffix = qs.toString();
  return suffix ? `/module/messaging?${suffix}` : "/module/messaging";
}

export async function sendMessageAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  const channel = toStringValue(formData.get("channel"));
  const recipient = toStringValue(formData.get("recipient"));
  const guest_id = toStringValue(formData.get("guest_id")) || undefined;
  const reservation_id =
    toStringValue(formData.get("reservation_id")) || undefined;
  const template_id =
    toStringValue(formData.get("template_id")) || undefined;
  const body = toStringValue(formData.get("body"));
  const subject = toStringValue(formData.get("subject")) || undefined;
  const scheduled_at =
    toStringValue(formData.get("scheduled_at")) || undefined;

  if (!organization_id) {
    redirect(messagingUrl({ error: "Missing organization context." }));
  }
  if (!channel) {
    redirect(messagingUrl({ error: "Channel is required." }));
  }
  if (!recipient) {
    redirect(messagingUrl({ error: "Recipient is required." }));
  }
  if (!body && !template_id) {
    redirect(
      messagingUrl({ error: "Message body or template is required." })
    );
  }

  try {
    await postJson("/messages/send", {
      organization_id,
      channel,
      recipient,
      ...(guest_id ? { guest_id } : {}),
      ...(reservation_id ? { reservation_id } : {}),
      ...(template_id ? { template_id } : {}),
      ...(body ? { body } : {}),
      ...(subject ? { subject } : {}),
      ...(scheduled_at ? { scheduled_at } : {}),
    });

    revalidatePath("/module/messaging");
    redirect(messagingUrl({ success: "message-sent" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(messagingUrl({ error: message.slice(0, 240) }));
  }
}
