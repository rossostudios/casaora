import { fetchJson } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import {
  buildPropertyPortfolioRows,
  buildPropertyRelationIndex,
} from "@/lib/features/properties/analytics";
import {
  asNumber,
  asString,
  COLLECTION_OPEN_STATUSES,
  COLLECTION_REVENUE_STATUSES,
  convertAmountToPyg,
  LEASE_ACTIVE_STATUSES,
  normalizedStatus,
  TASK_CLOSED_STATUSES,
  toDate,
  URGENT_TASK_PRIORITIES,
} from "@/lib/features/properties/analytics-shared";
import type {
  PropertyRecord,
  PropertyRelationRow,
} from "@/lib/features/properties/types";

type QueryInput = Record<string, string | number | boolean | undefined | null>;
type LegacyRecord = Record<string, unknown>;

const ACTIVE_RESERVATION_STATUSES = new Set([
  "pending",
  "confirmed",
  "checked_in",
]);
const CANCELLED_RESERVATION_STATUSES = new Set([
  "cancelled",
  "canceled",
  "rejected",
]);
const ENDING_SOON_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;
const UNIT_BULK_PATCH_FIELDS = [
  "condition_status",
  "floor_level",
  "unit_type",
  "base_price_monthly",
  "is_active",
] as const;

export type SavedViewCount = {
  id: string;
  count: number;
};

export type OverviewPagination = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type PortfolioPropertyRow = {
  id: string;
  name: string;
  address: string | null;
  status: string | null;
  propertyType: string | null;
  occupiedUnits: number;
  totalUnits: number;
  openTasks: number;
  collectionsRisk: "none" | "watch" | "high";
  health: "good" | "watch" | "critical";
  primaryHref: string;
  unitsHref: string;
  city?: string | null;
  monthlyRevenue?: number;
};

export type PropertiesOverviewResponse = {
  rows: PortfolioPropertyRow[];
  summary: {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyRate: number;
    openTasks: number;
    overdueCollections: number;
    monthlyRevenue: number;
  };
  savedViews: SavedViewCount[];
  pagination: OverviewPagination;
};

export type PortfolioUnitRow = {
  id: string;
  code: string;
  name?: string | null;
  propertyId: string;
  propertyName: string;
  status: string | null;
  unitType: string | null;
  conditionStatus: string | null;
  floorLevel: number | null;
  bedrooms: number;
  bathrooms: number;
  rentAmount: number;
  currency: string;
  leaseState: "vacant" | "active" | "ending_soon";
  maintenanceRisk: "none" | "watch" | "high";
  primaryHref: string;
  propertyHref: string;
};

export type UnitsOverviewResponse = {
  rows: PortfolioUnitRow[];
  summary: {
    totalUnits: number;
    vacantUnits: number;
    endingSoonUnits: number;
    highRiskUnits: number;
    averageRent: number;
  };
  savedViews: SavedViewCount[];
  facets: {
    properties: Array<{ id: string; name: string; count: number }>;
  };
  bulkUpdate: {
    supportedPatchFields: string[];
  };
  pagination: OverviewPagination;
};

export type PropertyDetailOverviewResponse = {
  property: Record<string, unknown>;
  summary: {
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyRate: number;
    openTasks: number;
    urgentTasks: number;
    activeLeases: number;
    activeReservations: number;
    overdueCollections: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    health: "good" | "watch" | "critical";
  };
  hierarchy: Record<string, unknown>;
  linkedUnits: Array<{
    id: string;
    code: string;
    name?: string | null;
    conditionStatus?: string | null;
    floorLevel?: number | null;
    leaseState: "occupied" | "vacant";
    maintenanceRisk: "none" | "watch" | "high";
    openTasks: number;
    overdueCollections: number;
    href: string;
  }>;
  recentActivity: Array<{
    id: string;
    kind: string;
    title?: string | null;
    meta?: string | null;
    createdAt?: string | null;
    href: string;
  }>;
};

export type UnitDetailOverviewResponse = {
  unit: Record<string, unknown>;
  summary: {
    leaseState: "vacant" | "active";
    maintenanceRisk: "none" | "watch" | "high";
    openTasks: number;
    overdueCollections: number;
  };
  parentProperty: {
    id: string;
    name: string;
    address?: string | null;
    status?: string | null;
    totalUnits: number;
    occupiedUnits: number;
    href: string;
    unitsHref: string;
  };
  siblings: Array<{
    id: string;
    code: string;
    name?: string | null;
    leaseState: "vacant" | "active" | "ending_soon";
    conditionStatus?: string | null;
    primaryHref: string;
  }>;
  activeLease: {
    id: string;
    tenantName: string;
    monthlyRent: number;
    currency: string;
    endsOn?: string | null;
    href: string;
  } | null;
  upcomingReservations: Array<{
    id: string;
    status: string;
    checkInDate?: string | null;
    checkOutDate?: string | null;
    totalAmount: number;
    currency: string;
    href: string;
  }>;
  openTasks: Array<{
    id: string;
    title?: string | null;
    status?: string | null;
    priority?: string | null;
    href: string;
  }>;
};

type LegacyPortfolioPropertyRow = PortfolioPropertyRow & {
  overdueCollectionsCount: number;
};

type LegacyPortfolioUnitRow = PortfolioUnitRow & {
  endingSoon: boolean;
  searchText: string;
};

function isLegacyRecord(value: unknown): value is LegacyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function maybeString(value: unknown): string | null {
  const text = asString(value);
  return text || null;
}

