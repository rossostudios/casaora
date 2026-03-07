import { fetchJson, fetchList } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

type LegacyRecord = Record<string, unknown>;

export type LeaseCollectionState = "current" | "watch" | "overdue";

export type LeasesOverviewFilters = {
  org_id: string;
  q?: string;
  lease_status?: string;
  renewal_status?: string;
  property_id?: string;
  unit_id?: string;
  view?: string;
  sort?: string;
  limit?: number;
  offset?: number;
};

export type LeasesOverviewRow = {
  id: string;
  tenantName: string;
  tenantEmail: string | null;
  tenantPhoneE164: string | null;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string | null;
  unitName: string | null;
  spaceId: string | null;
  spaceName: string | null;
  bedId: string | null;
  bedCode: string | null;
  leaseStatus: string;
  leaseStatusLabel: string;
  renewalStatus: string | null;
  startsOn: string;
  endsOn: string | null;
  currency: string;
  monthlyRecurringTotal: number;
  collectionState: LeaseCollectionState;
  overdueCount: number;
  unpaidAmount: number;
  documentsCount: number;
  primaryHref: string;
};

export type LeasesOverviewResponse = {
  summary: {
    active: number;
    expiring60d: number;
    delinquent: number;
    monthlyRecurringDue: number;
  };
  viewCounts: Record<string, number>;
  rows: LeasesOverviewRow[];
};

export type LeaseDetailOverview = {
  lease: LeasesOverviewRow & {
    notes: string | null;
    monthlyRent: number;
    serviceFeeFlat: number;
    securityDeposit: number;
    guaranteeOptionFee: number;
    taxIva: number;
    platformFee: number;
    totalMoveIn: number;
  };
  occupancy: {
    propertyId: string | null;
    propertyName: string | null;
    unitId: string | null;
    unitName: string | null;
    spaceId: string | null;
    spaceName: string | null;
    bedId: string | null;
    bedCode: string | null;
  };
  collections: {
    state: LeaseCollectionState;
    paidCount: number;
    openCount: number;
    overdueCount: number;
    unpaidAmount: number;
    recent: Array<Record<string, unknown>>;
    href: string;
  };
  documents: {
    total: number;
    items: Array<Record<string, unknown>>;
  };
  renewal: {
    status: string | null;
    canOffer: boolean;
    canAccept: boolean;
    offeredRent: number | null;
    parentLeaseId: string | null;
    childLeaseId: string | null;
  };
  related: {
    applicationId: string | null;
    propertyHref: string | null;
    unitHref: string | null;
    collectionsHref: string;
  };
};

type LegacyListResponse = {
  data?: LegacyRecord[];
};

