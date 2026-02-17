"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { postJson } from "@/lib/api";

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

function statementsUrl(params?: {
  success?: string;
  error?: string;
}): string {
  return withParams("/module/owner-statements", params ?? {});
}

export async function createStatementAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  if (!organization_id) {
    redirect(statementsUrl({ error: "Missing organization context." }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    statementsUrl()
  );

  const property_id = toStringValue(formData.get("property_id"));
  const unit_id = toOptionalString(formData.get("unit_id"));
  const period_start = toStringValue(formData.get("period_start"));
  const period_end = toStringValue(formData.get("period_end"));
  const currency = toStringValue(formData.get("currency")) || "PYG";

  if (!property_id) {
    redirect(withParams(next, { error: "property_id is required" }));
  }
  if (!period_start || !period_end) {
    redirect(withParams(next, { error: "Period dates are required" }));
  }

  try {
    await postJson("/owner-statements", {
      organization_id,
      property_id,
      ...(unit_id ? { unit_id } : {}),
      period_start,
      period_end,
      currency,
    });

    revalidatePath("/module/owner-statements");
    redirect(withParams(next, { success: "statement-created" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function requestApprovalAction(formData: FormData) {
  const statementId = toStringValue(formData.get("statement_id"));
  if (!statementId) {
    redirect(statementsUrl({ error: "statement_id is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    statementsUrl()
  );

  try {
    await postJson(
      `/owner-statements/${encodeURIComponent(statementId)}/request-approval`,
      {}
    );
    revalidatePath("/module/owner-statements");
    redirect(withParams(next, { success: "approval-requested" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function approveStatementAction(formData: FormData) {
  const statementId = toStringValue(formData.get("statement_id"));
  if (!statementId) {
    redirect(statementsUrl({ error: "statement_id is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    statementsUrl()
  );

  try {
    await postJson(
      `/owner-statements/${encodeURIComponent(statementId)}/approve`,
      {}
    );
    revalidatePath("/module/owner-statements");
    redirect(withParams(next, { success: "statement-approved" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function finalizeStatementAction(formData: FormData) {
  const statementId = toStringValue(formData.get("statement_id"));
  if (!statementId) {
    redirect(statementsUrl({ error: "statement_id is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    statementsUrl()
  );

  try {
    await postJson(
      `/owner-statements/${encodeURIComponent(statementId)}/finalize`,
      {}
    );
    revalidatePath("/module/owner-statements");
    redirect(withParams(next, { success: "statement-finalized" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}