function maybeNumber(value: unknown): number | null {
  return asNumber(value);
}

function queryValue(query: QueryInput, key: string): string {
  const value = query[key];
  return value === undefined || value === null ? "" : String(value).trim();
}

function buildPagination(total: number): OverviewPagination {
  return {
    total,
    limit: total,
    offset: 0,
    hasMore: false,
  };
}

function isMissingOverviewRoute(err: unknown, path: string): boolean {
  const message = errorMessage(err).toLowerCase();
  return message.includes("(404)") && message.includes(path.toLowerCase());
}

async function fetchTableList(path: string, query: QueryInput): Promise<LegacyRecord[]> {
  const payload = await fetchJson<{ data?: unknown[] }>(path, query);
  if (!Array.isArray(payload.data)) return [];
  return payload.data.filter(isLegacyRecord);
}

async function fetchTableListOrEmpty(
  path: string,
  query: QueryInput
): Promise<LegacyRecord[]> {
  try {
    return await fetchTableList(path, query);
  } catch {
    return [];
  }
}

async function fetchTableRecord(path: string): Promise<LegacyRecord> {
  const payload = await fetchJson<unknown>(path);
  if (!isLegacyRecord(payload)) {
    throw new Error(`API request failed (500) for ${path}: Invalid record payload`);
  }
  return payload;
}

async function fetchTableRecordOrNull(path: string): Promise<LegacyRecord | null> {
  try {
    return await fetchTableRecord(path);
  } catch {
    return null;
  }
}

function propertyHealthToUi(value: string): "good" | "watch" | "critical" {
  return value === "critical" || value === "watch" ? value : "good";
}

function collectionsRiskFromCount(count: number): "none" | "watch" | "high" {
  if (count >= 3) return "high";
  if (count > 0) return "watch";
  return "none";
}

function resolveUnitStatus(unit: LegacyRecord): string {
  const explicit = normalizedStatus(unit.status);
  if (explicit) return explicit;
  if (unit.is_active === false || unit.is_active === "false") return "inactive";
  return "active";
}

function isReservationActive(row: LegacyRecord): boolean {
  return ACTIVE_RESERVATION_STATUSES.has(normalizedStatus(row.status));
}

function isReservationUpcoming(row: LegacyRecord): boolean {
  const status = normalizedStatus(row.status);
  if (CANCELLED_RESERVATION_STATUSES.has(status)) return false;
  const checkIn =
    toDate(row.check_in_date) ??
    toDate(row.check_in_at) ??
    toDate(row.arrival_date);
  if (!checkIn) return false;
  return checkIn.getTime() >= Date.now();
}

function isTaskOpen(task: LegacyRecord): boolean {
  return !TASK_CLOSED_STATUSES.has(normalizedStatus(task.status));
}

function isUrgentTask(task: LegacyRecord): boolean {
  const dueAt = toDate(task.due_at);
  const overdue = dueAt !== null && dueAt.getTime() < Date.now();
  return overdue || URGENT_TASK_PRIORITIES.has(normalizedStatus(task.priority));
}

function isActiveLease(lease: LegacyRecord): boolean {
  return LEASE_ACTIVE_STATUSES.has(
    normalizedStatus(lease.lease_status ?? lease.status)
  );
}

function leaseEndsSoon(lease: LegacyRecord): boolean {
  if (!isActiveLease(lease)) return false;
  const endsOn = toDate(lease.ends_on ?? lease.end_date);
  if (!endsOn) return false;
  const delta = endsOn.getTime() - Date.now();
  return delta >= 0 && delta <= ENDING_SOON_WINDOW_MS;
}

function rentAmountForLease(lease: LegacyRecord): number {
  return asNumber(lease.monthly_rent ?? lease.base_price_monthly) ?? 0;
}

function rentAmountForUnit(unit: LegacyRecord): number {
  return asNumber(unit.base_price_monthly ?? unit.default_monthly_rate) ?? 0;
}

function currencyForRecord(record: LegacyRecord): string {
  return asString(record.currency).toUpperCase() || "PYG";
}

function buildPropertySavedViews(
  rows: LegacyPortfolioPropertyRow[]
): SavedViewCount[] {
  return [
    { id: "all", count: rows.length },
    {
      id: "needs_attention",
      count: rows.filter(
        (row) => row.health !== "good" || row.collectionsRisk !== "none"
      ).length,
    },
    {
      id: "vacancy_risk",
      count: rows.filter(
        (row) => row.totalUnits > 0 && row.occupiedUnits < row.totalUnits
      ).length,
    },
    {
      id: "healthy",
      count: rows.filter(
        (row) => row.health === "good" && row.collectionsRisk === "none"
      ).length,
    },
  ];
}

function applyPropertyView(
  rows: LegacyPortfolioPropertyRow[],
  view: string
): LegacyPortfolioPropertyRow[] {
  switch (view) {
    case "needs_attention":
      return rows.filter(
        (row) => row.health !== "good" || row.collectionsRisk !== "none"
      );
    case "vacancy_risk":
      return rows.filter(
        (row) => row.totalUnits > 0 && row.occupiedUnits < row.totalUnits
      );
    case "healthy":
      return rows.filter(
        (row) => row.health === "good" && row.collectionsRisk === "none"
      );
    default:
      return rows;
  }
}

