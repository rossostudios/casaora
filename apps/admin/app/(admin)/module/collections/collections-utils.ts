export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function asString(value: unknown): string {
  return typeof value === "string" ? value : value ? String(value) : "";
}

export function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function statusLabel(value: string, isEn: boolean): string {
  const normalized = value.trim().toLowerCase();
  if (isEn) return normalized || "unknown";

  if (normalized === "scheduled") return "Programado";
  if (normalized === "pending") return "Pendiente";
  if (normalized === "paid") return "Pagado";
  if (normalized === "late") return "Atrasado";
  if (normalized === "waived") return "Exonerado";

  return normalized || "desconocido";
}

export function overdueDays(dueDate: string, status: string): number {
  if (status.trim().toLowerCase() === "paid") return 0;
  if (!ISO_DATE_RE.test(dueDate)) return 0;

  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  const [year, month, day] = dueDate.split("-").map(Number);
  const dueUtc = Date.UTC(year, month - 1, day);
  const diff = Math.floor((todayUtc - dueUtc) / 86_400_000);
  return Math.max(diff, 0);
}

export function isCurrentMonth(dateStr: string): boolean {
  if (!ISO_DATE_RE.test(dateStr)) return false;
  const now = new Date();
  const [year, month] = dateStr.split("-").map(Number);
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

export type CollectionRow = {
  id: string;
  status: string;
  status_label: string;
  paid_at: string | null;
  overdue_days: number;
  amount: number;
  currency: string;
  due_date: string;
  [key: string]: unknown;
};

export type SummaryByCurrency = {
  outstanding: number;
  overdue: number;
  collectedThisMonth: number;
  totalThisMonth: number;
};

export type AgingRow = {
  tenant: string;
  leaseId: string;
  currency: string;
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
  total: number;
};

export type SummaryData = {
  byCurrency: Map<string, SummaryByCurrency>;
  collectionRate: number;
  paidThisMonth: number;
  totalThisMonth: number;
};

export function computeSummaries(rows: CollectionRow[]): SummaryData {
  const byCurrency = new Map<string, SummaryByCurrency>();

  const ensure = (cur: string): SummaryByCurrency => {
    let s = byCurrency.get(cur);
    if (!s) {
      s = {
        outstanding: 0,
        overdue: 0,
        collectedThisMonth: 0,
        totalThisMonth: 0,
      };
      byCurrency.set(cur, s);
    }
    return s;
  };

  const unpaidStatuses = new Set(["scheduled", "pending", "late"]);
  const todayDate = new Date();
  const todayUtc = Date.UTC(
    todayDate.getUTCFullYear(),
    todayDate.getUTCMonth(),
    todayDate.getUTCDate()
  );

  for (const row of rows) {
    const s = ensure(row.currency);
    const statusNorm = row.status.toLowerCase();

    if (unpaidStatuses.has(statusNorm)) {
      s.outstanding += row.amount;

      if (ISO_DATE_RE.test(row.due_date)) {
        const [y, m, d] = row.due_date.split("-").map(Number);
        const dueUtc = Date.UTC(y, m - 1, d);
        if (dueUtc < todayUtc) {
          s.overdue += row.amount;
        }
      }
    }

    const paidAt = row.paid_at || row.due_date;
    if (statusNorm === "paid" && isCurrentMonth(paidAt)) {
      s.collectedThisMonth += row.amount;
    }

    if (isCurrentMonth(row.due_date)) {
      s.totalThisMonth += 1;
    }
  }

  let paidThisMonth = 0;
  let totalThisMonth = 0;
  for (const row of rows) {
    if (isCurrentMonth(row.due_date)) {
      totalThisMonth++;
      if (row.status.toLowerCase() === "paid") paidThisMonth++;
    }
  }
  const collectionRate =
    totalThisMonth > 0 ? paidThisMonth / totalThisMonth : 0;

  return { byCurrency, collectionRate, paidThisMonth, totalThisMonth };
}

export function computeAgingRows(rows: CollectionRow[]): AgingRow[] {
  const unpaid = new Set(["scheduled", "pending", "late"]);
  const map = new Map<string, AgingRow>();

  for (const row of rows) {
    if (!unpaid.has(row.status.toLowerCase())) continue;
    const key = `${asString(row.lease_id)}|${row.currency}`;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        tenant: asString(row.tenant_full_name) || asString(row.lease_id),
        leaseId: asString(row.lease_id),
        currency: row.currency,
        current: 0,
        d1_30: 0,
        d31_60: 0,
        d61_90: 0,
        d90plus: 0,
        total: 0,
      };
      map.set(key, entry);
    }
    const days = row.overdue_days;
    if (days <= 0) entry.current += row.amount;
    else if (days <= 30) entry.d1_30 += row.amount;
    else if (days <= 60) entry.d31_60 += row.amount;
    else if (days <= 90) entry.d61_90 += row.amount;
    else entry.d90plus += row.amount;
    entry.total += row.amount;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function exportCollectionsCsv(
  rows: CollectionRow[],
  today: string
): void {
  const headers = [
    "due_date",
    "tenant",
    "status",
    "amount",
    "currency",
    "payment_method",
    "paid_at",
  ];
  const csvRows = [headers.join(",")];
  for (const row of rows) {
    csvRows.push(
      [
        row.due_date,
        asString(row.tenant_full_name).replace(/,/g, " "),
        row.status,
        row.amount,
        row.currency,
        asString(row.payment_method),
        row.paid_at ?? "",
      ].join(",")
    );
  }
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `collections-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
