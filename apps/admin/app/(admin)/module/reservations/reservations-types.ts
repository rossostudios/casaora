export type UnitRow = {
  id: string;
  name?: string | null;
  code?: string | null;
  property_name?: string | null;
};

export type ReservationRow = {
  id: string;
  status?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  total_amount?: number | string | null;
  amount_paid?: number | string | null;
  currency?: string | null;

  unit_id?: string | null;
  unit_name?: string | null;

  property_id?: string | null;
  property_name?: string | null;

  guest_id?: string | null;
  guest_name?: string | null;

  adults?: number | string | null;
  children?: number | string | null;

  integration_id?: string | null;
  integration_name?: string | null;
  channel_name?: string | null;

  source?: string | null;
  listing_public_slug?: string | null;
};

export type UnitOption = {
  id: string;
  label: string;
};

export type QuickFilter =
  | "all"
  | "arrivals_today"
  | "departures_today"
  | "in_house"
  | "pending";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_RE.test(value);
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value : value ? String(value) : "";
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function overlapsRange(options: {
  start: string;
  end: string;
  from?: string;
  to?: string;
}): boolean {
  const { start, end, from, to } = options;
  if (!(isIsoDate(start) && isIsoDate(end))) return true;
  const windowFrom = isIsoDate(from) ? from : null;
  const windowTo = isIsoDate(to) ? to : null;
  if (!(windowFrom || windowTo)) return true;

  const rangeStart = windowFrom ?? start;
  const rangeEnd = windowTo ?? end;

  return !(end <= rangeStart || start >= rangeEnd);
}

export function daysBetween(a: string | null, b: string | null): number | null {
  if (!(a && b && isIsoDate(a) && isIsoDate(b))) return null;
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (Number.isNaN(d1.valueOf()) || Number.isNaN(d2.valueOf())) return null;
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86_400_000));
}

export function statusActions(
  status: string
): { next: string; label: string }[] {
  const normalized = status.trim().toLowerCase();
  if (normalized === "pending") {
    return [
      { next: "confirmed", label: "Confirm" },
      { next: "cancelled", label: "Cancel" },
    ];
  }
  if (normalized === "confirmed") {
    return [
      { next: "checked_in", label: "Check-in" },
      { next: "no_show", label: "No-show" },
      { next: "cancelled", label: "Cancel" },
    ];
  }
  if (normalized === "checked_in") {
    return [{ next: "checked_out", label: "Check-out" }];
  }
  return [];
}

export function localizedActionLabel(isEn: boolean, next: string): string {
  if (isEn) {
    if (next === "confirmed") return "Confirm";
    if (next === "checked_in") return "Check-in";
    if (next === "checked_out") return "Check-out";
    if (next === "cancelled") return "Cancel";
    if (next === "no_show") return "No-show";
    return next;
  }

  if (next === "confirmed") return "Confirmar";
  if (next === "checked_in") return "Check-in";
  if (next === "checked_out") return "Check-out";
  if (next === "cancelled") return "Cancelar";
  if (next === "no_show") return "No-show";
  return next;
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
