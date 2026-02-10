"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteJson, patchJson, postJson } from "@/lib/api";

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalString(
  value: FormDataEntryValue | null
): string | undefined {
  const text = toStringValue(value);
  return text ? text : undefined;
}

function toOptionalNumber(
  value: FormDataEntryValue | null
): number | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
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

function expensesUrl(params?: { success?: string; error?: string }): string {
  return withParams("/module/expenses", params ?? {});
}

export async function createExpenseAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  if (!organization_id) {
    redirect(expensesUrl({ error: "Missing organization context." }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    expensesUrl()
  );

  const category = toStringValue(formData.get("category")) || "other";
  const expense_date = toStringValue(formData.get("expense_date"));
  const amountRaw = toStringValue(formData.get("amount"));
  const amount = Number(amountRaw);
  const currency = (
    toStringValue(formData.get("currency")) || "PYG"
  ).toUpperCase();
  const fx_rate_to_pyg = toOptionalNumber(formData.get("fx_rate_to_pyg"));
  const payment_method =
    toStringValue(formData.get("payment_method")) || "bank_transfer";

  const reservation_id = toOptionalString(formData.get("reservation_id"));
  const unit_id = toOptionalString(formData.get("unit_id"));
  const property_id = toOptionalString(formData.get("property_id"));

  const vendor_name = toOptionalString(formData.get("vendor_name"));
  const invoice_number = toOptionalString(formData.get("invoice_number"));
  const invoice_ruc = toOptionalString(formData.get("invoice_ruc"));
  const receipt_url = toStringValue(formData.get("receipt_url"));
  const notes = toOptionalString(formData.get("notes"));

  if (!expense_date) {
    redirect(withParams(next, { error: "expense_date is required" }));
  }
  if (!Number.isFinite(amount)) {
    redirect(withParams(next, { error: "amount must be a number" }));
  }
  if (!receipt_url) {
    redirect(withParams(next, { error: "receipt_url is required" }));
  }

  try {
    await postJson("/expenses", {
      organization_id,
      category,
      expense_date,
      amount,
      currency,
      ...(currency === "USD" && fx_rate_to_pyg !== undefined
        ? { fx_rate_to_pyg }
        : {}),
      payment_method,
      receipt_url,
      ...(vendor_name ? { vendor_name } : {}),
      ...(invoice_number ? { invoice_number } : {}),
      ...(invoice_ruc ? { invoice_ruc } : {}),
      ...(notes ? { notes } : {}),
      ...(reservation_id ? { reservation_id } : {}),
      ...(reservation_id ? {} : unit_id ? { unit_id } : {}),
      ...(reservation_id ? {} : property_id ? { property_id } : {}),
    });

    revalidatePath("/module/expenses");
    redirect(withParams(next, { success: "expense-created" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function updateExpenseAction(formData: FormData) {
  const expense_id = toStringValue(formData.get("expense_id"));
  if (!expense_id) {
    redirect(expensesUrl({ error: "expense_id is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    expensesUrl()
  );

  const patch: Record<string, unknown> = {};

  const category = toOptionalString(formData.get("category"));
  const expense_date = toOptionalString(formData.get("expense_date"));
  const amount = toOptionalNumber(formData.get("amount"));
  const currency = toOptionalString(formData.get("currency"));
  const fx_rate_to_pyg = toOptionalNumber(formData.get("fx_rate_to_pyg"));
  const payment_method = toOptionalString(formData.get("payment_method"));

  const reservation_id = toOptionalString(formData.get("reservation_id"));
  const unit_id = toOptionalString(formData.get("unit_id"));
  const property_id = toOptionalString(formData.get("property_id"));

  const vendor_name = toOptionalString(formData.get("vendor_name"));
  const invoice_number = toOptionalString(formData.get("invoice_number"));
  const invoice_ruc = toOptionalString(formData.get("invoice_ruc"));
  const receipt_url = toOptionalString(formData.get("receipt_url"));
  const notes = toOptionalString(formData.get("notes"));

  if (category) patch.category = category;
  if (expense_date) patch.expense_date = expense_date;
  if (amount !== undefined) patch.amount = amount;
  if (currency) patch.currency = currency.toUpperCase();
  if (fx_rate_to_pyg !== undefined) patch.fx_rate_to_pyg = fx_rate_to_pyg;
  if (payment_method) patch.payment_method = payment_method;
  if (vendor_name) patch.vendor_name = vendor_name;
  if (invoice_number) patch.invoice_number = invoice_number;
  if (invoice_ruc) patch.invoice_ruc = invoice_ruc;
  if (receipt_url) patch.receipt_url = receipt_url;
  if (notes) patch.notes = notes;
  if (reservation_id) patch.reservation_id = reservation_id;

  // Only allow manual unit/property when reservation isn't set.
  if (!reservation_id) {
    if (unit_id) patch.unit_id = unit_id;
    if (property_id) patch.property_id = property_id;
  }

  try {
    await patchJson(`/expenses/${encodeURIComponent(expense_id)}`, patch);
    revalidatePath("/module/expenses");
    redirect(withParams(next, { success: "expense-updated" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function deleteExpenseAction(formData: FormData) {
  const expense_id = toStringValue(formData.get("expense_id"));
  if (!expense_id) {
    redirect(expensesUrl({ error: "expense_id is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    expensesUrl()
  );

  try {
    await deleteJson(`/expenses/${encodeURIComponent(expense_id)}`);
    revalidatePath("/module/expenses");
    redirect(withParams(next, { success: "expense-deleted" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}
