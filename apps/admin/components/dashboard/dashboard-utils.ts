import type {
  CalendarCheckIn01Icon,
} from "@hugeicons/core-free-icons";

export function numberOrZero(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function countByStatus(
  rows: unknown[],
  preferredOrder: string[] = []
): { status: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      counts.set("unknown", (counts.get("unknown") ?? 0) + 1);
      continue;
    }
    const status = (row as Record<string, unknown>).status;
    const key =
      typeof status === "string" && status.trim() ? status.trim() : "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const items = Array.from(counts.entries()).map(([status, count]) => ({
    status,
    count,
  }));
  if (!preferredOrder.length) return items;

  const rank = new Map(preferredOrder.map((key, index) => [key, index]));
  return items.sort((a, b) => {
    const aRank = rank.has(a.status) ? (rank.get(a.status) as number) : 10_000;
    const bRank = rank.has(b.status) ? (rank.get(b.status) as number) : 10_000;
    if (aRank !== bRank) return aRank - bRank;
    return a.status.localeCompare(b.status);
  });
}

export type DashboardRole = "owner_admin" | "operator" | "accountant" | "viewer";

export type QuickAction = {
  href: string;
  labelEn: string;
  labelEs: string;
  detailEn: string;
  detailEs: string;
  icon: typeof CalendarCheckIn01Icon;
};

export type NeedsAttentionItem = {
  key: string;
  labelEn: string;
  labelEs: string;
  href: string;
  ctaEn: string;
  ctaEs: string;
  priority: number;
};

export type OperationsKpis = {
  turnoversDue: number;
  turnoversOnTime: number;
  turnoverOnTimeRate: number;
  openTasks: number;
  overdueTasks: number;
  slaBreachedTasks: number;
  upcomingCheckIns: number;
  upcomingCheckOuts: number;
};

export type RevenueSnapshot = {
  periodLabel: string;
  currency: string;
  gross: number;
  expenses: number;
  net: number;
} | null;

export function normalizedRole(value: unknown): DashboardRole {
  const role = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (role === "owner_admin") return "owner_admin";
  if (role === "operator") return "operator";
  if (role === "accountant") return "accountant";
  return "viewer";
}

export function normalizePersonLabel(raw: string): string {
  const cleaned = raw
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return raw;
  return cleaned.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

export function firstName(value: string): string {
  const normalized = normalizePersonLabel(value);
  if (!normalized) return "";
  const [first] = normalized.split(" ");
  return first || normalized;
}

export function userDisplayName(
  mePayload: Record<string, unknown>,
  authUser: Record<string, unknown>
): string {
  const user =
    mePayload.user && typeof mePayload.user === "object"
      ? (mePayload.user as Record<string, unknown>)
      : null;
  const authMetadata =
    authUser.user_metadata && typeof authUser.user_metadata === "object"
      ? (authUser.user_metadata as Record<string, unknown>)
      : null;
  const candidates = [
    user?.full_name,
    user?.name,
    user?.display_name,
    mePayload.full_name,
    mePayload.name,
    mePayload.display_name,
    authMetadata?.full_name,
    authMetadata?.name,
    authMetadata?.display_name,
    authUser.full_name,
    user?.email,
    authUser.email,
    mePayload.email,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    return firstName(candidate.trim());
  }
  return "";
}

export function roleGreeting(locale: string, isEn: boolean): string {
  const hourText = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  const hour = Number.parseInt(hourText, 10);

  if (Number.isNaN(hour)) {
    return isEn ? "Welcome back" : "Bienvenido de nuevo";
  }
  if (hour < 12) {
    return isEn ? "Good morning" : "Buenos días";
  }
  if (hour < 18) {
    return isEn ? "Good afternoon" : "Buenas tardes";
  }
  return isEn ? "Good evening" : "Buenas noches";
}