function isMissingOverviewRoute(error: unknown, path: string): boolean {
  const message = errorMessage(error).toLowerCase();
  return message.includes("(404)") && message.includes(path.toLowerCase());
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

function asNullableNumber(value: unknown): number | null {
  const parsed = asNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusLabel(value: string): string {
  switch (value) {
    case "draft":
      return "Draft";
    case "active":
      return "Active";
    case "delinquent":
      return "Delinquent";
    case "terminated":
      return "Terminated";
    case "completed":
      return "Completed";
    default:
      return value.replaceAll("_", " ") || "Unknown";
  }
}

function collectionStateForLegacy(row: LegacyRecord): LeaseCollectionState {
  const explicit = asString(row.collection_state);
  if (
    explicit === "current" ||
    explicit === "watch" ||
    explicit === "overdue"
  ) {
    return explicit;
  }
  if (asString(row.lease_status) === "delinquent") return "overdue";
  if (asNumber(row.overdue_count) > 0) return "overdue";
  if (
    asNumber(row.unpaid_amount) > 0 ||
    asNumber(row.collection_open_count) > 0
  ) {
    return "watch";
  }
  return "current";
}

function mapLegacyRow(row: LegacyRecord): LeasesOverviewRow {
  const id = asString(row.id);
  const collectionState = collectionStateForLegacy(row);
  return {
    id,
    tenantName: asString(row.tenant_full_name) || "Lease",
    tenantEmail: asString(row.tenant_email) || null,
    tenantPhoneE164: asString(row.tenant_phone_e164) || null,
    propertyId: asString(row.property_id) || null,
    propertyName: asString(row.property_name) || null,
    unitId: asString(row.unit_id) || null,
    unitName: asString(row.unit_name) || null,
    spaceId: asString(row.space_id) || null,
    spaceName: asString(row.space_name) || null,
    bedId: asString(row.bed_id) || null,
    bedCode: asString(row.bed_code) || null,
    leaseStatus: asString(row.lease_status) || "draft",
    leaseStatusLabel: statusLabel(asString(row.lease_status)),
    renewalStatus: asString(row.renewal_status) || null,
    startsOn: asString(row.starts_on),
    endsOn: asString(row.ends_on) || null,
    currency: asString(row.currency) || "PYG",
    monthlyRecurringTotal:
      asNumber(row.monthly_recurring_total) ||
      asNumber(row.monthly_rent) + asNumber(row.tax_iva),
    collectionState,
    overdueCount: asNumber(row.overdue_count),
    unpaidAmount:
      asNumber(row.unpaid_amount) ||
      Math.max(
        0,
        asNumber(row.collection_amount_total) -
          asNumber(row.collection_amount_paid),
      ),
    documentsCount: asNumber(row.documents_count),
    primaryHref: `/module/leases/${encodeURIComponent(id)}`,
  };
}

function isExpiringSoon(row: LeasesOverviewRow): boolean {
  if (!["active", "delinquent"].includes(row.leaseStatus)) return false;
  if (!row.endsOn) return false;
  const end = new Date(`${row.endsOn}T00:00:00`);
  if (Number.isNaN(end.valueOf())) return false;
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).valueOf();
  const diffDays = Math.round((end.valueOf() - today) / 86_400_000);
  return diffDays >= 0 && diffDays <= 60;
}

function matchesOverviewFilters(
  row: LeasesOverviewRow,
  filters: LeasesOverviewFilters,
): boolean {
  const q = asString(filters.q).toLowerCase();
  if (q) {
    const haystack = [
      row.tenantName,
      row.tenantEmail,
      row.propertyName,
      row.unitName,
      row.spaceName,
      row.bedCode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.lease_status && row.leaseStatus !== filters.lease_status)
    return false;
  if (filters.renewal_status && row.renewalStatus !== filters.renewal_status)
    return false;
  if (filters.property_id && row.propertyId !== filters.property_id)
    return false;
  if (filters.unit_id && row.unitId !== filters.unit_id) return false;
  return true;
}

function matchesView(
  row: LeasesOverviewRow,
  view: string | undefined,
): boolean {
  switch (view) {
    case "drafts":
      return row.leaseStatus === "draft";
    case "expiring_60d":
      return isExpiringSoon(row);
    case "delinquent":
      return row.collectionState === "overdue";
    case "renewal_offered":
      return row.renewalStatus === "offered";
    default:
      return true;
  }
}

function sortRows(
  rows: LeasesOverviewRow[],
  sort: string | undefined,
): LeasesOverviewRow[] {
  const copy = [...rows];
  switch (sort) {
    case "tenant_asc":
      copy.sort((left, right) =>
        left.tenantName.localeCompare(right.tenantName),
      );
      return copy;
    case "rent_desc":
      copy.sort(
        (left, right) =>
          right.monthlyRecurringTotal - left.monthlyRecurringTotal,
      );
      return copy;
    case "updated_desc":
      return copy;
    default:
      copy.sort((left, right) => {
        const leftEnd = left.endsOn ?? "9999-12-31";
        const rightEnd = right.endsOn ?? "9999-12-31";
        return leftEnd.localeCompare(rightEnd);
      });
      return copy;
  }
}

async function fetchOverviewFallback(
  filters: LeasesOverviewFilters,
): Promise<LeasesOverviewResponse> {
  const legacy = await fetchJson<LegacyListResponse>("/leases", {
    org_id: filters.org_id,
    lease_status: filters.lease_status,
    property_id: filters.property_id,
    unit_id: filters.unit_id,
    limit: 500,
  });

  const baseRows = (legacy.data ?? [])
    .map(mapLegacyRow)
    .filter((row) => matchesOverviewFilters(row, filters));
  const visibleRows = sortRows(
    baseRows.filter((row) => matchesView(row, filters.view)),
    filters.sort,
  );
  const offset = Math.max(filters.offset ?? 0, 0);
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 100);

  return {
    summary: {
      active: baseRows.filter((row) =>
        ["active", "delinquent"].includes(row.leaseStatus),
      ).length,
      expiring60d: baseRows.filter(isExpiringSoon).length,
      delinquent: baseRows.filter((row) => row.collectionState === "overdue")
        .length,
      monthlyRecurringDue: baseRows
        .filter((row) => ["active", "delinquent"].includes(row.leaseStatus))
        .reduce((sum, row) => sum + row.monthlyRecurringTotal, 0),
    },
    viewCounts: {
      all: baseRows.length,
      drafts: baseRows.filter((row) => row.leaseStatus === "draft").length,
      expiring_60d: baseRows.filter(isExpiringSoon).length,
      delinquent: baseRows.filter((row) => row.collectionState === "overdue")
        .length,
      renewal_offered: baseRows.filter((row) => row.renewalStatus === "offered")
        .length,
    },
    rows: visibleRows.slice(offset, offset + limit),
  };
}

function mapRecentCollections(
  collections: LegacyRecord[] | undefined,
): Array<Record<string, unknown>> {
  return (collections ?? []).slice(0, 5).map((collection) => ({
    id: asString(collection.id),
    dueDate: asString(collection.due_date) || null,
    status: asString(collection.status) || null,
    amount: asNumber(collection.amount),
    currency: asString(collection.currency) || null,
    paidAt: asString(collection.paid_at) || null,
  }));
}

function deriveCollections(lease: LegacyRecord): {
  state: LeaseCollectionState;
  paidCount: number;
  openCount: number;
  overdueCount: number;
  unpaidAmount: number;
} {
  const collections = Array.isArray(lease.collections)
    ? (lease.collections as LegacyRecord[])
    : [];
  const paidCount = collections.filter(
    (item) => asString(item.status) === "paid",
  ).length;
  const open = collections.filter((item) =>
    ["scheduled", "pending", "late"].includes(asString(item.status)),
  );
  const overdueCount = open.filter((item) => {
    const due = asString(item.due_date);
    return Boolean(due) && due < new Date().toISOString().slice(0, 10);
  }).length;
  const unpaidAmount = open.reduce(
    (sum, item) => sum + asNumber(item.amount),
    0,
  );
  const state =
    asString(lease.lease_status) === "delinquent" || overdueCount > 0
      ? "overdue"
      : open.length > 0 || unpaidAmount > 0
        ? "watch"
        : "current";

  return {
    state,
    paidCount,
    openCount: open.length,
    overdueCount,
    unpaidAmount,
  };
}

async function fetchDetailFallback(
  leaseId: string,
  orgId: string,
): Promise<LeaseDetailOverview> {
  const [lease, documents] = await Promise.all([
    fetchJson<LegacyRecord>(`/leases/${encodeURIComponent(leaseId)}`),
    fetchList("/documents", orgId, 100, {
      entity_type: "lease",
      entity_id: leaseId,
    }).catch(() => [] as unknown[]),
  ]);

  const overviewRow = mapLegacyRow(lease);
  const collections = deriveCollections(lease);
  const documentItems = (documents as LegacyRecord[]).map((item) => ({
    id: asString(item.id),
    file_name: asString(item.file_name),
    file_url: asString(item.file_url),
    mime_type: asString(item.mime_type) || null,
    category: asString(item.category) || "other",
    created_at: asString(item.created_at) || null,
  }));

  return {
    lease: {
      ...overviewRow,
      collectionState: collections.state,
      overdueCount: collections.overdueCount,
      unpaidAmount: collections.unpaidAmount,
      documentsCount: documentItems.length,
      notes: asString(lease.notes) || null,
      monthlyRent: asNumber(lease.monthly_rent),
      serviceFeeFlat: asNumber(lease.service_fee_flat),
      securityDeposit: asNumber(lease.security_deposit),
      guaranteeOptionFee: asNumber(lease.guarantee_option_fee),
      taxIva: asNumber(lease.tax_iva),
      platformFee: asNumber(lease.platform_fee),
      totalMoveIn:
        asNumber(lease.total_move_in) ||
        asNumber(lease.monthly_rent) +
          asNumber(lease.service_fee_flat) +
          asNumber(lease.security_deposit) +
          asNumber(lease.guarantee_option_fee) +
          asNumber(lease.tax_iva),
    },
    occupancy: {
      propertyId: overviewRow.propertyId,
      propertyName: overviewRow.propertyName,
      unitId: overviewRow.unitId,
      unitName: overviewRow.unitName,
      spaceId: overviewRow.spaceId,
      spaceName: overviewRow.spaceName,
      bedId: overviewRow.bedId,
      bedCode: overviewRow.bedCode,
    },
    collections: {
      ...collections,
      recent: mapRecentCollections(
        lease.collections as LegacyRecord[] | undefined,
      ),
      href: `/module/collections?lease_id=${encodeURIComponent(leaseId)}`,
    },
    documents: {
      total: documentItems.length,
      items: documentItems,
    },
    renewal: {
      status: asString(lease.renewal_status) || null,
      canOffer: !["offered", "accepted"].includes(
        asString(lease.renewal_status),
      ),
      canAccept: ["offered", "pending"].includes(
        asString(lease.renewal_status),
      ),
      offeredRent: asNullableNumber(lease.renewal_offered_rent),
      parentLeaseId: asString(lease.parent_lease_id) || null,
      childLeaseId: asString(lease.child_lease_id) || null,
    },
    related: {
      applicationId: asString(lease.application_id) || null,
      propertyHref: overviewRow.propertyId
        ? `/module/properties/${encodeURIComponent(overviewRow.propertyId)}`
        : null,
      unitHref: overviewRow.unitId
        ? `/module/units/${encodeURIComponent(overviewRow.unitId)}`
        : null,
      collectionsHref: `/module/collections?lease_id=${encodeURIComponent(leaseId)}`,
    },
  };
}

export async function fetchLeasesOverview(
  filters: LeasesOverviewFilters,
): Promise<LeasesOverviewResponse> {
  try {
    return await fetchJson<LeasesOverviewResponse>("/leases/overview", filters);
  } catch (error) {
    if (!isMissingOverviewRoute(error, "/leases/overview")) {
      throw error;
    }
    return fetchOverviewFallback(filters);
  }
}

export async function fetchLeaseDetailOverview(
  leaseId: string,
  orgId: string,
): Promise<LeaseDetailOverview> {
  try {
    return await fetchJson<LeaseDetailOverview>(
      `/leases/${encodeURIComponent(leaseId)}/overview`,
      { org_id: orgId },
    );
  } catch (error) {
    if (
      !isMissingOverviewRoute(
        error,
        `/leases/${encodeURIComponent(leaseId)}/overview`,
      )
    ) {
      throw error;
    }
    return fetchDetailFallback(leaseId, orgId);
  }
}
