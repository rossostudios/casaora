"use server";

import { revalidatePath } from "next/cache";
import { postJson } from "@/lib/api";

export type ImportRowResult = {
  index: number;
  ok: boolean;
  error?: string;
};

export type ImportResult = {
  total: number;
  succeeded: number;
  failed: number;
  rows: ImportRowResult[];
};

export async function batchCreateProperties(
  orgId: string,
  rows: Array<{
    name: string;
    code?: string;
    address_line1?: string;
    city?: string;
  }>
): Promise<ImportResult> {
  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.name?.trim();
    if (!name) {
      results.push({ index: i, ok: false, error: "Name is required" });
      continue;
    }
    try {
      await postJson("/properties", {
        organization_id: orgId,
        name,
        code: row.code?.trim() || undefined,
        address_line1: row.address_line1?.trim() || undefined,
        city: row.city?.trim() || undefined,
      });
      results.push({ index: i, ok: true });
    } catch (err) {
      results.push({
        index: i,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  revalidatePath("/setup");
  revalidatePath("/module/properties");

  const succeeded = results.filter((r) => r.ok).length;
  return {
    total: rows.length,
    succeeded,
    failed: rows.length - succeeded,
    rows: results,
  };
}

export async function batchCreateUnits(
  orgId: string,
  rows: Array<{
    property_id: string;
    code: string;
    name: string;
    max_guests?: number;
    bedrooms?: number;
    bathrooms?: number;
  }>
): Promise<ImportResult> {
  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const code = row.code?.trim();
    const name = row.name?.trim();
    if (!code || !name) {
      results.push({ index: i, ok: false, error: "Code and name are required" });
      continue;
    }
    if (!row.property_id) {
      results.push({ index: i, ok: false, error: "Property ID is required" });
      continue;
    }
    try {
      await postJson("/units", {
        organization_id: orgId,
        property_id: row.property_id,
        code,
        name,
        max_guests: row.max_guests ?? 2,
        bedrooms: row.bedrooms ?? 1,
        bathrooms: row.bathrooms ?? 1,
      });
      results.push({ index: i, ok: true });
    } catch (err) {
      results.push({
        index: i,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  revalidatePath("/setup");
  revalidatePath("/module/units");

  const succeeded = results.filter((r) => r.ok).length;
  return {
    total: rows.length,
    succeeded,
    failed: rows.length - succeeded,
    rows: results,
  };
}
