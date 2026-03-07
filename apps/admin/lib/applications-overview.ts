import { fetchJson, fetchList } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

type QueryInput = Record<string, string | number | boolean | undefined | null>;
type LegacyRecord = Record<string, unknown>;

export type ApplicationsOverviewFilters = {
  org_id: string;
  q?: string;
  status?: string;
  assigned_user_id?: string;
  listing_id?: string;
  property_id?: string;
  qualification_band?: string;
  response_sla_status?: string;
  source?: string;
  view?: string;
  sort?: string;
  limit?: number;
  offset?: number;
};

export type ApplicationsOverviewRow = {
  id: string;
  applicantName: string;
  email: string;
  phoneE164: string | null;
  status: string;
  statusLabel: string;
  listingId: string | null;
  listingTitle: string | null;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string | null;
  unitName: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  qualificationScore: number;
  qualificationBand: "strong" | "moderate" | "watch";
  responseSlaStatus: "pending" | "met" | "breached";
  responseSlaAlertLevel: "none" | "normal" | "warning" | "critical";
  firstResponseMinutes: number;
  lastTouchAt: string | null;
  source: string;
  primaryHref: string;
};

export type ApplicationsOverviewResponse = {
  summary: {
    totalApplications: number;
    needsResponse: number;
    unassigned: number;
    qualifiedReady: number;
    stalledOrFailed: number;
  };
  savedViews: Array<{ id: string; count: number }>;
  rows: ApplicationsOverviewRow[];
  facets: {
    listings: Array<{ id: string; name: string; count: number }>;
    properties: Array<{ id: string; name: string; count: number }>;
    sources: Array<{ value: string; count: number }>;
  };
  intakeHealth: {
    failedSubmissions: number;
    stalledApplications: number;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export type ApplicationOverviewResponse = {
  application: ApplicationsOverviewRow & {
    createdAt: string;
    monthlyIncome: number | null;
    guaranteeChoice: string | null;
    documentNumber: string | null;
    message: string | null;
    predictiveScore: number | null;
    riskFactors: Array<{ factor: string; severity: string; detail: string }>;
  };
  qualification: {
    score: number;
    band: "strong" | "moderate" | "watch";
    incomeToRentRatio: number | null;
    reasons: string[];
  };
  context: {
    listingId: string | null;
    listingTitle: string | null;
    propertyId: string | null;
    propertyName: string | null;
    unitId: string | null;
    unitName: string | null;
  };
  timeline: Array<{
    id: string;
    kind: "application_event" | "message" | "conversion";
    title: string;
    subtitle: string;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    channel: string;
    direction: "inbound" | "outbound";
    status: string;
    subject: string | null;
    bodyPreview: string;
    createdAt: string;
  }>;
  conversion: {
    canConvert: boolean;
    relatedLeaseId: string | null;
  };
  failedSubmissionHistory?: Array<{
    id: string;
    createdAt: string;
    detail: string;
  }>;
};

type ApplicationContext = {
  listingId: string | null;
  listingTitle: string | null;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string | null;
  unitName: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  screening: "Screening",
  qualified: "Qualified",
  visit_scheduled: "Visit scheduled",
  offer_sent: "Offer sent",
  contract_signed: "Contract signed",
  rejected: "Rejected",
  lost: "Lost",
};

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

function asNullableNumber(value: unknown): number | null {
  const parsed = asNumber(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeStatus(value: unknown): string {
  return asString(value).toLowerCase().replaceAll(" ", "_");
}

function statusLabel(value: unknown): string {
  const normalized = normalizeStatus(value);
  return STATUS_LABELS[normalized] ?? (normalized.replaceAll("_", " ") || "Unknown");
}

function asRiskFactors(
  value: unknown
): Array<{ factor: string; severity: string; detail: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        factor: asString(row.factor),
        severity: asString(row.severity) || "info",
        detail: asString(row.detail),
      };
    })
    .filter(
      (
        item
      ): item is {
        factor: string;
        severity: string;
        detail: string;
      } => Boolean(item?.factor)
    );
}

function responseSlaStatus(
  application: LegacyRecord
): "pending" | "met" | "breached" {
  const value = normalizeStatus(application.response_sla_status);
  if (value === "met" || value === "breached") return value;
  return "pending";
}

function responseSlaAlertLevel(
  application: LegacyRecord
): "none" | "normal" | "warning" | "critical" {
  const value = normalizeStatus(application.response_sla_alert_level);
  if (
    value === "none" ||
    value === "normal" ||
    value === "warning" ||
    value === "critical"
  ) {
    return value;
  }
  return "normal";
}

function qualificationBand(
  application: LegacyRecord
): "strong" | "moderate" | "watch" {
  const value = normalizeStatus(application.qualification_band);
  if (value === "strong" || value === "moderate") return value;
  return "watch";
}

function canConvert(status: string, hasLease: boolean): boolean {
  if (hasLease) return false;
  return ["qualified", "visit_scheduled", "offer_sent"].includes(
    normalizeStatus(status)
  );
}

function isStalled(application: LegacyRecord): boolean {
  if (asString(application.first_response_at)) return false;
  if (!["new", "screening"].includes(normalizeStatus(application.status))) {
    return false;
  }
  const createdAt = asString(application.created_at);
  if (!createdAt) return false;
  const created = new Date(createdAt);
  if (Number.isNaN(created.valueOf())) return false;
  return Date.now() - created.valueOf() >= 48 * 60 * 60 * 1000;
}

function maxTimestamp(...values: Array<string | null | undefined>): string | null {
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) continue;
    const parsed = new Date(text);
    const ms = parsed.valueOf();
    if (Number.isNaN(ms)) continue;
    if (ms > latestMs) {
      latest = text;
      latestMs = ms;
    }
  }
  return latest;
}

