import { fetchJson, fetchList } from "@/lib/api";

export type ListingLifecycleState =
  | "draft"
  | "ready_to_publish"
  | "published"
  | "blocked";

export type ListingsOverviewFilters = {
  org_id: string;
  q?: string;
  property_id?: string;
  unit_id?: string;
  published_state?: string;
  lifecycle_state?: string;
  view?: string;
  sort?: string;
  limit?: number;
  offset?: number;
};

export type ListingsOverviewRow = {
  id: string;
  title: string;
  publicSlug: string;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string | null;
  unitName: string | null;
  isPublished: boolean;
  lifecycleState: ListingLifecycleState;
  readinessScore: number;
  readinessBlocking: string[];
  currency: string;
  monthlyRecurringTotal: number;
  totalMoveIn: number;
  availableFrom: string | null;
  applicationCount: number;
  updatedAt: string | null;
  primaryHref: string;
  previewHref: string;
  publicHref: string | null;
};

export type ListingsOverviewResponse = {
  summary: {
    total: number;
    drafts: number;
    readyToPublish: number;
    published: number;
    blocked: number;
    applications: number;
  };
  viewCounts: Record<string, number>;
  rows: ListingsOverviewRow[];
  hasUnits: boolean;
};

export type ListingReadinessIssue = {
  field: string;
  label: string;
  weight?: number;
  satisfied?: boolean;
  critical?: boolean;
};

export type ListingDetailOverview = {
  listing: ListingsOverviewRow & {
    summary: string | null;
    description: string | null;
    pricingTemplateId: string | null;
    pricingTemplateLabel: string | null;
    coverImageUrl: string | null;
    galleryImageUrls: string[];
    city: string;
    neighborhood: string | null;
    currency: string;
    propertyType: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    squareMeters: number | null;
    furnished: boolean;
    petPolicy: string | null;
    parkingSpaces: number | null;
    minimumLeaseMonths: number | null;
    availableFrom: string | null;
    maintenanceFee: number | null;
    amenities: string[];
  };
  readiness: {
    score: number;
    blocking: boolean;
    issues: ListingReadinessIssue[];
  };
  pricing: {
    feeLines: Array<Record<string, unknown>>;
    monthlyRecurringTotal: number;
    totalMoveIn: number;
  };
  availability: {
    availableFrom: string | null;
    blockedDatesCount: number;
    upcomingReservationsCount: number;
  };
  applications: {
    total: number;
    open: number;
    latest: Array<Record<string, unknown>>;
  };
  preview: Record<string, unknown>;
};

type LegacyListResponse = {
  data?: Array<Record<string, unknown>>;
};

type LegacyApplicationRow = Record<string, unknown>;

const READINESS_LABELS: Record<string, string> = {
  cover_image: "Cover image",
  fee_lines: "Fee breakdown",
  amenities: "Amenities",
  bedrooms: "Bedrooms",
  square_meters: "Area",
  available_from: "Available from",
  minimum_lease: "Minimum lease",
  description: "Description",
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asNullableNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : [];
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && error.message.includes("(404)");
}

function lifecycleStateForLegacy(row: Record<string, unknown>): ListingLifecycleState {
  if (asBoolean(row.is_published)) return "published";
  const blocking = asStringArray(row.readiness_blocking);
  const hasCover = Boolean(asString(row.cover_image_url));
  const feeComplete = row.fee_breakdown_complete !== false;
  if (
    blocking.length === 0 &&
    hasCover &&
    feeComplete &&
    Boolean(asString(row.available_from)) &&
    asNumber(row.minimum_lease_months) > 0 &&
    asStringArray(row.amenities).length >= 3
  ) {
    return "ready_to_publish";
  }
  if (!hasCover || !feeComplete) return "blocked";
  return "draft";
}

function mapLegacyRow(row: Record<string, unknown>): ListingsOverviewRow {
  const id = asString(row.id);
  const publicSlug = asString(row.public_slug);
  const lifecycleState = lifecycleStateForLegacy(row);
  const isPublished = asBoolean(row.is_published);
  return {
    id,
    title: asString(row.title) || "Listing",
    publicSlug,
    propertyId: asString(row.property_id) || null,
    propertyName: asString(row.property_name) || null,
    unitId: asString(row.unit_id) || null,
    unitName: asString(row.unit_name) || null,
    isPublished,
    lifecycleState,
    readinessScore: asNumber(row.readiness_score),
    readinessBlocking: asStringArray(row.readiness_blocking),
    currency: asString(row.currency) || "PYG",
    monthlyRecurringTotal: asNumber(row.monthly_recurring_total),
    totalMoveIn: asNumber(row.total_move_in),
    availableFrom: asString(row.available_from) || null,
    applicationCount: asNumber(row.application_count),
    updatedAt: asString(row.updated_at) || null,
    primaryHref: `/module/listings/${encodeURIComponent(id)}`,
    previewHref: `/module/listings/${encodeURIComponent(id)}?preview=1`,
    publicHref:
      isPublished && publicSlug ? `/marketplace/${encodeURIComponent(publicSlug)}` : null,
  };
}

