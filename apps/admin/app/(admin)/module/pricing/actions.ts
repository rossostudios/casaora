"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { patchJson, postJson } from "@/lib/api";

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalNumber(
  value: FormDataEntryValue | null
): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value: FormDataEntryValue | null): boolean | null {
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

function pricingUrl(params?: { success?: string; error?: string }): string {
  return withParams("/module/pricing", params ?? {});
}

export async function createPricingTemplateAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  if (!organization_id) {
    redirect(pricingUrl({ error: "Missing organization context." }));
  }

  const next = normalizeNext(toStringValue(formData.get("next")), pricingUrl());

  const name = toStringValue(formData.get("name"));
  const currency = (
    toStringValue(formData.get("currency")) || "PYG"
  ).toUpperCase();
  const monthly_rent = toOptionalNumber(formData.get("monthly_rent")) ?? 0;
  const advance_rent = toOptionalNumber(formData.get("advance_rent")) ?? 0;
  const security_deposit =
    toOptionalNumber(formData.get("security_deposit")) ?? 0;
  const service_fee_flat =
    toOptionalNumber(formData.get("service_fee_flat")) ?? 0;
  const tax_iva = toOptionalNumber(formData.get("tax_iva")) ?? 0;
  const guarantee_option_fee =
    toOptionalNumber(formData.get("guarantee_option_fee")) ?? 0;

  if (!name) {
    redirect(withParams(next, { error: "name is required" }));
  }

  if (monthly_rent <= 0) {
    redirect(
      withParams(next, { error: "monthly_rent must be greater than 0" })
    );
  }

  const lines: Record<string, unknown>[] = [
    {
      fee_type: "monthly_rent",
      label: "Alquiler mensual",
      amount: monthly_rent,
      is_recurring: true,
    },
    {
      fee_type: "advance_rent",
      label: "Adelanto",
      amount: advance_rent,
    },
    {
      fee_type: "security_deposit",
      label: "Garantía",
      amount: security_deposit,
      is_refundable: true,
    },
    {
      fee_type: "service_fee_flat",
      label: "Tarifa de servicio",
      amount: service_fee_flat,
    },
  ];

  if (tax_iva > 0) {
    lines.push({
      fee_type: "tax_iva",
      label: "IVA",
      amount: tax_iva,
      is_recurring: true,
    });
  }

  if (guarantee_option_fee > 0) {
    lines.push({
      fee_type: "guarantee_option_fee",
      label: "Costo opción garantía",
      amount: guarantee_option_fee,
    });
  }

  try {
    await postJson("/pricing/templates", {
      organization_id,
      name,
      currency,
      lines,
    });

    revalidatePath("/module/pricing");
    redirect(withParams(next, { success: "pricing-template-created" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function setPricingTemplateDefaultAction(formData: FormData) {
  const template_id = toStringValue(formData.get("template_id"));
  if (!template_id) {
    redirect(pricingUrl({ error: "template_id is required" }));
  }

  const next = normalizeNext(toStringValue(formData.get("next")), pricingUrl());

  try {
    await patchJson(`/pricing/templates/${encodeURIComponent(template_id)}`, {
      is_default: true,
    });
    revalidatePath("/module/pricing");
    redirect(withParams(next, { success: "pricing-template-default-updated" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function togglePricingTemplateActiveAction(formData: FormData) {
  const template_id = toStringValue(formData.get("template_id"));
  if (!template_id) {
    redirect(pricingUrl({ error: "template_id is required" }));
  }

  const is_active = toBoolean(formData.get("is_active"));
  if (is_active === null) {
    redirect(pricingUrl({ error: "is_active is required" }));
  }

  const next = normalizeNext(toStringValue(formData.get("next")), pricingUrl());

  try {
    await patchJson(`/pricing/templates/${encodeURIComponent(template_id)}`, {
      is_active,
    });
    revalidatePath("/module/pricing");
    redirect(withParams(next, { success: "pricing-template-updated" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}
