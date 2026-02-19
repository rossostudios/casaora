"use client";

import { type FilterFn } from "@tanstack/react-table";
import { InboxIcon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { humanizeKey } from "@/lib/format";
import type { Locale } from "@/lib/i18n";

export type DataTableRow = Record<string, unknown>;

export type EmptyStateConfig = {
  title: string;
  description: string;
  icon?: typeof InboxIcon;
  actionLabel?: string;
  actionHref?: string;
  secondaryActions?: Array<{ label: string; href: string }>;
};

export type DataTableProps<TRow extends DataTableRow = DataTableRow> = {
  data: TRow[];
  columns?: import("@tanstack/react-table").ColumnDef<TRow>[];
  defaultPageSize?: number;
  locale?: Locale;
  searchPlaceholder?: string;
  hideSearch?: boolean;
  renderRowActions?: (row: TRow) => ReactNode;
  rowActionsHeader?: string;
  rowHrefBase?: string;
  foreignKeyHrefBaseByKey?: Record<string, string>;
  onRowClick?: (row: TRow) => void;
  emptyStateConfig?: EmptyStateConfig;
  borderless?: boolean;
  footer?: ReactNode;
  focusedRowIndex?: number;
};

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function idKeyFromNameKey(key: string): string {
  return key.endsWith("_name") ? `${key.slice(0, -5)}_id` : key;
}

export function nameKeyFromIdKey(key: string): string {
  return key.endsWith("_id") ? `${key.slice(0, -3)}_name` : key;
}

export function baseKeyFromIdKey(key: string): string {
  return key.endsWith("_id") ? key.slice(0, -3) : key;
}

export function shortId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function isIdKey(key: string): boolean {
  return key === "id" || key.endsWith("_id");
}

export function isUuidString(value: string): boolean {
  return UUID_RE.test(value);
}

export function metaFromHrefBase(base: string | undefined | null): string | null {
  if (!base) return null;
  const slug = base.split("/").filter(Boolean).pop();
  if (!slug) return null;
  return humanizeKey(slug.replaceAll("-", "_"));
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

function stringifyForFilter(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value).toLowerCase();
  try {
    return JSON.stringify(value).toLowerCase();
  } catch {
    return String(value).toLowerCase();
  }
}

export const globalFilterFn: FilterFn<DataTableRow> = (row, columnId, filterValue) => {
  const needle = String(filterValue ?? "")
    .trim()
    .toLowerCase();
  if (!needle) return true;
  const haystack = stringifyForFilter(row.getValue(columnId));
  return haystack.includes(needle);
};

export function keysFromRows(rows: DataTableRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      set.add(key);
    }
  }
  const keys = Array.from(set);

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
    "integration_id",
    "guest_id",
    "reservation_id",
    "template_id",
    "assigned_user_id",
    "check_in_date",
    "check_out_date",
    "starts_on",
    "ends_on",
    "created_at",
    "updated_at",
  ];

  const score = new Map(priority.map((key, index) => [key, index * 10]));
  const scoreFor = (key: string): number => {
    const direct = score.get(key);
    if (direct !== undefined) return direct;

    if (key.endsWith("_name")) {
      const idKey = idKeyFromNameKey(key);
      const idScore = score.get(idKey);
      if (idScore !== undefined) return idScore + 1;
    }

    return Number.POSITIVE_INFINITY;
  };

  return keys.sort((a, b) => {
    const aScore = scoreFor(a);
    const bScore = scoreFor(b);
    if (aScore !== bScore) return aScore - bScore;
    return a.localeCompare(b);
  });
}

export function firstNonNullValue(rows: DataTableRow[], key: string): unknown {
  for (const row of rows) {
    const value = row[key];
    if (value !== null && value !== undefined) return value;
  }
  return null;
}
