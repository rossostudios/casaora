/* ------------------------------------------------------------------ */
/*  Shared calendar types, helpers, colors & bar computation           */
/*  Extracted from weekly-calendar / monthly-calendar to deduplicate   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ReservationRow = {
  id: string;
  status: string;
  check_in_date: string | null;
  check_out_date: string | null;
  guest_name: string | null;
  unit_id: string | null;
  unit_name: string | null;
};

export type BlockRow = {
  id: string;
  starts_on: string | null;
  ends_on: string | null;
  reason: string | null;
  unit_id: string | null;
  unit_name: string | null;
};

export type UnitOption = { id: string; label: string };

export type CalendarBar = {
  id: string;
  unitId: string;
  label: string;
  tooltipLabel: string;
  status: string;
  leftPercent: number;
  widthPercent: number;
  kind: "reservation" | "block";
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function asStr(v: unknown): string {
  return typeof v === "string" ? v : v ? String(v) : "";
}

export function isIso(v: unknown): v is string {
  return typeof v === "string" && ISO_RE.test(v);
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function shortDate(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.valueOf())) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(d);
}

/* ------------------------------------------------------------------ */
/*  Status colors                                                      */
/* ------------------------------------------------------------------ */

export const STATUS_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  pending: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-800 dark:text-amber-300",
  },
  confirmed: {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    border: "border-indigo-300 dark:border-indigo-700",
    text: "text-indigo-800 dark:text-indigo-300",
  },
  checked_in: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    border: "border-emerald-300 dark:border-emerald-700",
    text: "text-emerald-800 dark:text-emerald-300",
  },
  checked_out: {
    bg: "bg-slate-100 dark:bg-slate-800/40",
    border: "border-slate-300 dark:border-slate-600",
    text: "text-slate-600 dark:text-slate-400",
  },
  cancelled: {
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-300 dark:border-red-700",
    text: "text-red-700 dark:text-red-400",
  },
  no_show: {
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-300 dark:border-red-700",
    text: "text-red-700 dark:text-red-400",
  },
};

export const DEFAULT_STATUS_COLOR = {
  bg: "bg-muted",
  border: "border-border",
  text: "text-muted-foreground",
};

export function statusColor(status: string) {
  return STATUS_COLORS[status.trim().toLowerCase()] ?? DEFAULT_STATUS_COLOR;
}

export function humanizeStatus(status: string, isEn: boolean): string {
  const s = status.trim().toLowerCase();
  if (isEn) {
    if (s === "pending") return "Pending";
    if (s === "confirmed") return "Confirmed";
    if (s === "checked_in") return "Checked In";
    if (s === "checked_out") return "Checked Out";
    if (s === "cancelled") return "Cancelled";
    if (s === "no_show") return "No Show";
    return status;
  }
  if (s === "pending") return "Pendiente";
  if (s === "confirmed") return "Confirmada";
  if (s === "checked_in") return "Check-in";
  if (s === "checked_out") return "Check-out";
  if (s === "cancelled") return "Cancelada";
  if (s === "no_show") return "No show";
  return status;
}

/* ------------------------------------------------------------------ */
/*  Normalization                                                      */
/* ------------------------------------------------------------------ */

export function normalizeReservations(
  raw: Record<string, unknown>[]
): ReservationRow[] {
  return raw.map((r) => ({
    id: asStr(r.id).trim(),
    status: asStr(r.status).trim(),
    check_in_date: isIso(r.check_in_date) ? r.check_in_date : null,
    check_out_date: isIso(r.check_out_date) ? r.check_out_date : null,
    guest_name: asStr(r.guest_name).trim() || null,
    unit_id: asStr(r.unit_id).trim() || null,
    unit_name: asStr(r.unit_name).trim() || null,
  }));
}

