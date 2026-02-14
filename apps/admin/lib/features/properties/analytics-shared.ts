import type { PropertyRelationRow } from "./types";

export const TASK_CLOSED_STATUSES = new Set([
  "done",
  "completed",
  "cancelled",
  "canceled",
  "resolved",
  "closed",
]);

export const LEASE_ACTIVE_STATUSES = new Set(["active", "delinquent"]);
export const URGENT_TASK_PRIORITIES = new Set(["high", "critical", "urgent"]);

export const COLLECTION_OPEN_STATUSES = new Set([
  "scheduled",
  "pending",
  "late",
  "overdue",
  "partial",
]);

export const COLLECTION_REVENUE_STATUSES = new Set([
  "scheduled",
  "pending",
  "late",
  "overdue",
  "partial",
  "paid",
  "completed",
  "settled",
]);

export const COLLECTION_PAID_STATUSES = new Set([
  "paid",
  "completed",
  "settled",
]);

export function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizedStatus(value: unknown): string {
  return asString(value).toLowerCase();
}

export function toDate(value: unknown): Date | null {
  const text = asString(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export function convertAmountToPyg(
  amount: number,
  currency: string,
  fxRate?: number | null
): number {
  if (!Number.isFinite(amount)) return 0;
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!normalizedCurrency || normalizedCurrency === "PYG") return amount;
  if (normalizedCurrency === "USD") {
    if (typeof fxRate === "number" && fxRate > 0) return amount * fxRate;
    return amount * 7300;
  }
  return amount;
}

export function resolvePropertyId(
  row: PropertyRelationRow,
  propertyIdByUnit: Map<string, string>
): string {
  return (
    asString(row.property_id) ||
    propertyIdByUnit.get(asString(row.unit_id)) ||
    ""
  );
}