function buildPropertiesSummary(rows: LegacyPortfolioPropertyRow[]) {
  const totalUnits = rows.reduce((total, row) => total + row.totalUnits, 0);
  const occupiedUnits = rows.reduce(
    (total, row) => total + row.occupiedUnits,
    0
  );
  const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
  return {
    totalProperties: rows.length,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    occupancyRate: totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
    openTasks: rows.reduce((total, row) => total + row.openTasks, 0),
    overdueCollections: rows.reduce(
      (total, row) => total + row.overdueCollectionsCount,
      0
    ),
    monthlyRevenue: rows.reduce(
      (total, row) => total + (row.monthlyRevenue ?? 0),
      0
    ),
  };
}

function buildUnitSavedViews(rows: LegacyPortfolioUnitRow[]): SavedViewCount[] {
  return [
    { id: "all", count: rows.length },
    {
      id: "vacant",
      count: rows.filter((row) => row.leaseState === "vacant").length,
    },
    {
      id: "needs_turn",
      count: rows.filter((row) => row.maintenanceRisk !== "none").length,
    },
    {
      id: "lease_risk",
      count: rows.filter((row) => row.leaseState === "ending_soon").length,
    },
  ];
}

function applyUnitView(
  rows: LegacyPortfolioUnitRow[],
  view: string
): LegacyPortfolioUnitRow[] {
  switch (view) {
    case "vacant":
      return rows.filter((row) => row.leaseState === "vacant");
    case "needs_turn":
      return rows.filter((row) => row.maintenanceRisk !== "none");
    case "lease_risk":
      return rows.filter((row) => row.leaseState === "ending_soon");
    default:
      return rows;
  }
}

function buildUnitsSummary(rows: LegacyPortfolioUnitRow[]) {
  const rowsWithRent = rows.filter((row) => row.rentAmount > 0);
  return {
    totalUnits: rows.length,
    vacantUnits: rows.filter((row) => row.leaseState === "vacant").length,
    endingSoonUnits: rows.filter((row) => row.endingSoon).length,
    highRiskUnits: rows.filter((row) => row.maintenanceRisk === "high").length,
    averageRent: rowsWithRent.length
      ? Math.round(
          rowsWithRent.reduce((total, row) => total + row.rentAmount, 0) /
            rowsWithRent.length
        )
      : 0,
  };
}

