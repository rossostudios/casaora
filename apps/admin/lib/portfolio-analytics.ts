import {
  fetchJson,
  fetchList,
  fetchPortfolioKpis,
  fetchPortfolioSnapshots,
  type PortfolioSnapshot,
} from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import {
  fetchPortfolioPropertiesOverview,
  fetchPortfolioUnitsOverview,
  type PortfolioPropertyRow,
} from "@/lib/portfolio-overview";

export type PortfolioOverviewPeriod = "30d" | "90d" | "12m";

export type PortfolioOverviewResponse = {
  summary: {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    occupancyRate: number;
    openTasks: number;
    overdueCollections: number;
    monthlyRevenue: number;
  };
  trend: {
    period: PortfolioOverviewPeriod;
    points: Array<{
      date: string;
      occupancyRate: number;
      revenue: number;
      noi: number;
    }>;
    delta: {
      revenuePct: number | null;
      occupancyPts: number | null;
      noiPct: number | null;
    };
  };
  topProperties: Array<{
    id: string;
    name: string;
    occupiedUnits: number;
    totalUnits: number;
    openTasks: number;
    overdueCollections: number;
    health: "good" | "watch" | "critical";
    href: string;
    unitsHref: string;
  }>;
  attentionItems: Array<{
    id: string;
    kind: "property" | "unit";
    severity: "high" | "medium" | "low";
    title: string;
    subtitle: string;
    href: string;
  }>;
  hasData: boolean;
};

type LegacyRecord = Record<string, unknown>;

const OPEN_COLLECTION_STATUSES = new Set([
  "pending",
  "open",
  "due",
  "overdue",
  "partial",
  "partially_paid",
  "scheduled",
]);

const PAID_COLLECTION_STATUSES = new Set(["paid", "cancelled", "canceled"]);

function isMissingOverviewRoute(err: unknown, path: string): boolean {
  const message = errorMessage(err).toLowerCase();
  return message.includes("(404)") && message.includes(path.toLowerCase());
}

