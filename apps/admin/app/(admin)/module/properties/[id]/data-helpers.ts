import type { Locale } from "@/lib/i18n";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export const TASK_CLOSED_STATUSES = new Set([
  "done",
  "completed",
  "cancelled",
  "canceled",
  "resolved",
  "closed",
]);
export const LEASE_ACTIVE_STATUSES = new Set(["active", "delinquent"]);
export const ACTIVE_RESERVATION_STATUSES = new Set([
  "pending",
  "confirmed",
  "checked_in",
]);
export const APPLICATION_CLOSED_STATUSES = new Set([
  "rejected",
  "lost",
  "contract_signed",
]);
export const COLLECTION_OPEN_STATUSES = new Set([
  "scheduled",
  "pending",
  "late",
  "overdue",
  "partial",
]);
export const COLLECTION_PAID_STATUSES = new Set([
  "paid",
  "completed",
  "settled",
]);
export const URGENT_TASK_PRIORITIES = new Set(["high", "critical", "urgent"]);

export type QueryValue = string | number | boolean | undefined | null;

export type PropertyRelationSnapshot = {
  units: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  ownerStatements: Record<string, unknown>[];
  leases: Record<string, unknown>[];
  reservations: Record<string, unknown>[];
  listings: Record<string, unknown>[];
  applications: Record<string, unknown>[];
  collections: Record<string, unknown>[];
};

export function isPropertyRecordId(value: string): boolean {
  return UUID_RE.test(value);
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function toNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizedStatus(value: unknown): string {
  return asString(value).toLowerCase();
}

export function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

export function toDate(value: unknown): Date | null {
  const text = asString(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export function asDateLabel(value: string, locale: Locale): string | null {
  if (!(ISO_DATE_TIME_RE.test(value) || ISO_DATE_RE.test(value))) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;

  if (ISO_DATE_RE.test(value)) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
      date
    );
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getFirstValue(
  row: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) return value;
  }
  return null;
}

export function getAmountInPyg(row: Record<string, unknown>): number {
  const amount = toNumber(row.amount);
  if (amount === null) return 0;

  const currency = asString(row.currency).toUpperCase();
  if (currency === "PYG" || !currency) return amount;

  if (currency === "USD") {
    const fx = toNumber(row.fx_rate_to_pyg);
    if (fx !== null && fx > 0) return amount * fx;
  }

  return 0;
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

export function daysUntilDate(target: Date, from: Date): number {
  const diffMs = target.getTime() - from.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function toRecordArray(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown[] }).data;
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is Record<string, unknown> =>
    Boolean(row && typeof row === "object")
  );
}

export function parseBackendErrorText(text: string): string {
  if (!text) return "";
  try {
    const parsed = JSON.parse(text) as {
      detail?: unknown;
      error?: unknown;
      message?: unknown;
    };
    const detail = parsed?.detail ?? parsed?.error ?? parsed?.message ?? text;

    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          const record = item as Record<string, unknown>;
          return typeof record.msg === "string" ? record.msg : "";
        })
        .filter(Boolean);
      if (messages.length) return messages.join("; ");
    }

    return JSON.stringify(detail);
  } catch {
    return text;
  }
}

export function sortKeys(keys: string[]): string[] {
  const priority = [
    "id",
    "name",
    "title",
    "code",
    "status",
    "kind",
    "organization_id",
    "property_id",
    "unit_id",
    "created_at",
    "updated_at",
  ];

  const score = new Map(priority.map((key, index) => [key, index * 10]));
  const scoreFor = (key: string): number => {
    const direct = score.get(key);
    if (direct !== undefined) return direct;

    if (key.endsWith("_name")) {
      const idKey = `${key.slice(0, -5)}_id`;
      const idScore = score.get(idKey);
      if (idScore !== undefined) return idScore + 1;
    }

    return Number.POSITIVE_INFINITY;
  };

  return [...keys].sort((a, b) => {
    const aScore = scoreFor(a);
    const bScore = scoreFor(b);
    if (aScore !== bScore) return aScore - bScore;
    return a.localeCompare(b);
  });
}

export function recordTitle(
  record: Record<string, unknown>,
  fallbackTitle: string
): string {
  const candidate = (record.name ??
    record.title ??
    record.public_name ??
    record.code ??
    record.id) as unknown | string;
  const text =
    typeof candidate === "string" && candidate.trim() ? candidate.trim() : "";
  return text || fallbackTitle;
}