function buildPropertyFacets(rows: LegacyPortfolioUnitRow[]) {
  const counts = new Map<string, { id: string; name: string; count: number }>();
  for (const row of rows) {
    if (!row.propertyId || !row.propertyName) continue;
    const current = counts.get(row.propertyId);
    if (current) {
      current.count += 1;
    } else {
      counts.set(row.propertyId, {
        id: row.propertyId,
        name: row.propertyName,
        count: 1,
      });
    }
  }

  return Array.from(counts.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

function buildPropertyHierarchyFallback(
  units: LegacyRecord[]
): Record<string, unknown> {
  const floors = new Map<number, LegacyRecord[]>();
  const unassigned: LegacyRecord[] = [];

  for (const unit of units) {
    const level = asNumber(unit.floor_level);
    if (level === null) {
      unassigned.push(unit);
      continue;
    }
    const bucket = floors.get(level);
    if (bucket) bucket.push(unit);
    else floors.set(level, [unit]);
  }

  const orderedFloorValues = Array.from(floors.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([level, rows]) => ({
      id: `floor-${level}`,
      number: level,
      label: `Floor ${level}`,
      units: rows
        .slice()
        .sort((left, right) =>
          `${asString(left.code)}${asString(left.name)}`.localeCompare(
            `${asString(right.code)}${asString(right.name)}`
          )
        )
        .map((unit) => ({
          id: asString(unit.id),
          code: asString(unit.code),
          name: maybeString(unit.name),
          floor_level: level,
        })),
    }));

  return {
    floors: orderedFloorValues,
    unassigned_units: unassigned
      .slice()
      .sort((left, right) =>
        `${asString(left.code)}${asString(left.name)}`.localeCompare(
          `${asString(right.code)}${asString(right.name)}`
        )
      )
      .map((unit) => ({
        id: asString(unit.id),
        code: asString(unit.code),
        name: maybeString(unit.name),
      })),
  };
}

function monthlyRevenueFromCollectionsOrLeases(
  collections: LegacyRecord[],
  relevantLeaseIds: Set<string>,
  leases: LegacyRecord[]
): number {
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const revenueFromCollections = collections.reduce((total, row) => {
    const leaseId = asString(row.lease_id);
    if (leaseId && !relevantLeaseIds.has(leaseId)) return total;
    const dueDateText = asString(row.due_date);
    const paidAtText = asString(row.paid_at);
    const status = normalizedStatus(row.status);
    const isCurrentMonth =
      dueDateText.startsWith(monthPrefix) || paidAtText.startsWith(monthPrefix);
    if (!isCurrentMonth || !COLLECTION_REVENUE_STATUSES.has(status)) {
      return total;
    }
    const amount = asNumber(row.amount) ?? 0;
    const currency = currencyForRecord(row);
    const fxRate = asNumber(row.fx_rate_to_pyg);
    return total + convertAmountToPyg(amount, currency, fxRate);
  }, 0);

  if (revenueFromCollections > 0) return revenueFromCollections;

  return leases.reduce((total, lease) => {
    if (!isActiveLease(lease)) return total;
    const amount = rentAmountForLease(lease);
    const currency = currencyForRecord(lease);
    return total + convertAmountToPyg(amount, currency, null);
  }, 0);
}

function buildRecentPropertyActivity(params: {
  tasks: LegacyRecord[];
  reservations: LegacyRecord[];
  ownerStatements: LegacyRecord[];
  collections: LegacyRecord[];
  leaseIds: Set<string>;
}): PropertyDetailOverviewResponse["recentActivity"] {
  const items = [
    ...params.tasks.map((task) => ({
      id: `task:${asString(task.id) || crypto.randomUUID()}`,
      kind: "task",
      title: maybeString(task.title) ?? maybeString(task.kind) ?? "Task",
      meta: maybeString(task.status) ?? maybeString(task.priority),
      createdAt:
        maybeString(task.updated_at) ??
        maybeString(task.created_at) ??
        maybeString(task.due_at),
      href: `/module/tasks/${encodeURIComponent(asString(task.id))}`,
    })),
    ...params.reservations.map((reservation) => ({
      id: `reservation:${asString(reservation.id) || crypto.randomUUID()}`,
      kind: "reservation",
      title:
        maybeString(reservation.guest_name) ??
        maybeString(reservation.code) ??
        "Reservation",
      meta: maybeString(reservation.status),
      createdAt:
        maybeString(reservation.created_at) ??
        maybeString(reservation.check_in_date),
      href: `/module/reservations/${encodeURIComponent(asString(reservation.id))}`,
    })),
    ...params.ownerStatements.map((statement) => ({
      id: `statement:${asString(statement.id) || crypto.randomUUID()}`,
      kind: "owner_statement",
      title:
        maybeString(statement.title) ??
        maybeString(statement.period_label) ??
        "Owner statement",
      meta: maybeString(statement.status),
      createdAt:
        maybeString(statement.period_end) ??
        maybeString(statement.generated_at) ??
        maybeString(statement.created_at),
      href: `/module/owner-statements/${encodeURIComponent(asString(statement.id))}`,
    })),
    ...params.collections
      .filter((collection) => {
        const leaseId = asString(collection.lease_id);
        return !leaseId || params.leaseIds.has(leaseId);
      })
      .map((collection) => ({
        id: `collection:${asString(collection.id) || crypto.randomUUID()}`,
        kind: "collection",
        title:
          maybeString(collection.title) ??
          maybeString(collection.status) ??
          "Collection",
        meta: maybeString(collection.due_date),
        createdAt:
          maybeString(collection.updated_at) ??
          maybeString(collection.created_at) ??
          maybeString(collection.due_date),
        href: "/module/collections",
      })),
  ]
    .filter((item) => item.href && item.id)
    .sort((left, right) => {
      const leftDate = toDate(left.createdAt) ?? new Date(0);
      const rightDate = toDate(right.createdAt) ?? new Date(0);
      return rightDate.getTime() - leftDate.getTime();
    });

  return items.slice(0, 8);
}

function maintenanceRiskForUnit(
  unit: LegacyRecord,
  openTasks: LegacyRecord[]
): "none" | "watch" | "high" {
  const condition = normalizedStatus(unit.condition_status);
  if (condition === "out_of_order") return "high";
  if (condition === "dirty" || condition === "inspecting") return "watch";
  if (openTasks.some((task) => isUrgentTask(task))) return "high";
  if (openTasks.length > 0) return "watch";
  return "none";
}

function unitSearchText(row: {
  code: string;
  name?: string | null;
  propertyName: string;
}): string {
  return `${row.code} ${row.name ?? ""} ${row.propertyName}`.toLowerCase();
}

async function fetchPortfolioPropertiesOverviewLegacy(
  query: QueryInput
): Promise<PropertiesOverviewResponse> {
  const orgId = queryValue(query, "org_id");
  if (!orgId) {
    throw new Error("Missing org_id for portfolio properties overview.");
  }

  const [properties, units, leases, tasks, collections] = await Promise.all([
    fetchTableList("/properties", {
      org_id: orgId,
      limit: 500,
      status: query.status,
      property_type: query.property_type,
      neighborhood: query.neighborhood,
    }),
    fetchTableListOrEmpty("/units", { org_id: orgId, limit: 500 }),
    fetchTableListOrEmpty("/leases", { org_id: orgId, limit: 500 }),
    fetchTableListOrEmpty("/tasks", { org_id: orgId, limit: 1000 }),
    fetchTableListOrEmpty("/collections", { org_id: orgId, limit: 700 }),
  ]);

  const relationIndex = buildPropertyRelationIndex(
    units as PropertyRelationRow[],
    leases as PropertyRelationRow[]
  );
  const analyticsRows = buildPropertyPortfolioRows({
    properties: properties as PropertyRecord[],
    units: units as PropertyRelationRow[],
    leases: leases as PropertyRelationRow[],
    tasks: tasks as PropertyRelationRow[],
    collections: collections as PropertyRelationRow[],
    relationIndex,
  });
  const propertyById = new Map(
    properties.map((property) => [asString(property.id), property] as const)
  );

  const queryText = queryValue(query, "q").toLowerCase();
  const statusFilter = queryValue(query, "status").toLowerCase();
  const healthFilter = queryValue(query, "health").toLowerCase();

  const baseRows = analyticsRows
    .map<LegacyPortfolioPropertyRow | null>((row) => {
      const property = propertyById.get(row.id) ?? {};
      const propertyType =
        maybeString(property.property_type) ?? maybeString(row.propertyType);
      const address =
        maybeString(property.address_line1) ??
        maybeString(property.address) ??
        maybeString(row.address);
      const city = maybeString(property.city) ?? maybeString(row.city);
      const mappedRow: LegacyPortfolioPropertyRow = {
        id: row.id,
        name: row.name,
        address,
        status: maybeString(property.status) ?? maybeString(row.status),
        propertyType,
        occupiedUnits: Math.round((row.unitCount * row.occupancyRate) / 100),
        totalUnits: row.unitCount,
        openTasks: row.openTaskCount,
        collectionsRisk: collectionsRiskFromCount(row.overdueCollectionCount),
        health: propertyHealthToUi(row.health),
        primaryHref: `/module/properties/${encodeURIComponent(row.id)}`,
        unitsHref: `/module/units?property_id=${encodeURIComponent(row.id)}`,
        city,
        monthlyRevenue: row.revenueMtdPyg,
        overdueCollectionsCount: row.overdueCollectionCount,
      };

      if (statusFilter && normalizedStatus(mappedRow.status) !== statusFilter) {
        return null;
      }
      if (healthFilter && normalizedStatus(mappedRow.health) !== healthFilter) {
        return null;
      }
      if (queryText) {
        const haystack = `${mappedRow.name} ${address ?? ""} ${city ?? ""} ${
          propertyType ?? ""
        }`.toLowerCase();
        if (!haystack.includes(queryText)) return null;
      }

      return mappedRow;
    })
    .filter((row): row is LegacyPortfolioPropertyRow => Boolean(row))
    .sort((left, right) => left.name.localeCompare(right.name));

  const savedViews = buildPropertySavedViews(baseRows);
  const rows = applyPropertyView(baseRows, queryValue(query, "view"));

  return {
    rows,
    summary: buildPropertiesSummary(rows),
    savedViews,
    pagination: buildPagination(rows.length),
  };
}

async function fetchPortfolioUnitsOverviewLegacy(
  query: QueryInput
): Promise<UnitsOverviewResponse> {
  const orgId = queryValue(query, "org_id");
  if (!orgId) {
    throw new Error("Missing org_id for portfolio units overview.");
  }

  const [units, properties, leases, tasks] = await Promise.all([
    fetchTableList("/units", {
      org_id: orgId,
      limit: 500,
      property_id: query.property_id,
      unit_type: query.unit_type,
      condition_status: query.condition_status,
    }),
    fetchTableListOrEmpty("/properties", { org_id: orgId, limit: 500 }),
    fetchTableListOrEmpty("/leases", { org_id: orgId, limit: 500 }),
    fetchTableListOrEmpty("/tasks", { org_id: orgId, limit: 1000 }),
  ]);

  const propertyById = new Map(
    properties.map((property) => [asString(property.id), property] as const)
  );
  const activeLeasesByUnitId = new Map<string, LegacyRecord[]>();
  for (const lease of leases) {
    if (!isActiveLease(lease)) continue;
    const unitId = asString(lease.unit_id);
    if (!unitId) continue;
    const bucket = activeLeasesByUnitId.get(unitId);
    if (bucket) bucket.push(lease);
    else activeLeasesByUnitId.set(unitId, [lease]);
  }
  const openTasksByUnitId = new Map<string, LegacyRecord[]>();
  for (const task of tasks) {
    if (!isTaskOpen(task)) continue;
    const unitId = asString(task.unit_id);
    if (!unitId) continue;
    const bucket = openTasksByUnitId.get(unitId);
    if (bucket) bucket.push(task);
    else openTasksByUnitId.set(unitId, [task]);
  }

  const queryText = queryValue(query, "q").toLowerCase();
  const statusFilter = queryValue(query, "status").toLowerCase();

  const baseRows = units
    .map<LegacyPortfolioUnitRow | null>((unit) => {
      const id = asString(unit.id);
      if (!id) return null;

      const propertyId = asString(unit.property_id);
      const property = propertyById.get(propertyId) ?? {};
      const propertyName = asString(property.name) || propertyId || "Property";
      const status = resolveUnitStatus(unit);
      if (statusFilter && status !== statusFilter) return null;

      const unitLeases = (activeLeasesByUnitId.get(id) ?? []).sort((left, right) => {
        const leftDate =
          toDate(left.ends_on ?? left.end_date ?? left.created_at) ?? new Date(0);
        const rightDate =
          toDate(right.ends_on ?? right.end_date ?? right.created_at) ?? new Date(0);
        return rightDate.getTime() - leftDate.getTime();
      });
      const primaryLease = unitLeases[0] ?? null;
      const endingSoon = primaryLease ? leaseEndsSoon(primaryLease) : false;
      const leaseState: PortfolioUnitRow["leaseState"] = primaryLease
        ? endingSoon
          ? "ending_soon"
          : "active"
        : "vacant";
      const unitTasks = openTasksByUnitId.get(id) ?? [];
      const mappedRow: LegacyPortfolioUnitRow = {
        id,
        code: asString(unit.code) || id,
        name: maybeString(unit.name),
        propertyId,
        propertyName,
        status,
        unitType: maybeString(unit.unit_type),
        conditionStatus: maybeString(unit.condition_status),
        floorLevel: maybeNumber(unit.floor_level),
        bedrooms: asNumber(unit.bedrooms) ?? 0,
        bathrooms: asNumber(unit.bathrooms) ?? 0,
        rentAmount: primaryLease
          ? rentAmountForLease(primaryLease)
          : rentAmountForUnit(unit),
        currency: primaryLease ? currencyForRecord(primaryLease) : currencyForRecord(unit),
        leaseState,
        maintenanceRisk: maintenanceRiskForUnit(unit, unitTasks),
        primaryHref: `/module/units/${encodeURIComponent(id)}`,
        propertyHref: `/module/properties/${encodeURIComponent(propertyId)}`,
        endingSoon,
        searchText: unitSearchText({
          code: asString(unit.code) || id,
          name: maybeString(unit.name),
          propertyName,
        }),
      };

      if (queryText && !mappedRow.searchText.includes(queryText)) return null;

      return mappedRow;
    })
    .filter((row): row is LegacyPortfolioUnitRow => Boolean(row))
    .sort((left, right) => {
      const propertyCompare = left.propertyName.localeCompare(right.propertyName);
      if (propertyCompare !== 0) return propertyCompare;
      return left.code.localeCompare(right.code);
    });

  const savedViews = buildUnitSavedViews(baseRows);
  const rows = applyUnitView(baseRows, queryValue(query, "view"));

  return {
    rows,
    summary: buildUnitsSummary(rows),
    savedViews,
    facets: {
      properties: buildPropertyFacets(rows),
    },
    bulkUpdate: {
      supportedPatchFields: [...UNIT_BULK_PATCH_FIELDS],
    },
    pagination: buildPagination(rows.length),
  };
}

async function fetchPortfolioPropertyOverviewLegacy(
  propertyId: string
): Promise<PropertyDetailOverviewResponse> {
  const property = await fetchTableRecord(
    `/properties/${encodeURIComponent(propertyId)}`
  );
  const orgId = asString(property.organization_id);

  const [units, tasks, leases, reservations, collections, expenses, ownerStatements] =
    await Promise.all([
      fetchTableListOrEmpty("/units", {
        org_id: orgId,
        property_id: propertyId,
        limit: 500,
      }),
      fetchTableListOrEmpty("/tasks", {
        org_id: orgId,
        property_id: propertyId,
        limit: 500,
      }),
      fetchTableListOrEmpty("/leases", {
        org_id: orgId,
        property_id: propertyId,
        limit: 500,
      }),
      fetchTableListOrEmpty("/reservations", {
        org_id: orgId,
        property_id: propertyId,
        limit: 300,
      }),
      fetchTableListOrEmpty("/collections", { org_id: orgId, limit: 700 }),
      fetchTableListOrEmpty("/expenses", {
        org_id: orgId,
        property_id: propertyId,
        limit: 500,
      }),
      fetchTableListOrEmpty("/owner-statements", {
        org_id: orgId,
        property_id: propertyId,
        limit: 200,
      }),
    ]);

  const hierarchy =
    (await fetchTableRecordOrNull(
      `/properties/${encodeURIComponent(propertyId)}/hierarchy`
    )) ?? buildPropertyHierarchyFallback(units);

  const activeLeases = leases.filter(isActiveLease);
  const activeReservations = reservations.filter(isReservationActive);
  const openTasks = tasks.filter(isTaskOpen);
  const urgentTasks = openTasks.filter(isUrgentTask);
  const activeLeaseByUnitId = new Map<string, LegacyRecord>();
  const leaseIds = new Set<string>();
  for (const lease of activeLeases) {
    const leaseId = asString(lease.id);
    if (leaseId) leaseIds.add(leaseId);
    const unitId = asString(lease.unit_id);
    if (!unitId || activeLeaseByUnitId.has(unitId)) continue;
    activeLeaseByUnitId.set(unitId, lease);
  }
  const openTasksByUnitId = new Map<string, LegacyRecord[]>();
  for (const task of openTasks) {
    const unitId = asString(task.unit_id);
    if (!unitId) continue;
    const bucket = openTasksByUnitId.get(unitId);
    if (bucket) bucket.push(task);
    else openTasksByUnitId.set(unitId, [task]);
  }
  const overdueCollectionsByLeaseId = new Map<string, LegacyRecord[]>();
  const overdueCollections = collections.filter((collection) => {
    const status = normalizedStatus(collection.status);
    if (!COLLECTION_OPEN_STATUSES.has(status)) return false;
    const dueAt = toDate(collection.due_date);
    if (!dueAt || dueAt.getTime() >= Date.now()) return false;
    const leaseId = asString(collection.lease_id);
    return !leaseId || leaseIds.has(leaseId);
  });
  for (const collection of overdueCollections) {
    const leaseId = asString(collection.lease_id);
    if (!leaseId) continue;
    const bucket = overdueCollectionsByLeaseId.get(leaseId);
    if (bucket) bucket.push(collection);
    else overdueCollectionsByLeaseId.set(leaseId, [collection]);
  }

  const occupiedUnits = activeLeaseByUnitId.size;
  const totalUnits = units.length;
  const vacancyCount = Math.max(0, totalUnits - occupiedUnits);
  const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const monthlyRevenue = monthlyRevenueFromCollectionsOrLeases(
    collections,
    leaseIds,
    activeLeases
  );
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = expenses.reduce((total, expense) => {
    if (!asString(expense.expense_date).startsWith(monthPrefix)) return total;
    const amount = asNumber(expense.amount) ?? 0;
    const currency = currencyForRecord(expense);
    const fxRate = asNumber(expense.fx_rate_to_pyg);
    return total + convertAmountToPyg(amount, currency, fxRate);
  }, 0);
  const health: PropertyDetailOverviewResponse["summary"]["health"] =
    totalUnits > 0 && occupiedUnits === 0
      ? "critical"
      : urgentTasks.length > 0 ||
          overdueCollections.length > 0 ||
          (totalUnits > 0 && occupancyRate < 70)
        ? "watch"
        : "good";

  const linkedUnits: PropertyDetailOverviewResponse["linkedUnits"] = units
    .map<PropertyDetailOverviewResponse["linkedUnits"][number] | null>((unit) => {
      const id = asString(unit.id);
      if (!id) return null;
      const activeLease = activeLeaseByUnitId.get(id) ?? null;
      const unitTasks = openTasksByUnitId.get(id) ?? [];
      const maintenanceRisk = maintenanceRiskForUnit(unit, unitTasks);
      const overdueCount = activeLease
        ? (overdueCollectionsByLeaseId.get(asString(activeLease.id)) ?? []).length
        : 0;
      const leaseState: "occupied" | "vacant" = activeLease
        ? "occupied"
        : "vacant";
      return {
        id,
        code: asString(unit.code) || id,
        name: maybeString(unit.name),
        conditionStatus: maybeString(unit.condition_status),
        floorLevel: maybeNumber(unit.floor_level),
        leaseState,
        maintenanceRisk,
        openTasks: unitTasks.length,
        overdueCollections: overdueCount,
        href: `/module/units/${encodeURIComponent(id)}`,
      };
    })
    .filter(
      (
        unit
      ): unit is PropertyDetailOverviewResponse["linkedUnits"][number] =>
        unit !== null
    )
    .sort((left, right) => left.code.localeCompare(right.code));

  return {
    property,
    summary: {
      totalUnits,
      occupiedUnits,
      vacantUnits: vacancyCount,
      occupancyRate,
      openTasks: openTasks.length,
      urgentTasks: urgentTasks.length,
      activeLeases: activeLeases.length,
      activeReservations: activeReservations.length,
      overdueCollections: overdueCollections.length,
      monthlyRevenue,
      monthlyExpenses,
      health,
    },
    hierarchy,
    linkedUnits,
    recentActivity: buildRecentPropertyActivity({
      tasks: openTasks.slice(0, 4),
      reservations: activeReservations.slice(0, 3),
      ownerStatements: ownerStatements.slice(0, 2),
      collections: overdueCollections.slice(0, 2),
      leaseIds,
    }),
  };
}

async function fetchPortfolioUnitOverviewLegacy(
  unitId: string
): Promise<UnitDetailOverviewResponse> {
  const unit = await fetchTableRecord(`/units/${encodeURIComponent(unitId)}`);
  const propertyId = asString(unit.property_id);
  const orgId = asString(unit.organization_id);

  const [parentProperty, propertyUnits, propertyLeases, propertyTasks, propertyReservations, collections] =
    await Promise.all([
      fetchTableRecordOrNull(`/properties/${encodeURIComponent(propertyId)}`),
      fetchTableListOrEmpty("/units", {
        org_id: orgId,
        property_id: propertyId,
        limit: 500,
      }),
      fetchTableListOrEmpty("/leases", {
        org_id: orgId,
        property_id: propertyId,
        limit: 500,
      }),
      fetchTableListOrEmpty("/tasks", {
        org_id: orgId,
        property_id: propertyId,
        limit: 500,
      }),
      fetchTableListOrEmpty("/reservations", {
        org_id: orgId,
        property_id: propertyId,
        limit: 300,
      }),
      fetchTableListOrEmpty("/collections", { org_id: orgId, limit: 700 }),
    ]);

  const activeLeases = propertyLeases.filter(isActiveLease);
  const activeLeaseByUnitId = new Map<string, LegacyRecord>();
  const leaseIds = new Set<string>();
  for (const lease of activeLeases) {
    const leaseId = asString(lease.id);
    if (leaseId) leaseIds.add(leaseId);
    const relatedUnitId = asString(lease.unit_id);
    if (!relatedUnitId || activeLeaseByUnitId.has(relatedUnitId)) continue;
    activeLeaseByUnitId.set(relatedUnitId, lease);
  }

  const openTasks = propertyTasks.filter(isTaskOpen);
  const openTasksByUnitId = new Map<string, LegacyRecord[]>();
  for (const task of openTasks) {
    const relatedUnitId = asString(task.unit_id);
    if (!relatedUnitId) continue;
    const bucket = openTasksByUnitId.get(relatedUnitId);
    if (bucket) bucket.push(task);
    else openTasksByUnitId.set(relatedUnitId, [task]);
  }

  const unitOpenTasks = openTasksByUnitId.get(unitId) ?? [];
  const activeLease = activeLeaseByUnitId.get(unitId) ?? null;
  const overdueCollections = collections.filter((collection) => {
    const leaseId = asString(collection.lease_id);
    if (leaseId && activeLease && leaseId !== asString(activeLease.id)) return false;
    if (leaseId && !activeLease) return false;
    const dueAt = toDate(collection.due_date);
    return (
      COLLECTION_OPEN_STATUSES.has(normalizedStatus(collection.status)) &&
      dueAt !== null &&
      dueAt.getTime() < Date.now()
    );
  });

  const occupiedUnits = propertyUnits.filter((item) =>
    activeLeaseByUnitId.has(asString(item.id))
  ).length;
  const parentName =
    asString(parentProperty?.name) || asString(unit.property_name) || "Property";
  const parentHref = propertyId
    ? `/module/properties/${encodeURIComponent(propertyId)}`
    : "/module/properties";
  const parentUnitsHref = propertyId
    ? `/module/units?property_id=${encodeURIComponent(propertyId)}`
    : "/module/units";

  const upcomingReservations = propertyReservations
    .filter((reservation) => asString(reservation.unit_id) === unitId)
    .filter(isReservationUpcoming)
    .sort((left, right) => {
      const leftDate =
        toDate(left.check_in_date ?? left.check_in_at ?? left.arrival_date) ??
        new Date(8_640_000_000_000_000);
      const rightDate =
        toDate(right.check_in_date ?? right.check_in_at ?? right.arrival_date) ??
        new Date(8_640_000_000_000_000);
      return leftDate.getTime() - rightDate.getTime();
    })
    .slice(0, 5)
    .map((reservation) => ({
      id: asString(reservation.id),
      status: asString(reservation.status) || "pending",
      checkInDate:
        maybeString(reservation.check_in_date) ??
        maybeString(reservation.check_in_at) ??
        maybeString(reservation.arrival_date),
      checkOutDate:
        maybeString(reservation.check_out_date) ??
        maybeString(reservation.check_out_at) ??
        maybeString(reservation.departure_date),
      totalAmount:
        asNumber(
          reservation.total_amount ??
            reservation.grand_total ??
            reservation.amount
        ) ?? 0,
      currency: currencyForRecord(reservation),
      href: `/module/reservations/${encodeURIComponent(asString(reservation.id))}`,
    }));

  const siblings: UnitDetailOverviewResponse["siblings"] = propertyUnits
    .filter((item) => asString(item.id) && asString(item.id) !== unitId)
    .map((item) => {
      const siblingId = asString(item.id);
      const siblingLease = activeLeaseByUnitId.get(siblingId) ?? null;
      const leaseState: UnitDetailOverviewResponse["siblings"][number]["leaseState"] =
        siblingLease
          ? leaseEndsSoon(siblingLease)
            ? "ending_soon"
            : "active"
          : "vacant";
      return {
        id: siblingId,
        code: asString(item.code) || siblingId,
        name: maybeString(item.name),
        leaseState,
        conditionStatus: maybeString(item.condition_status),
        primaryHref: `/module/units/${encodeURIComponent(siblingId)}`,
      };
    })
    .sort((left, right) => left.code.localeCompare(right.code));

  return {
    unit,
    summary: {
      leaseState: activeLease ? "active" : "vacant",
      maintenanceRisk: maintenanceRiskForUnit(unit, unitOpenTasks),
      openTasks: unitOpenTasks.length,
      overdueCollections: overdueCollections.length,
    },
    parentProperty: {
      id: propertyId,
      name: parentName,
      address:
        maybeString(parentProperty?.address_line1) ??
        maybeString(parentProperty?.address),
      status: maybeString(parentProperty?.status),
      totalUnits: propertyUnits.length,
      occupiedUnits,
      href: parentHref,
      unitsHref: parentUnitsHref,
    },
    siblings,
    activeLease: activeLease
      ? {
          id: asString(activeLease.id),
          tenantName:
            asString(activeLease.tenant_full_name) ||
            asString(activeLease.tenant_name) ||
            asString(activeLease.resident_name) ||
            asString(activeLease.id) ||
            "Tenant",
          monthlyRent: rentAmountForLease(activeLease),
          currency: currencyForRecord(activeLease),
          endsOn:
            maybeString(activeLease.ends_on) ??
            maybeString(activeLease.end_date),
          href: `/module/leases/${encodeURIComponent(asString(activeLease.id))}`,
        }
      : null,
    upcomingReservations,
    openTasks: unitOpenTasks
      .slice()
      .sort((left, right) => {
        const leftDate = toDate(left.due_at ?? left.created_at) ?? new Date(0);
        const rightDate = toDate(right.due_at ?? right.created_at) ?? new Date(0);
        return rightDate.getTime() - leftDate.getTime();
      })
      .slice(0, 8)
      .map((task) => ({
        id: asString(task.id),
        title: maybeString(task.title) ?? maybeString(task.kind) ?? "Task",
        status: maybeString(task.status),
        priority: maybeString(task.priority),
        href: `/module/tasks/${encodeURIComponent(asString(task.id))}`,
      })),
  };
}

export async function fetchPortfolioPropertiesOverview(
  query: QueryInput
): Promise<PropertiesOverviewResponse> {
  try {
    return await fetchJson<PropertiesOverviewResponse>(
      "/portfolio/properties/overview",
      query
    );
  } catch (err) {
    if (!isMissingOverviewRoute(err, "/portfolio/properties/overview")) {
      throw err;
    }
    return fetchPortfolioPropertiesOverviewLegacy(query);
  }
}

export async function fetchPortfolioUnitsOverview(
  query: QueryInput
): Promise<UnitsOverviewResponse> {
  try {
    return await fetchJson<UnitsOverviewResponse>("/portfolio/units/overview", query);
  } catch (err) {
    if (!isMissingOverviewRoute(err, "/portfolio/units/overview")) {
      throw err;
    }
    return fetchPortfolioUnitsOverviewLegacy(query);
  }
}

export async function fetchPortfolioPropertyOverview(
  propertyId: string
): Promise<PropertyDetailOverviewResponse> {
  const path = `/portfolio/properties/${encodeURIComponent(propertyId)}/overview`;
  try {
    return await fetchJson<PropertyDetailOverviewResponse>(path);
  } catch (err) {
    if (!isMissingOverviewRoute(err, path)) {
      throw err;
    }
    return fetchPortfolioPropertyOverviewLegacy(propertyId);
  }
}

export async function fetchPortfolioUnitOverview(
  unitId: string
): Promise<UnitDetailOverviewResponse> {
  const path = `/portfolio/units/${encodeURIComponent(unitId)}/overview`;
  try {
    return await fetchJson<UnitDetailOverviewResponse>(path);
  } catch (err) {
    if (!isMissingOverviewRoute(err, path)) {
      throw err;
    }
    return fetchPortfolioUnitOverviewLegacy(unitId);
  }
}