export function normalizeBlocks(raw: Record<string, unknown>[]): BlockRow[] {
  return raw.map((b) => ({
    id: asStr(b.id).trim(),
    starts_on: isIso(b.starts_on) ? b.starts_on : null,
    ends_on: isIso(b.ends_on) ? b.ends_on : null,
    reason: asStr(b.reason).trim() || null,
    unit_id: asStr(b.unit_id).trim() || null,
    unit_name: asStr(b.unit_name).trim() || null,
  }));
}

export function buildVisibleUnits(
  units: UnitOption[],
  reservations: ReservationRow[],
  blocks: BlockRow[]
): UnitOption[] {
  const unitMap = new Map<string, string>();
  for (const u of units) unitMap.set(u.id, u.label);
  for (const r of reservations) {
    if (r.unit_id && !unitMap.has(r.unit_id))
      unitMap.set(r.unit_id, r.unit_name || r.unit_id);
  }
  for (const b of blocks) {
    if (b.unit_id && !unitMap.has(b.unit_id))
      unitMap.set(b.unit_id, b.unit_name || b.unit_id);
  }
  return Array.from(unitMap.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/* ------------------------------------------------------------------ */
/*  Bar computation                                                    */
/* ------------------------------------------------------------------ */

export function computeBars(
  reservations: ReservationRow[],
  blocks: BlockRow[],
  windowStart: string,
  windowEnd: string,
  totalDays: number,
  isEn: boolean
): CalendarBar[] {
  const bars: CalendarBar[] = [];

  for (const r of reservations) {
    if (!(r.check_in_date && r.check_out_date && r.unit_id)) continue;
    if (r.check_out_date <= windowStart || r.check_in_date >= windowEnd)
      continue;

    const clampedStart =
      r.check_in_date < windowStart ? windowStart : r.check_in_date;
    const clampedEnd =
      r.check_out_date > windowEnd ? windowEnd : r.check_out_date;

    const startDay =
      (new Date(`${clampedStart}T00:00:00`).getTime() -
        new Date(`${windowStart}T00:00:00`).getTime()) /
      86_400_000;
    const daySpan =
      (new Date(`${clampedEnd}T00:00:00`).getTime() -
        new Date(`${clampedStart}T00:00:00`).getTime()) /
      86_400_000;

    if (daySpan <= 0) continue;

    bars.push({
      id: r.id,
      unitId: r.unit_id,
      label: r.guest_name || (isEn ? "Guest" : "Huésped"),
      tooltipLabel: `${r.guest_name || (isEn ? "Guest" : "Huésped")} — ${humanizeStatus(r.status, isEn)} — ${r.check_in_date} → ${r.check_out_date}`,
      status: r.status,
      leftPercent: (startDay / totalDays) * 100,
      widthPercent: (daySpan / totalDays) * 100,
      kind: "reservation",
    });
  }

  for (const b of blocks) {
    if (!(b.starts_on && b.ends_on && b.unit_id)) continue;
    if (b.ends_on <= windowStart || b.starts_on >= windowEnd) continue;

    const clampedStart = b.starts_on < windowStart ? windowStart : b.starts_on;
    const clampedEnd = b.ends_on > windowEnd ? windowEnd : b.ends_on;

    const startDay =
      (new Date(`${clampedStart}T00:00:00`).getTime() -
        new Date(`${windowStart}T00:00:00`).getTime()) /
      86_400_000;
    const daySpan =
      (new Date(`${clampedEnd}T00:00:00`).getTime() -
        new Date(`${clampedStart}T00:00:00`).getTime()) /
      86_400_000;

    if (daySpan <= 0) continue;

    bars.push({
      id: b.id,
      unitId: b.unit_id,
      label: b.reason || (isEn ? "Blocked" : "Bloqueado"),
      tooltipLabel: `${b.reason || (isEn ? "Blocked" : "Bloqueado")} — ${b.starts_on} → ${b.ends_on}`,
      status: "block",
      leftPercent: (startDay / totalDays) * 100,
      widthPercent: (daySpan / totalDays) * 100,
      kind: "block",
    });
  }

  return bars;
}
