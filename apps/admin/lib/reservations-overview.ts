import { fetchJson, fetchList } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

type LegacyRecord = Record<string, unknown>;

export type ReservationStayPhase =
  | "arriving_today"
  | "departing_today"
  | "in_house"
  | "upcoming"
  | "completed"
  | "cancelled";

export type ReservationsOverviewFilters = {
  org_id: string;
  q?: string;
  status?: string;
  source?: string;
  property_id?: string;
  unit_id?: string;
  stay_phase?: string;
  from?: string;
  to?: string;
  view?: string;
  sort?: string;
  limit?: number;
  offset?: number;
};

export type ReservationOverviewRow = {
  id: string;
  guestId: string | null;
  guestName: string | null;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string | null;
  unitName: string | null;
  status: string;
  statusLabel: string;
  source: string;
  sourceLabel: string;
  stayPhase: ReservationStayPhase;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  totalAmount: number;
  amountPaid: number;
  currency: string;
  openTasks: number;
  listingSlug: string | null;
  guestPortalEligible: boolean;
  primaryHref: string;
};

export type ReservationsOverviewResponse = {
  summary: {
    arrivalsToday: number;
    departuresToday: number;
    inHouse: number;
    needsAttention: number;
  };
  viewCounts: Record<string, number>;
  rows: ReservationOverviewRow[];
};