function isLegacyRecord(value: unknown): value is LegacyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeStatus(value: unknown): string {
  return asString(value).toLowerCase().replaceAll(" ", "_");
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizePortfolioOverviewPeriod(
  value: string | null | undefined
): PortfolioOverviewPeriod {
  if (value === "90d" || value === "12m") return value;
  return "30d";
}

function periodSnapshotLimit(period: PortfolioOverviewPeriod): number {
  switch (period) {
    case "90d":
      return 90;
    case "12m":
      return 365;
    default:
      return 30;
  }
}

function riskCountFromTone(value: PortfolioPropertyRow["collectionsRisk"]): number {
  switch (value) {
    case "high":
      return 3;
    case "watch":
      return 1;
    default:
      return 0;
  }
}

function propertyHealthRank(value: PortfolioOverviewResponse["topProperties"][number]["health"]): number {
  switch (value) {
    case "critical":
      return 3;
    case "watch":
      return 2;
    default:
      return 1;
  }
}

function attentionSeverityRank(
  value: PortfolioOverviewResponse["attentionItems"][number]["severity"]
): number {
  switch (value) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function percentChange(current: number, baseline: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) {
    return null;
  }
  return roundMetric(((current - baseline) / baseline) * 100);
}

function buildTrendFromSnapshots(
  period: PortfolioOverviewPeriod,
  snapshots: PortfolioSnapshot[],
  fallbackPoint?: {
    occupancyRate: number;
    revenue: number;
    noi: number;
  } | null
): PortfolioOverviewResponse["trend"] {
  const points = snapshots
    .slice()
    .reverse()
    .map((snapshot) => ({
      date: snapshot.date,
      occupancyRate: roundMetric(asNumber(snapshot.occupancy) * 100),
      revenue: roundMetric(asNumber(snapshot.revenue)),
      noi: roundMetric(asNumber(snapshot.noi)),
    }))
    .filter((point) => Boolean(point.date));

  if (points.length === 0 && fallbackPoint) {
    points.push({
      date: new Date().toISOString().slice(0, 10),
      occupancyRate: roundMetric(fallbackPoint.occupancyRate),
      revenue: roundMetric(fallbackPoint.revenue),
      noi: roundMetric(fallbackPoint.noi),
    });
  }

  const first = points[0];
  const last = points[points.length - 1];
  return {
    period,
    points,
    delta:
      first && last && points.length > 1
        ? {
            revenuePct: percentChange(last.revenue, first.revenue),
            occupancyPts: roundMetric(last.occupancyRate - first.occupancyRate),
            noiPct: percentChange(last.noi, first.noi),
          }
        : {
            revenuePct: null,
            occupancyPts: null,
            noiPct: null,
          },
  };
}

function isOpenCollection(record: LegacyRecord): boolean {
  const status = normalizeStatus(record.status);
  if (PAID_COLLECTION_STATUSES.has(status)) return false;
  if (OPEN_COLLECTION_STATUSES.has(status)) return true;
  return Boolean(status);
}

function isOverdueCollection(record: LegacyRecord): boolean {
  if (!isOpenCollection(record)) return false;
  const dueDate = asString(record.due_date);
  return Boolean(dueDate) && dueDate < new Date().toISOString().slice(0, 10);
}

function buildFallbackOverview(params: {
  period: PortfolioOverviewPeriod;
  properties: Awaited<ReturnType<typeof fetchPortfolioPropertiesOverview>>;
  units: Awaited<ReturnType<typeof fetchPortfolioUnitsOverview>>;
  snapshots: PortfolioSnapshot[];
  monthlyNoi: number;
  overdueCollectionsByPropertyId: Map<string, number>;
  overdueCollectionsByUnitId: Map<string, number>;
}): PortfolioOverviewResponse {
  const summary = {
    totalProperties: params.properties.summary.totalProperties,
    totalUnits:
      params.properties.summary.totalUnits || params.units.summary.totalUnits || 0,
    occupiedUnits: params.properties.summary.occupiedUnits,
    occupancyRate: roundMetric(params.properties.summary.occupancyRate),
    openTasks: params.properties.summary.openTasks,
    overdueCollections: params.properties.summary.overdueCollections,
    monthlyRevenue: roundMetric(params.properties.summary.monthlyRevenue),
  };

  const topProperties = params.properties.rows
    .map((row) => {
      const overdueCollections =
        params.overdueCollectionsByPropertyId.get(row.id) ??
        riskCountFromTone(row.collectionsRisk);
      return {
        id: row.id,
        name: row.name,
        occupiedUnits: row.occupiedUnits,
        totalUnits: row.totalUnits,
        openTasks: row.openTasks,
        overdueCollections,
        health: row.health,
        href: row.primaryHref,
        unitsHref: row.unitsHref,
      };
    })
    .sort((left, right) => {
      return (
        propertyHealthRank(right.health) - propertyHealthRank(left.health) ||
        right.overdueCollections - left.overdueCollections ||
        right.openTasks - left.openTasks ||
        (right.totalUnits - right.occupiedUnits) -
          (left.totalUnits - left.occupiedUnits) ||
        left.name.localeCompare(right.name)
      );
    })
    .slice(0, 8);

  const attentionItems = [
    ...params.properties.rows
      .filter((row) => row.health !== "good" || row.collectionsRisk !== "none")
      .map((row) => {
        const overdueCollections =
          params.overdueCollectionsByPropertyId.get(row.id) ??
          riskCountFromTone(row.collectionsRisk);
        const severity: "high" | "medium" | "low" =
          row.health === "critical" || overdueCollections >= 3 ? "high" : "medium";
        return {
          id: `property:${row.id}`,
          kind: "property" as const,
          severity,
          title: row.name,
          subtitle: `${row.openTasks} open tasks · ${overdueCollections} overdue collections · ${row.occupiedUnits}/${row.totalUnits} occupied`,
          href: row.primaryHref,
        };
      }),
    ...params.units.rows
      .filter((row) => {
        const overdueCollections =
          params.overdueCollectionsByUnitId.get(row.id) ?? 0;
        return (
          row.maintenanceRisk !== "none" ||
          row.leaseState === "ending_soon" ||
          overdueCollections > 0
        );
      })
      .map((row) => {
        const overdueCollections =
          params.overdueCollectionsByUnitId.get(row.id) ?? 0;
        const parts = [`${row.propertyName} · ${row.code}`];
        if (row.maintenanceRisk !== "none") {
          parts.push(`maintenance ${row.maintenanceRisk}`);
        }
        if (row.leaseState === "ending_soon") {
          parts.push("lease ending soon");
        }
        if (overdueCollections > 0) {
          parts.push(`${overdueCollections} overdue collections`);
        }
        const severity: "high" | "medium" | "low" =
          row.maintenanceRisk === "high" || overdueCollections > 0
            ? "high"
            : "medium";
        return {
          id: `unit:${row.id}`,
          kind: "unit" as const,
          severity,
          title: `Unit ${row.code}`,
          subtitle: parts.join(" · "),
          href: row.primaryHref,
        };
      }),
  ]
    .sort((left, right) => {
      return (
        attentionSeverityRank(right.severity) -
          attentionSeverityRank(left.severity) ||
        left.title.localeCompare(right.title)
      );
    })
    .slice(0, 8);

  const hasData =
    summary.totalProperties > 0 ||
    summary.totalUnits > 0 ||
    params.snapshots.length > 0;

  return {
    summary,
    trend: buildTrendFromSnapshots(
      params.period,
      params.snapshots,
      hasData
        ? {
            occupancyRate: summary.occupancyRate,
            revenue: summary.monthlyRevenue,
            noi: params.monthlyNoi,
          }
        : null
    ),
    topProperties,
    attentionItems,
    hasData,
  };
}

async function fetchLegacyPortfolioOverview(
  orgId: string,
  period: PortfolioOverviewPeriod
): Promise<PortfolioOverviewResponse> {
  const [properties, units, snapshotsPayload, kpis, leases, collections] =
    await Promise.all([
      fetchPortfolioPropertiesOverview({
        org_id: orgId,
        limit: 500,
        offset: 0,
      }),
      fetchPortfolioUnitsOverview({
        org_id: orgId,
        limit: 500,
        offset: 0,
      }),
      fetchPortfolioSnapshots(orgId, periodSnapshotLimit(period)).catch(() => ({
        snapshots: [] as PortfolioSnapshot[],
      })),
      fetchPortfolioKpis(orgId).catch(() => null),
      fetchList("/leases", orgId, 500).catch(() => [] as unknown[]),
      fetchList("/collections", orgId, 700).catch(() => [] as unknown[]),
    ]);

  const leaseById = new Map<
    string,
    { propertyId: string; unitId: string }
  >();
  for (const row of leases) {
    if (!isLegacyRecord(row)) continue;
    const id = asString(row.id);
    if (!id) continue;
    leaseById.set(id, {
      propertyId: asString(row.property_id),
      unitId: asString(row.unit_id),
    });
  }

  const overdueCollectionsByPropertyId = new Map<string, number>();
  const overdueCollectionsByUnitId = new Map<string, number>();
  for (const row of collections) {
    if (!isLegacyRecord(row) || !isOverdueCollection(row)) continue;
    const leaseId = asString(row.lease_id);
    const relation = leaseId ? leaseById.get(leaseId) : null;
    if (!relation) continue;
    if (relation.propertyId) {
      overdueCollectionsByPropertyId.set(
        relation.propertyId,
        (overdueCollectionsByPropertyId.get(relation.propertyId) ?? 0) + 1
      );
    }
    if (relation.unitId) {
      overdueCollectionsByUnitId.set(
        relation.unitId,
        (overdueCollectionsByUnitId.get(relation.unitId) ?? 0) + 1
      );
    }
  }

  const monthlyNoi =
    kpis && Number.isFinite(kpis.noi)
      ? roundMetric(kpis.noi)
      : roundMetric(properties.summary.monthlyRevenue);

  return buildFallbackOverview({
    period,
    properties,
    units,
    snapshots: snapshotsPayload.snapshots ?? [],
    monthlyNoi,
    overdueCollectionsByPropertyId,
    overdueCollectionsByUnitId,
  });
}

export async function fetchPortfolioOverview(
  orgId: string,
  periodInput?: string | null
): Promise<PortfolioOverviewResponse> {
  const period = normalizePortfolioOverviewPeriod(periodInput);
  try {
    return await fetchJson<PortfolioOverviewResponse>("/portfolio/overview", {
      org_id: orgId,
      period,
    });
  } catch (err) {
    if (!isMissingOverviewRoute(err, "/portfolio/overview")) {
      throw err;
    }
    return fetchLegacyPortfolioOverview(orgId, period);
  }
}

export { normalizePortfolioOverviewPeriod };
