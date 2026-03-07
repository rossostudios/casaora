"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { deleteJson, patchJson, postJson } from "@/lib/api";

const UNITS_API_ERROR_RE =
  /API request failed \((\d+)\) for \/units(?::\s*(.+))?/i;
const UNITS_DUPLICATE_SUGGESTION_RE =
  /(?:try|intenta)\s*['"`]?([^'"`]+)['"`]?/i;

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumberValue(
  value: FormDataEntryValue | null,
  fallback: number
): number {
  const raw = toStringValue(value);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function unitsUrl(params?: { success?: string; error?: string }): string {
  const qs = new URLSearchParams();
  if (params?.success) qs.set("success", params.success);
  if (params?.error) qs.set("error", params.error);
  const suffix = qs.toString();
  return suffix ? `/module/units?${suffix}` : "/module/units";
}

function appendParamsToReturnTo(
  returnTo: string,
  params?: { success?: string; error?: string }
): string {
  const trimmed = returnTo.trim();
  if (!trimmed.startsWith("/")) {
    return unitsUrl(params);
  }

  const url = new URL(trimmed, "http://localhost");
  if (params?.success) url.searchParams.set("success", params.success);
  if (params?.error) url.searchParams.set("error", params.error);
  return `${url.pathname}${url.search}`;
}

function friendlyUnitCreateError(message: string): string {
  const normalized = message.toLowerCase();
  const apiMatch = message.match(UNITS_API_ERROR_RE);
  const detail =
    (typeof apiMatch?.[2] === "string" ? apiMatch[2].trim() : "") || message;
  const suggestionMatch = detail.match(UNITS_DUPLICATE_SUGGESTION_RE);
  const suggestion = suggestionMatch?.[1]?.trim() ?? "";

  const looksLikeDuplicate =
    normalized.includes("already exists for this property") ||
    normalized.includes("duplicate key value violates unique constraint") ||
    normalized.includes("violates unique constraint") ||
    normalized.includes("units_property_id_code_key") ||
    normalized.includes("23505");

  if (looksLikeDuplicate) {
    return suggestion
      ? `unit-code-duplicate:${suggestion}`
      : "unit-code-duplicate";
  }

  return "unit-create-failed";
}

export async function createUnitFromUnitsModuleAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  const property_id = toStringValue(formData.get("property_id"));
  const return_to = toStringValue(formData.get("return_to"));
  const code = toStringValue(formData.get("code"));
  const name = toStringValue(formData.get("name"));
  const unit_type = toStringValue(formData.get("unit_type")) || "entire_place";
  const condition_status =
    toStringValue(formData.get("condition_status")) || "clean";
  const floor_level_raw = toStringValue(formData.get("floor_level"));
  const max_guests = toNumberValue(formData.get("max_guests"), 2);
  const bedrooms = toNumberValue(formData.get("bedrooms"), 1);
  const bathrooms = toNumberValue(formData.get("bathrooms"), 1);
  const currency = toStringValue(formData.get("currency")) || "PYG";
  const base_price_monthly_raw = toStringValue(formData.get("base_price_monthly"));
  const base_price_monthly = base_price_monthly_raw
    ? Number(base_price_monthly_raw)
    : undefined;
  const floor_level = floor_level_raw ? Number(floor_level_raw) : undefined;

  if (!organization_id) {
    redirect(
      appendParamsToReturnTo(return_to, { error: "Missing organization context." })
    );
  }
  if (!property_id) {
    redirect(appendParamsToReturnTo(return_to, { error: "property_id is required" }));
  }
  if (!code) {
    redirect(appendParamsToReturnTo(return_to, { error: "code is required" }));
  }
  if (!name) {
    redirect(appendParamsToReturnTo(return_to, { error: "name is required" }));
  }

  try {
    await postJson("/units", {
      organization_id,
      property_id,
      code,
      name,
      unit_type,
      condition_status,
      floor_level: Number.isFinite(floor_level) ? floor_level : undefined,
      max_guests,
      bedrooms,
      bathrooms,
      currency,
      base_price_monthly: Number.isFinite(base_price_monthly)
        ? base_price_monthly
        : undefined,
    });
    revalidatePath("/module/units");
    revalidatePath(`/module/properties/${property_id}`);
    revalidatePath("/setup");
    redirect(appendParamsToReturnTo(return_to, { success: "unit-created" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(
      appendParamsToReturnTo(return_to, {
        error: friendlyUnitCreateError(message).slice(0, 240),
      })
    );
  }
}

export async function updateUnitInlineAction({
  unitId,
  field,
  value,
}: {
  unitId: string;
  field: string;
  value: string | number | boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await patchJson(`/units/${unitId}`, { [field]: value });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message.slice(0, 240) };
  }
  revalidatePath("/module/units");
  revalidatePath(`/module/units/${unitId}`);
  return { ok: true };
}

export async function deleteUnitFromUnitsModuleAction({
  unitId,
  propertyId,
}: {
  unitId: string;
  propertyId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteJson(`/units/${unitId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message.slice(0, 240) };
  }

  revalidatePath("/module/units");
  if (propertyId) {
    revalidatePath(`/module/properties/${propertyId}`);
  }
  return { ok: true };
}