export type ReservationDetailOverview = {
  reservation: ReservationOverviewRow & {
    nightlyRate: number;
    cleaningFee: number;
    taxAmount: number;
    extraFees: number;
    discountAmount: number;
    paymentMethod: string | null;
    paymentReference: string | null;
    notes: string | null;
    externalReservationId: string | null;
    amountDue: number;
    depositAmount: number;
    depositStatus: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  guest: Record<string, unknown> | null;
  availability: {
    blockedPeriods: Array<{ from: string; to: string; source: "reservation" | "block" }>;
    relatedBlocks: Array<{ id: string; startsOn: string; endsOn: string; reason: string | null }>;
  };
  tasks: {
    open: number;
    href: string;
    recent: Array<Record<string, unknown>>;
  };
  expenses: {
    href: string;
    recent: Array<Record<string, unknown>>;
  };
  messaging: {
    href: string;
    recent: Array<Record<string, unknown>>;
  };
  related: {
    listingHref: string | null;
    guestPortalEligible: boolean;
    guestHref?: string | null;
    propertyHref?: string | null;
    unitHref?: string | null;
    tasksHref?: string;
    expensesHref?: string;
    messagingHref?: string;
    calendarHref?: string | null;
  };
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

function asNullableString(value: unknown): string | null {
  const parsed = asString(value);
  return parsed || null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function titleCase(value: string): string {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusLabel(value: string): string {
  switch (value) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "checked_in":
      return "Checked In";
    case "checked_out":
      return "Checked Out";
    case "cancelled":
      return "Cancelled";
    case "no_show":
      return "No Show";
    default:
      return titleCase(value || "unknown");
  }
}

function sourceLabel(row: LegacyRecord): string {
  const channelName = asString(row.channel_name).toLowerCase();
  const integrationName = asString(row.integration_name);
  const source = asString(row.source).toLowerCase();

  if (channelName.includes("airbnb")) return "Airbnb";
  if (channelName.includes("booking")) return "Booking.com";
  if (source === "marketplace") return "Casaora Marketplace";
  if (source === "direct_booking") return "Casaora";
  if (source === "manual") return "Manual";
  if (integrationName) return integrationName;
  if (channelName) return titleCase(channelName);
  return titleCase(source || "manual");
}

function stayPhase(row: LegacyRecord): ReservationStayPhase {
  const status = asString(row.status).toLowerCase();
  const checkIn = asString(row.check_in_date);
  const checkOut = asString(row.check_out_date);
  const today = todayIso();

  if (status === "cancelled" || status === "no_show") return "cancelled";
  if (checkIn === today && ["pending", "confirmed", "checked_in"].includes(status)) {
    return "arriving_today";
  }
  if (checkOut === today && ["confirmed", "checked_in", "checked_out"].includes(status)) {
    return "departing_today";
  }
  if (status === "checked_in" && checkIn < today && checkOut > today) {
    return "in_house";
  }
  if (checkIn > today && ["pending", "confirmed"].includes(status)) {
    return "upcoming";
  }
  return "completed";
}

function overlapsWindow(
  row: { from: string; to: string },
  from?: string,
  to?: string
): boolean {
  const windowFrom = asString(from) || row.from;
  const windowTo = asString(to) || row.to;
  return row.from < windowTo && row.to > windowFrom;
}

function matchesFilters(
  row: ReservationOverviewRow,
  filters: ReservationsOverviewFilters
): boolean {
  const q = asString(filters.q).toLowerCase();
  if (q) {
    const haystack = [
      row.guestName,
      row.propertyName,
      row.unitName,
      row.sourceLabel,
      row.source,
      row.listingSlug,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.status && row.status !== filters.status) return false;
  if (filters.source && row.source !== filters.source) return false;
  if (filters.property_id && row.propertyId !== filters.property_id) return false;
  if (filters.unit_id && row.unitId !== filters.unit_id) return false;
  if (filters.stay_phase && row.stayPhase !== filters.stay_phase) return false;
  if (
    (filters.from || filters.to) &&
    !overlapsWindow(
      { from: row.checkInDate, to: row.checkOutDate },
      filters.from,
      filters.to
    )
  ) {
    return false;
  }
  return true;
}

function needsAttention(row: ReservationOverviewRow): boolean {
  return (
    row.status === "pending" ||
    row.status === "no_show" ||
    !row.guestId ||
    row.openTasks > 0 ||
    (row.checkInDate <= todayIso() && row.status === "confirmed")
  );
}

function matchesView(row: ReservationOverviewRow, view: string | undefined): boolean {
  switch (view) {
    case "arrivals_today":
      return row.stayPhase === "arriving_today";
    case "departures_today":
      return row.stayPhase === "departing_today";
    case "in_house":
      return row.stayPhase === "in_house";
    case "needs_attention":
      return needsAttention(row);
    default:
      return true;
  }
}

function sortRows(rows: ReservationOverviewRow[], sort: string | undefined): ReservationOverviewRow[] {
  const copy = [...rows];
  switch (sort) {
    case "check_out_asc":
      copy.sort((left, right) => left.checkOutDate.localeCompare(right.checkOutDate));
      return copy;
    case "guest_asc":
      copy.sort((left, right) => (left.guestName ?? "").localeCompare(right.guestName ?? ""));
      return copy;
    case "total_desc":
      copy.sort((left, right) => right.totalAmount - left.totalAmount);
      return copy;
    case "status_asc":
      copy.sort((left, right) => left.status.localeCompare(right.status));
      return copy;
    default:
      copy.sort((left, right) => left.checkInDate.localeCompare(right.checkInDate));
      return copy;
  }
}

function mapLegacyRow(
  row: LegacyRecord,
  openTasksByReservation: Map<string, number>
): ReservationOverviewRow {
  const id = asString(row.id);
  const checkInDate = asString(row.check_in_date);
  const checkOutDate = asString(row.check_out_date);
  const checkIn = new Date(`${checkInDate}T00:00:00`);
  const checkOut = new Date(`${checkOutDate}T00:00:00`);
  const nights =
    Number.isNaN(checkIn.valueOf()) || Number.isNaN(checkOut.valueOf())
      ? 0
      : Math.max(0, Math.round((checkOut.valueOf() - checkIn.valueOf()) / 86_400_000));

  return {
    id,
    guestId: asNullableString(row.guest_id),
    guestName: asNullableString(row.guest_name),
    propertyId: asNullableString(row.property_id),
    propertyName: asNullableString(row.property_name),
    unitId: asNullableString(row.unit_id),
    unitName: asNullableString(row.unit_name),
    status: asString(row.status) || "pending",
    statusLabel: statusLabel(asString(row.status) || "pending"),
    source: asString(row.source) || "manual",
    sourceLabel: sourceLabel(row),
    stayPhase: stayPhase(row),
    checkInDate,
    checkOutDate,
    nights,
    adults: asNumber(row.adults),
    children: asNumber(row.children),
    totalAmount: asNumber(row.total_amount),
    amountPaid: asNumber(row.amount_paid),
    currency: asString(row.currency) || "PYG",
    openTasks:
      openTasksByReservation.get(id) ??
      asNumber(row.auto_generated_task_count) ??
      0,
    listingSlug:
      asNullableString(row.listing_slug) ??
      asNullableString(row.listing_public_slug),
    guestPortalEligible: Boolean(asString(row.guest_id)),
    primaryHref: `/module/reservations/${encodeURIComponent(id)}`,
  };
}

async function fetchOverviewFallback(
  filters: ReservationsOverviewFilters
): Promise<ReservationsOverviewResponse> {
  const [reservations, tasks] = await Promise.all([
    fetchList("/reservations", filters.org_id, 500, {
      property_id: filters.property_id,
      unit_id: filters.unit_id,
      status: filters.status,
    }),
    fetchList("/tasks", filters.org_id, 1000).catch(() => [] as unknown[]),
  ]);

  const openTasksByReservation = new Map<string, number>();
  for (const task of tasks as LegacyRecord[]) {
    const reservationId = asString(task.reservation_id);
    const status = asString(task.status);
    if (!reservationId || ["done", "cancelled"].includes(status)) continue;
    openTasksByReservation.set(
      reservationId,
      (openTasksByReservation.get(reservationId) ?? 0) + 1
    );
  }

  const baseRows = (reservations as LegacyRecord[])
    .map((row) => mapLegacyRow(row, openTasksByReservation))
    .filter((row) => matchesFilters(row, filters));

  const visibleRows = sortRows(
    baseRows.filter((row) => matchesView(row, filters.view)),
    filters.sort
  );

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  return {
    summary: {
      arrivalsToday: baseRows.filter((row) => row.stayPhase === "arriving_today").length,
      departuresToday: baseRows.filter((row) => row.stayPhase === "departing_today").length,
      inHouse: baseRows.filter((row) => row.stayPhase === "in_house").length,
      needsAttention: baseRows.filter(needsAttention).length,
    },
    viewCounts: {
      all: baseRows.length,
      arrivals_today: baseRows.filter((row) => row.stayPhase === "arriving_today").length,
      departures_today: baseRows.filter((row) => row.stayPhase === "departing_today").length,
      in_house: baseRows.filter((row) => row.stayPhase === "in_house").length,
      needs_attention: baseRows.filter(needsAttention).length,
    },
    rows: visibleRows.slice(offset, offset + limit),
  };
}

function normalizeMessagePreview(message: LegacyRecord): string {
  const payload = message.payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const body = asString((payload as LegacyRecord).body);
    if (body) return body.slice(0, 180);
  }
  return asString(message.body_preview).slice(0, 180);
}

async function fetchDetailFallback(
  reservationId: string,
  orgId: string
): Promise<ReservationDetailOverview> {
  const reservationRaw = await fetchJson<LegacyRecord>(
    `/reservations/${encodeURIComponent(reservationId)}`
  );

  const guestId = asString(reservationRaw.guest_id);
  const unitId = asString(reservationRaw.unit_id);
  const listingSlug =
    asNullableString(reservationRaw.listing_slug) ??
    asNullableString(reservationRaw.listing_public_slug);

  const [guest, tasks, expenses, blocks, unitReservations, messages] =
    await Promise.all([
      guestId
        ? fetchJson<LegacyRecord>(`/guests/${encodeURIComponent(guestId)}`).catch(
            () => null
          )
        : Promise.resolve(null),
      fetchList("/tasks", orgId, 200, { reservation_id: reservationId }).catch(
        () => [] as unknown[]
      ),
      fetchList("/expenses", orgId, 100, { reservation_id: reservationId }).catch(
        () => [] as unknown[]
      ),
      unitId
        ? fetchList("/calendar/blocks", orgId, 200, { unit_id: unitId }).catch(
            () => [] as unknown[]
          )
        : Promise.resolve([] as unknown[]),
      unitId
        ? fetchList("/reservations", orgId, 300, { unit_id: unitId }).catch(
            () => [] as unknown[]
          )
        : Promise.resolve([] as unknown[]),
      guestId
        ? fetchList("/message-logs", orgId, 120, { guest_id: guestId }).catch(
            () => [] as unknown[]
          )
        : Promise.resolve([] as unknown[]),
    ]);

  const openTasks = (tasks as LegacyRecord[]).filter(
    (task) => !["done", "cancelled"].includes(asString(task.status))
  ).length;

  const overviewRow = mapLegacyRow(reservationRaw, new Map([[reservationId, openTasks]]));
  const from = asString(reservationRaw.check_in_date);
  const to = asString(reservationRaw.check_out_date);

  const relatedBlocks = (blocks as LegacyRecord[])
    .filter((block) =>
      overlapsWindow(
        { from: asString(block.starts_on), to: asString(block.ends_on) },
        from,
        to
      )
    )
    .map((block) => ({
      id: asString(block.id),
      startsOn: asString(block.starts_on),
      endsOn: asString(block.ends_on),
      reason: asNullableString(block.reason),
    }));

  const blockedPeriods = [
    { from, to, source: "reservation" as const },
    ...(unitReservations as LegacyRecord[])
      .filter((row) => asString(row.id) !== reservationId)
      .filter((row) =>
        ["pending", "confirmed", "checked_in"].includes(asString(row.status))
      )
      .filter((row) =>
        overlapsWindow(
          { from: asString(row.check_in_date), to: asString(row.check_out_date) },
          from,
          to
        )
      )
      .map((row) => ({
        from: asString(row.check_in_date),
        to: asString(row.check_out_date),
        source: "reservation" as const,
      })),
    ...relatedBlocks.map((block) => ({
      from: block.startsOn,
      to: block.endsOn,
      source: "block" as const,
    })),
  ].sort((left, right) => left.from.localeCompare(right.from));

  return {
    reservation: {
      ...overviewRow,
      nightlyRate: asNumber(reservationRaw.nightly_rate),
      cleaningFee: asNumber(reservationRaw.cleaning_fee),
      taxAmount: asNumber(reservationRaw.tax_amount),
      extraFees: asNumber(reservationRaw.extra_fees),
      discountAmount: asNumber(reservationRaw.discount_amount),
      paymentMethod: asNullableString(reservationRaw.payment_method),
      paymentReference: asNullableString(reservationRaw.payment_reference),
      notes: asNullableString(reservationRaw.notes),
      externalReservationId: asNullableString(reservationRaw.external_reservation_id),
      amountDue: Math.max(
        0,
        asNumber(reservationRaw.total_amount) - asNumber(reservationRaw.amount_paid)
      ),
      depositAmount: asNumber(reservationRaw.deposit_amount),
      depositStatus: asNullableString(reservationRaw.deposit_status),
      createdAt: asNullableString(reservationRaw.created_at),
      updatedAt: asNullableString(reservationRaw.updated_at),
    },
    guest,
    availability: {
      blockedPeriods,
      relatedBlocks,
    },
    tasks: {
      open: openTasks,
      href: `/module/tasks?reservation_id=${encodeURIComponent(reservationId)}`,
      recent: (tasks as LegacyRecord[]).slice(0, 5),
    },
    expenses: {
      href: `/module/expenses?reservation_id=${encodeURIComponent(reservationId)}`,
      recent: (expenses as LegacyRecord[]).slice(0, 5),
    },
    messaging: {
      href: "/module/messaging",
      recent: (messages as LegacyRecord[]).slice(0, 6).map((message) => ({
        id: asString(message.id),
        channel: asString(message.channel),
        direction: asString(message.direction) || "outbound",
        status: asString(message.status),
        bodyPreview: normalizeMessagePreview(message),
        createdAt: asNullableString(message.created_at),
      })),
    },
    related: {
      listingHref: listingSlug ? `/marketplace/${listingSlug}` : null,
      guestPortalEligible: Boolean(guestId),
      guestHref: guestId ? `/module/guests/${encodeURIComponent(guestId)}` : null,
      propertyHref: overviewRow.propertyId
        ? `/module/properties/${encodeURIComponent(overviewRow.propertyId)}`
        : null,
      unitHref: overviewRow.unitId
        ? `/module/units/${encodeURIComponent(overviewRow.unitId)}`
        : null,
      tasksHref: `/module/tasks?reservation_id=${encodeURIComponent(reservationId)}`,
      expensesHref: `/module/expenses?reservation_id=${encodeURIComponent(reservationId)}`,
      messagingHref: "/module/messaging",
      calendarHref: overviewRow.unitId
        ? `/module/calendar?unit_id=${encodeURIComponent(overviewRow.unitId)}`
        : null,
    },
  };
}

export async function fetchReservationsOverview(
  filters: ReservationsOverviewFilters
): Promise<ReservationsOverviewResponse> {
  try {
    return await fetchJson<ReservationsOverviewResponse>("/reservations/overview", filters);
  } catch (error) {
    if (!isMissingOverviewRoute(error, "/reservations/overview")) {
      throw error;
    }
    return fetchOverviewFallback(filters);
  }
}

export async function fetchReservationDetailOverview(
  reservationId: string,
  orgId: string
): Promise<ReservationDetailOverview> {
  try {
    return await fetchJson<ReservationDetailOverview>(
      `/reservations/${encodeURIComponent(reservationId)}/overview`
    );
  } catch (error) {
    if (
      !isMissingOverviewRoute(
        error,
        `/reservations/${encodeURIComponent(reservationId)}/overview`
      )
    ) {
      throw error;
    }
    return fetchDetailFallback(reservationId, orgId);
  }
}