function matchesOverviewFilters(
  row: ListingsOverviewRow,
  filters: ListingsOverviewFilters
): boolean {
  const q = asString(filters.q).toLowerCase();
  if (q) {
    const haystack = [
      row.title,
      row.publicSlug,
      row.propertyName,
      row.unitName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.property_id && row.propertyId !== filters.property_id) return false;
  if (filters.unit_id && row.unitId !== filters.unit_id) return false;
  if (filters.published_state === "published" && !row.isPublished) return false;
  if (filters.published_state === "draft" && row.isPublished) return false;
  if (
    filters.lifecycle_state &&
    row.lifecycleState !== filters.lifecycle_state
  ) {
    return false;
  }
  switch (filters.view) {
    case "drafts":
      return row.lifecycleState === "draft";
    case "ready_to_publish":
      return row.lifecycleState === "ready_to_publish";
    case "live":
      return row.lifecycleState === "published";
    case "needs_media":
      return row.readinessBlocking.includes("cover_image");
    case "has_applications":
      return row.applicationCount > 0;
    default:
      return true;
  }
}

function sortOverviewRows(
  rows: ListingsOverviewRow[],
  sort: string | undefined
): ListingsOverviewRow[] {
  const copy = [...rows];
  switch (sort) {
    case "title_asc":
      copy.sort((left, right) => left.title.localeCompare(right.title));
      return copy;
    case "monthly_desc":
      copy.sort((left, right) => right.monthlyRecurringTotal - left.monthlyRecurringTotal);
      return copy;
    case "applications_desc":
      copy.sort((left, right) => right.applicationCount - left.applicationCount);
      return copy;
    default:
      copy.sort((left, right) => {
        const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
        const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
        return rightTime - leftTime;
      });
      return copy;
  }
}

async function fetchOverviewFallback(
  filters: ListingsOverviewFilters
): Promise<ListingsOverviewResponse> {
  const response = await fetchJson<LegacyListResponse>("/listings", {
    org_id: filters.org_id,
    limit: 500,
    property_id: filters.property_id,
    unit_id: filters.unit_id,
    status:
      filters.published_state === "published"
        ? "published"
        : filters.published_state === "draft"
          ? "draft"
          : undefined,
  });

  const allRows = (response.data ?? []).map(mapLegacyRow);
  const summaryRows = allRows.filter((row) => {
    const q = asString(filters.q).toLowerCase();
    if (!q) return true;
    return [row.title, row.publicSlug, row.propertyName, row.unitName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
  const filteredRows = sortOverviewRows(
    summaryRows.filter((row) => matchesOverviewFilters(row, filters)),
    filters.sort
  );
  const offset = Math.max(filters.offset ?? 0, 0);
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 100);
  const hasUnits = (await fetchList("/units", filters.org_id, 1)).length > 0;

  return {
    summary: {
      total: summaryRows.length,
      drafts: summaryRows.filter((row) => row.lifecycleState === "draft").length,
      readyToPublish: summaryRows.filter(
        (row) => row.lifecycleState === "ready_to_publish"
      ).length,
      published: summaryRows.filter((row) => row.lifecycleState === "published").length,
      blocked: summaryRows.filter((row) => row.lifecycleState === "blocked").length,
      applications: summaryRows.reduce((sum, row) => sum + row.applicationCount, 0),
    },
    viewCounts: {
      all: summaryRows.length,
      drafts: summaryRows.filter((row) => row.lifecycleState === "draft").length,
      ready_to_publish: summaryRows.filter(
        (row) => row.lifecycleState === "ready_to_publish"
      ).length,
      live: summaryRows.filter((row) => row.lifecycleState === "published").length,
      needs_media: summaryRows.filter((row) =>
        row.readinessBlocking.includes("cover_image")
      ).length,
      has_applications: summaryRows.filter((row) => row.applicationCount > 0).length,
    },
    rows: filteredRows.slice(offset, offset + limit),
    hasUnits: hasUnits,
  };
}

async function fetchLegacyApplications(
  listingId: string,
  orgId: string
): Promise<LegacyApplicationRow[]> {
  try {
    const response = await fetchJson<LegacyListResponse>("/applications", {
      org_id: orgId,
      listing_id: listingId,
      limit: 5,
    });
    return response.data ?? [];
  } catch {
    return [];
  }
}

async function fetchDetailFallback(
  listingId: string,
  orgId: string
): Promise<ListingDetailOverview> {
  const row = await fetchJson<Record<string, unknown>>(
    `/listings/${encodeURIComponent(listingId)}`,
    { org_id: orgId }
  );
  const applications = await fetchLegacyApplications(listingId, orgId);
  const listing = mapLegacyRow(row);
  const latest = applications.map((application) => ({
    id: asString(application.id),
    title:
      asString(application.full_name) ||
      asString(application.applicant_name) ||
      "Application",
    status: asString(application.status),
    createdAt: asString(application.created_at),
  }));
  return {
    listing: {
      ...listing,
      summary: asString(row.summary) || null,
      description: asString(row.description) || null,
      pricingTemplateId: asString(row.pricing_template_id) || null,
      pricingTemplateLabel: asString(row.pricing_template_label) || null,
      coverImageUrl: asString(row.cover_image_url) || null,
      galleryImageUrls: asStringArray(row.gallery_image_urls),
      city: asString(row.city) || "asuncion",
      neighborhood: asString(row.neighborhood) || null,
      currency: asString(row.currency) || "PYG",
      propertyType: asString(row.property_type) || null,
      bedrooms: asNullableNumber(row.bedrooms),
      bathrooms: asNullableNumber(row.bathrooms),
      squareMeters: asNullableNumber(row.square_meters),
      furnished: asBoolean(row.furnished),
      petPolicy: asString(row.pet_policy) || null,
      parkingSpaces: asNullableNumber(row.parking_spaces),
      minimumLeaseMonths: asNullableNumber(row.minimum_lease_months),
      availableFrom: asString(row.available_from) || null,
      maintenanceFee: asNullableNumber(row.maintenance_fee),
      amenities: asStringArray(row.amenities),
    },
    readiness: {
      score: asNumber(row.readiness_score),
      blocking: asStringArray(row.readiness_blocking).length > 0,
      issues: asStringArray(row.readiness_blocking).map((field) => ({
        field,
        label: READINESS_LABELS[field] ?? field.replaceAll("_", " "),
      })),
    },
    pricing: {
      feeLines: Array.isArray(row.fee_lines)
        ? (row.fee_lines as Array<Record<string, unknown>>)
        : [],
      monthlyRecurringTotal: asNumber(row.monthly_recurring_total),
      totalMoveIn: asNumber(row.total_move_in),
    },
    availability: {
      availableFrom: asString(row.available_from) || null,
      blockedDatesCount: 0,
      upcomingReservationsCount: 0,
    },
    applications: {
      total: asNumber(row.application_count) || latest.length,
      open: asNumber(row.application_count) || latest.length,
      latest,
    },
    preview: row,
  };
}

function queryParams(filters: ListingsOverviewFilters) {
  return {
    org_id: filters.org_id,
    q: filters.q,
    property_id: filters.property_id,
    unit_id: filters.unit_id,
    published_state: filters.published_state,
    lifecycle_state: filters.lifecycle_state,
    view: filters.view,
    sort: filters.sort,
    limit: filters.limit,
    offset: filters.offset,
  };
}

export function fetchListingsOverview(
  filters: ListingsOverviewFilters
): Promise<ListingsOverviewResponse> {
  return fetchJson<ListingsOverviewResponse>("/listings/overview", queryParams(filters)).catch(
    async (error) => {
      if (!isNotFound(error)) throw error;
      return fetchOverviewFallback(filters);
    }
  );
}

export function fetchListingDetailOverview(
  listingId: string,
  orgId: string
): Promise<ListingDetailOverview> {
  return fetchJson<ListingDetailOverview>(
    `/listings/${encodeURIComponent(listingId)}/overview`,
    { org_id: orgId }
  ).catch(async (error) => {
    if (!isNotFound(error)) throw error;
    return fetchDetailFallback(listingId, orgId);
  });
}

export function fetchListingPreview(
  listingId: string,
  orgId: string
): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(
    `/listings/${encodeURIComponent(listingId)}/preview`,
    { org_id: orgId }
  ).catch(async (error) => {
    if (!isNotFound(error)) throw error;
    return fetchJson<Record<string, unknown>>(
      `/listings/${encodeURIComponent(listingId)}`,
      { org_id: orgId }
    );
  });
}