export type BulkUpdateUnitsResult =
  | {
      ok: true;
      dryRun: true;
      matchedCount: number;
      previewCount: number;
      previewUnitIds: string[];
      applyCap: number;
      patch: Record<string, unknown>;
    }
  | {
      ok: true;
      dryRun: false;
      matchedCount: number;
      updatedCount: number;
      failedCount: number;
      updatedUnitIds: string[];
      failures: Array<{ unit_id?: string; error?: string }>;
      patch: Record<string, unknown>;
    }
  | {
      ok: false;
      error: string;
    };

export async function bulkUpdateUnitsFromUnitsModuleAction(input: {
  organizationId: string;
  filters: {
    property_id?: string;
    unit_ids?: string[];
    floor_level?: number;
    unit_type?: string;
    condition_status?: string;
    bedrooms?: number;
    is_active?: boolean;
  };
  patch: {
    unit_type?: string;
    floor_level?: number;
    condition_status?: string;
    base_price_monthly?: number;
    is_active?: boolean;
  };
  dryRun?: boolean;
}): Promise<BulkUpdateUnitsResult> {
  try {
    const payload = (await postJson("/units/bulk-update", {
      organization_id: input.organizationId,
      dry_run: input.dryRun === true,
      filters: input.filters,
      patch: input.patch,
    })) as Record<string, unknown>;

    if (payload.dry_run === true) {
      return {
        ok: true,
        dryRun: true,
        matchedCount: Number(payload.matched_count ?? 0),
        previewCount: Number(payload.preview_count ?? 0),
        previewUnitIds: Array.isArray(payload.preview_unit_ids)
          ? payload.preview_unit_ids.filter(
              (value): value is string => typeof value === "string"
            )
          : [],
        applyCap: Number(payload.apply_cap ?? 0),
        patch:
          payload.patch && typeof payload.patch === "object"
            ? (payload.patch as Record<string, unknown>)
            : {},
      };
    }

    revalidatePath("/module/units");
    return {
      ok: true,
      dryRun: false,
      matchedCount: Number(payload.matched_count ?? 0),
      updatedCount: Number(payload.updated_count ?? 0),
      failedCount: Number(payload.failed_count ?? 0),
      updatedUnitIds: Array.isArray(payload.updated_unit_ids)
        ? payload.updated_unit_ids.filter(
            (value): value is string => typeof value === "string"
          )
        : [],
      failures: Array.isArray(payload.failures)
        ? payload.failures.filter(
            (value): value is { unit_id?: string; error?: string } =>
              Boolean(value) && typeof value === "object"
          )
        : [],
      patch:
        payload.patch && typeof payload.patch === "object"
          ? (payload.patch as Record<string, unknown>)
          : {},
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message.slice(0, 240) };
  }
}