function byCreatedDesc(left: { createdAt: string }, right: { createdAt: string }) {
  return right.createdAt.localeCompare(left.createdAt);
}

function buildApplicationContext(
  application: LegacyRecord,
  listingById: Map<string, LegacyRecord>,
  propertyById: Map<string, LegacyRecord>,
  unitById: Map<string, LegacyRecord>
): ApplicationContext {
  const listingId = asString(application.listing_id) || null;
  const listing = listingId ? listingById.get(listingId) : undefined;
  const propertyId =
    (listing ? asString(listing.property_id) : "") || null;
  const property = propertyId ? propertyById.get(propertyId) : undefined;
  const unitId = (listing ? asString(listing.unit_id) : "") || null;
  const unit = unitId ? unitById.get(unitId) : undefined;

  return {
    listingId,
    listingTitle:
      (listing ? asString(listing.title) : "") ||
      asString(application.listing_title) ||
      null,
    propertyId,
    propertyName: property ? asString(property.name) || null : null,
    unitId,
    unitName:
      (unit ? asString(unit.name) : "") || (unit ? asString(unit.code) : "") || null,
  };
}

function matchesFilters(
  application: LegacyRecord,
  context: ApplicationContext,
  filters: ApplicationsOverviewFilters
): boolean {
  if (filters.property_id && context.propertyId !== filters.property_id) return false;
  if (
    filters.qualification_band &&
    qualificationBand(application) !== filters.qualification_band
  ) {
    return false;
  }
  if (
    filters.response_sla_status &&
    responseSlaStatus(application) !== filters.response_sla_status
  ) {
    return false;
  }
  if (filters.source && normalizeStatus(application.source) !== filters.source) {
    return false;
  }
  if (filters.assigned_user_id) {
    const assigned = asString(application.assigned_user_id);
    if (
      filters.assigned_user_id === "__unassigned__" ||
      filters.assigned_user_id === "unassigned"
    ) {
      if (assigned) return false;
    } else if (assigned !== filters.assigned_user_id) {
      return false;
    }
  }
  const q = asString(filters.q).toLowerCase();
  if (q) {
    const haystack = [
      asString(application.full_name),
      asString(application.email),
      asString(application.phone_e164),
      context.listingTitle ?? "",
      context.propertyName ?? "",
      context.unitName ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

function matchesView(
  application: LegacyRecord,
  view: string | undefined,
  hasLease: boolean
): boolean {
  switch (view) {
    case "needs_response":
      return responseSlaStatus(application) !== "met";
    case "unassigned":
      return !asString(application.assigned_user_id);
    case "qualified_ready":
      return canConvert(asString(application.status), hasLease);
    case "stalled_or_failed":
      return isStalled(application) || ["rejected", "lost"].includes(normalizeStatus(application.status));
    default:
      return true;
  }
}

function buildRow(args: {
  application: LegacyRecord;
  context: ApplicationContext;
  relatedLeaseId: string | null;
  lastTouchAt: string | null;
}): ApplicationsOverviewRow {
  const { application, context, relatedLeaseId, lastTouchAt } = args;
  return {
    id: asString(application.id),
    applicantName: asString(application.full_name),
    email: asString(application.email),
    phoneE164: asString(application.phone_e164) || null,
    status: normalizeStatus(application.status),
    statusLabel: statusLabel(application.status),
    listingId: context.listingId,
    listingTitle: context.listingTitle,
    propertyId: context.propertyId,
    propertyName: context.propertyName,
    unitId: context.unitId,
    unitName: context.unitName,
    assignedUserId: asString(application.assigned_user_id) || null,
    assignedUserName: asString(application.assigned_user_name) || null,
    qualificationScore: Math.round(asNumber(application.qualification_score)),
    qualificationBand: qualificationBand(application),
    responseSlaStatus: responseSlaStatus(application),
    responseSlaAlertLevel: responseSlaAlertLevel(application),
    firstResponseMinutes: asNumber(application.first_response_minutes),
    lastTouchAt,
    source: asString(application.source) || "marketplace",
    primaryHref: relatedLeaseId
      ? `/module/applications/${encodeURIComponent(asString(application.id))}?lease_id=${encodeURIComponent(relatedLeaseId)}`
      : `/module/applications/${encodeURIComponent(asString(application.id))}`,
  };
}

function buildSavedViews(
  applications: LegacyRecord[],
  leaseIdsByApplicationId: Map<string, string>
) {
  return [
    "all",
    "needs_response",
    "unassigned",
    "qualified_ready",
    "stalled_or_failed",
  ].map((id) => ({
    id,
    count:
      id === "all"
        ? applications.length
        : applications.filter((application) =>
            matchesView(
              application,
              id,
              leaseIdsByApplicationId.has(asString(application.id))
            )
          ).length,
  }));
}

function buildSummary(
  applications: LegacyRecord[],
  leaseIdsByApplicationId: Map<string, string>
): ApplicationsOverviewResponse["summary"] {
  return {
    totalApplications: applications.length,
    needsResponse: applications.filter(
      (application) => responseSlaStatus(application) !== "met"
    ).length,
    unassigned: applications.filter(
      (application) => !asString(application.assigned_user_id)
    ).length,
    qualifiedReady: applications.filter((application) =>
      canConvert(
        asString(application.status),
        leaseIdsByApplicationId.has(asString(application.id))
      )
    ).length,
    stalledOrFailed: applications.filter(
      (application) =>
        isStalled(application) ||
        ["rejected", "lost"].includes(normalizeStatus(application.status))
    ).length,
  };
}

function buildFacets(
  rows: Array<{ application: LegacyRecord; context: ApplicationContext }>
): ApplicationsOverviewResponse["facets"] {
  const listingMap = new Map<string, { id: string; name: string; count: number }>();
  const propertyMap = new Map<string, { id: string; name: string; count: number }>();
  const sourceMap = new Map<string, number>();

  for (const row of rows) {
    if (row.context.listingId && row.context.listingTitle) {
      const current =
        listingMap.get(row.context.listingId) ??
        { id: row.context.listingId, name: row.context.listingTitle, count: 0 };
      current.count += 1;
      listingMap.set(current.id, current);
    }
    if (row.context.propertyId && row.context.propertyName) {
      const current =
        propertyMap.get(row.context.propertyId) ??
        { id: row.context.propertyId, name: row.context.propertyName, count: 0 };
      current.count += 1;
      propertyMap.set(current.id, current);
    }
    const source = asString(row.application.source);
    if (source) sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
  }

  return {
    listings: [...listingMap.values()].sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    properties: [...propertyMap.values()].sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    sources: [...sourceMap.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => left.value.localeCompare(right.value)),
  };
}

function sortRows(
  rows: Array<{
    application: LegacyRecord;
    row: ApplicationsOverviewRow;
    relatedLeaseId: string | null;
  }>,
  sort: string | undefined
) {
  switch (sort) {
    case "qualification_desc":
      rows.sort((left, right) => right.row.qualificationScore - left.row.qualificationScore);
      break;
    case "created_desc":
      rows.sort((left, right) =>
        asString(right.application.created_at).localeCompare(
          asString(left.application.created_at)
        )
      );
      break;
    case "sla_desc":
      rows.sort((left, right) => {
        const rank = (application: ApplicationsOverviewRow) => {
          if (application.responseSlaStatus === "breached") return 4;
          if (application.responseSlaAlertLevel === "critical") return 3;
          if (application.responseSlaAlertLevel === "warning") return 2;
          if (application.responseSlaStatus === "pending") return 1;
          return 0;
        };
        return rank(right.row) - rank(left.row);
      });
      break;
    default:
      rows.sort((left, right) =>
        (right.row.lastTouchAt ?? "").localeCompare(left.row.lastTouchAt ?? "")
      );
      break;
  }
}

async function buildFallbackApplicationsOverview(
  filters: ApplicationsOverviewFilters
): Promise<ApplicationsOverviewResponse> {
  const [applications, listings, properties, units, messageLogs, leases, failedSubmissions] =
    await Promise.all([
      fetchList("/applications", filters.org_id, 250, {
        status: filters.status,
        assigned_user_id:
          filters.assigned_user_id === "__unassigned__"
            ? undefined
            : filters.assigned_user_id,
        listing_id: filters.listing_id,
      }),
      fetchList("/listings", filters.org_id, 500).catch(() => [] as unknown[]),
      fetchList("/properties", filters.org_id, 500).catch(() => [] as unknown[]),
      fetchList("/units", filters.org_id, 500).catch(() => [] as unknown[]),
      fetchList("/message-logs", filters.org_id, 500).catch(() => [] as unknown[]),
      fetchList("/leases", filters.org_id, 500).catch(() => [] as unknown[]),
      fetchList("/integration-events", filters.org_id, 100, {
        provider: "alerting",
        event_type: "application_submit_failed",
        status: "failed",
      }).catch(() => [] as unknown[]),
    ]);

  const listingById = new Map(
    listings
      .filter(isLegacyRecord)
      .map((listing) => [asString(listing.id), listing] as const)
      .filter((entry) => entry[0])
  );
  const propertyById = new Map(
    properties
      .filter(isLegacyRecord)
      .map((property) => [asString(property.id), property] as const)
      .filter((entry) => entry[0])
  );
  const unitById = new Map(
    units
      .filter(isLegacyRecord)
      .map((unit) => [asString(unit.id), unit] as const)
      .filter((entry) => entry[0])
  );
  const leaseIdsByApplicationId = new Map(
    leases
      .filter(isLegacyRecord)
      .map((lease) => [asString(lease.application_id), asString(lease.id)] as const)
      .filter((entry) => entry[0] && entry[1])
  );

  const preparedRows = applications
    .filter(isLegacyRecord)
    .map((application) => {
      const context = buildApplicationContext(
        application,
        listingById,
        propertyById,
        unitById
      );
      return { application, context };
    })
    .filter(({ application, context }) => matchesFilters(application, context, filters));

  const filteredBeforeView = preparedRows.map(({ application }) => application);
  const savedViews = buildSavedViews(filteredBeforeView, leaseIdsByApplicationId);

  const rows = preparedRows
    .filter(({ application }) =>
      matchesView(
        application,
        asString(filters.view) || undefined,
        leaseIdsByApplicationId.has(asString(application.id))
      )
    )
    .map(({ application, context }) => {
      const relatedLeaseId = leaseIdsByApplicationId.get(asString(application.id)) ?? null;
      const applicationMessages = messageLogs
        .filter(isLegacyRecord)
        .filter((message) => {
          const messageApplicationId = asString(message.application_id);
          if (messageApplicationId) return messageApplicationId === asString(application.id);
          const recipient = asString(message.recipient);
          return (
            recipient &&
            [asString(application.email), asString(application.phone_e164)].includes(recipient)
          );
        });
      const lastTouchAt = maxTimestamp(
        asString(application.updated_at) || asString(application.created_at),
        ...applicationMessages.map((message) => asString(message.created_at)),
        leases
          .filter(isLegacyRecord)
          .find((lease) => asString(lease.application_id) === asString(application.id))
          ? asString(
              leases
                .filter(isLegacyRecord)
                .find((lease) => asString(lease.application_id) === asString(application.id))
                ?.updated_at
            )
          : null
      );

      return {
        application,
        relatedLeaseId,
        row: buildRow({
          application,
          context,
          relatedLeaseId,
          lastTouchAt,
        }),
      };
    });

  sortRows(rows, asString(filters.sort) || undefined);

  const limit = Math.max(1, Math.min(Number(filters.limit ?? 50), 100));
  const offset = Math.max(0, Number(filters.offset ?? 0));
  const pagedRows = rows.slice(offset, offset + limit).map((entry) => entry.row);

  return {
    summary: buildSummary(
      rows.map((entry) => entry.application),
      leaseIdsByApplicationId
    ),
    savedViews,
    rows: pagedRows,
    facets: buildFacets(preparedRows),
    intakeHealth: {
      failedSubmissions: failedSubmissions.length,
      stalledApplications: rows.filter((entry) => isStalled(entry.application)).length,
    },
    pagination: {
      total: rows.length,
      limit,
      offset,
      hasMore: offset + limit < rows.length,
    },
  };
}

function qualificationReasons(application: LegacyRecord): string[] {
  const reasons: string[] = [];
  const ratio = asNullableNumber(application.income_to_rent_ratio);
  if (ratio && ratio >= 3) reasons.push("Income covers rent above 3x.");
  else if (ratio) reasons.push(`Income-to-rent ratio is ${ratio.toFixed(2)}x.`);
  if (asString(application.document_number)) reasons.push("Identity document provided.");
  if (asString(application.phone_e164)) reasons.push("Phone contact available.");
  if (asString(application.guarantee_choice)) {
    reasons.push(
      `Guarantee option: ${asString(application.guarantee_choice).replaceAll("_", " ")}.`
    );
  }
  if (reasons.length === 0) reasons.push("Qualification data is limited.");
  return reasons;
}

function buildMessageContract(message: LegacyRecord) {
  const payload = isLegacyRecord(message.payload) ? message.payload : {};
  const bodyPreview = asString(payload.body).slice(0, 180);
  return {
    id: asString(message.id),
    channel: asString(message.channel),
    direction:
      normalizeStatus(message.direction) === "inbound" ? "inbound" : "outbound",
    status: asString(message.status),
    subject: asString(payload.subject) || null,
    bodyPreview,
    createdAt: asString(message.created_at),
  } as const;
}

function buildTimeline(
  application: LegacyRecord,
  messages: LegacyRecord[],
  relatedLeaseId: string | null
) {
  const events = Array.isArray(application.events)
    ? application.events.filter(isLegacyRecord)
    : [];
  const timeline = [
    {
      id: `submitted:${asString(application.id)}`,
      kind: "application_event" as const,
      title: "Application submitted",
      subtitle: asString(application.source) || "marketplace",
      createdAt: asString(application.created_at),
    },
    ...events.map((event) => {
      const payload = isLegacyRecord(event.event_payload) ? event.event_payload : {};
      const type = normalizeStatus(event.event_type);
      if (type === "status_changed") {
        return {
          id: asString(event.id),
          kind: "application_event" as const,
          title: `Status changed to ${statusLabel(payload.to)}`,
          subtitle: asString(payload.note),
          createdAt: asString(event.created_at),
        };
      }
      if (type === "lease_sign") {
        return {
          id: asString(event.id),
          kind: "conversion" as const,
          title: "Converted to lease",
          subtitle: asString(payload.lease_id),
          createdAt: asString(event.created_at),
        };
      }
      return {
        id: asString(event.id),
        kind: "application_event" as const,
        title: statusLabel(type),
        subtitle: asString(payload.note) || asString(payload.lease_id),
        createdAt: asString(event.created_at),
      };
    }),
    ...messages.map((message) => {
      const contract = buildMessageContract(message);
      return {
        id: contract.id,
        kind: "message" as const,
        title: `${contract.channel || "message"} ${contract.direction}`,
        subtitle: contract.bodyPreview,
        createdAt: contract.createdAt,
      };
    }),
    ...(relatedLeaseId
      ? [
          {
            id: `lease:${relatedLeaseId}`,
            kind: "conversion" as const,
            title: "Lease created",
            subtitle: relatedLeaseId,
            createdAt: maxTimestamp(
              asString(
                Array.isArray(application.events)
                  ? (application.events as LegacyRecord[])
                      .find((event) =>
                        isLegacyRecord(event) &&
                        normalizeStatus(event.event_type) === "lease_sign"
                      )
                      ?.created_at
                  : null
              ),
              asString(application.updated_at)
            ) ?? asString(application.updated_at),
          },
        ]
      : []),
  ].filter((event) => event.createdAt);

  return timeline.sort(byCreatedDesc);
}

async function buildFallbackApplicationOverview(
  applicationId: string
): Promise<ApplicationOverviewResponse> {
  const application = (await fetchJson<Record<string, unknown>>(
    `/applications/${encodeURIComponent(applicationId)}`
  )) as LegacyRecord;
  const orgId = asString(application.organization_id);

  const [listings, properties, units, messageLogs, leases, failedSubmissions] =
    await Promise.all([
      fetchList("/listings", orgId, 500).catch(() => [] as unknown[]),
      fetchList("/properties", orgId, 500).catch(() => [] as unknown[]),
      fetchList("/units", orgId, 500).catch(() => [] as unknown[]),
      fetchList("/message-logs", orgId, 500).catch(() => [] as unknown[]),
      fetchList("/leases", orgId, 500).catch(() => [] as unknown[]),
      fetchList("/integration-events", orgId, 100, {
        provider: "alerting",
        event_type: "application_submit_failed",
        status: "failed",
      }).catch(() => [] as unknown[]),
    ]);

  const listingById = new Map(
    listings
      .filter(isLegacyRecord)
      .map((listing) => [asString(listing.id), listing] as const)
      .filter((entry) => entry[0])
  );
  const propertyById = new Map(
    properties
      .filter(isLegacyRecord)
      .map((property) => [asString(property.id), property] as const)
      .filter((entry) => entry[0])
  );
  const unitById = new Map(
    units
      .filter(isLegacyRecord)
      .map((unit) => [asString(unit.id), unit] as const)
      .filter((entry) => entry[0])
  );
  const context = buildApplicationContext(
    application,
    listingById,
    propertyById,
    unitById
  );
  const relatedLease = leases
    .filter(isLegacyRecord)
    .find((lease) => asString(lease.application_id) === applicationId);
  const relatedLeaseId = relatedLease ? asString(relatedLease.id) || null : null;
  const messages = messageLogs
    .filter(isLegacyRecord)
    .filter((message) => {
      const messageApplicationId = asString(message.application_id);
      if (messageApplicationId) return messageApplicationId === applicationId;
      const recipient = asString(message.recipient);
      return (
        recipient &&
        [asString(application.email), asString(application.phone_e164)].includes(recipient)
      );
    })
    .sort((left, right) =>
      asString(right.created_at).localeCompare(asString(left.created_at))
    );
  const lastTouchAt = maxTimestamp(
    asString(application.updated_at),
    ...messages.map((message) => asString(message.created_at)),
    asString(relatedLease?.updated_at)
  );
  const row = buildRow({
    application,
    context,
    relatedLeaseId,
    lastTouchAt,
  });

  return {
    application: {
      ...row,
      createdAt: asString(application.created_at),
      monthlyIncome: asNullableNumber(application.monthly_income),
      guaranteeChoice: asString(application.guarantee_choice) || null,
      documentNumber: asString(application.document_number) || null,
      message: asString(application.message) || null,
      predictiveScore: asNullableNumber(application.predictive_score),
      riskFactors: asRiskFactors(application.risk_factors),
    },
    qualification: {
      score: row.qualificationScore,
      band: row.qualificationBand,
      incomeToRentRatio: asNullableNumber(application.income_to_rent_ratio),
      reasons: qualificationReasons(application),
    },
    context,
    timeline: buildTimeline(application, messages, relatedLeaseId),
    messages: messages.map(buildMessageContract),
    conversion: {
      canConvert: canConvert(asString(application.status), Boolean(relatedLeaseId)),
      relatedLeaseId,
    },
    failedSubmissionHistory: failedSubmissions
      .filter(isLegacyRecord)
      .filter((event) => {
        if (!context.listingId) return false;
        const payload = isLegacyRecord(event.payload) ? event.payload : {};
        return asString(payload.listing_id) === context.listingId;
      })
      .map((event) => ({
        id: asString(event.id),
        createdAt: asString(event.created_at),
        detail:
          asString(event.error_message) ||
          asString(event.message) ||
          "Marketplace submission failed.",
      })),
  };
}

export async function fetchApplicationsOverview(
  filters: ApplicationsOverviewFilters
): Promise<ApplicationsOverviewResponse> {
  try {
    return await fetchJson<ApplicationsOverviewResponse>("/applications/overview", filters);
  } catch (err) {
    if (!isMissingOverviewRoute(err, "/applications/overview")) {
      throw err;
    }
    return buildFallbackApplicationsOverview(filters);
  }
}

export async function fetchApplicationOverview(
  applicationId: string
): Promise<ApplicationOverviewResponse> {
  const path = `/applications/${encodeURIComponent(applicationId)}/overview`;
  try {
    return await fetchJson<ApplicationOverviewResponse>(path);
  } catch (err) {
    if (!isMissingOverviewRoute(err, path)) {
      throw err;
    }
    return buildFallbackApplicationOverview(applicationId);
  }
}
