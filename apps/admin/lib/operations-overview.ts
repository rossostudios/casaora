import { fetchJson, fetchList } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

type LegacyRecord = Record<string, unknown>;

export type OperationsWorkItem = {
  id: string;
  kind: "task" | "maintenance" | "turnover" | "availability_conflict";
  title: string;
  status: string;
  priority: string;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string | null;
  unitName: string | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
  dueAt: string | null;
  createdAt?: string | null;
  slaState: "none" | "watch" | "breached";
  sourceHref: string;
  primaryHref: string;
};

export type OperationsOverviewFilters = {
  org_id: string;
  q?: string;
  property_id?: string;
  unit_id?: string;
  assigned_user_id?: string;
  reservation_id?: string;
  task_id?: string;
  request_id?: string;
  kind?: string;
  view?: string;
  sort?: string;
  limit?: number;
  offset?: number;
};

export type OperationsOverviewResponse = {
  summary: {
    dueToday: number;
    slaRisk: number;
    unassigned: number;
    turnoversToday: number;
  };
  viewCounts: Record<string, number>;
  items: OperationsWorkItem[];
  attentionItems: Array<{
    id: string;
    title: string;
    subtitle: string;
    href: string;
    severity: "high" | "medium" | "low";
  }>;
  aiBriefingSeed: string;
};

type InternalOperationsWorkItem = OperationsWorkItem & {
  reservationId?: string | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown): string | null {
  const parsed = asString(value);
  return parsed || null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function lower(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isMissingOverviewRoute(error: unknown, path: string): boolean {
  const message = errorMessage(error).toLowerCase();
  return message.includes("(404)") && message.includes(path.toLowerCase());
}

function isClosedTask(status: string): boolean {
  return ["done", "completed", "cancelled"].includes(lower(status));
}

function isClosedMaintenance(status: string): boolean {
  return ["completed", "closed"].includes(lower(status));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusHours(hours: number): number {
  return Date.now() + hours * 60 * 60 * 1000;
}

function dueDateOnly(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value.slice(0, 10) : value.slice(0, 10);
  return normalized || null;
}

function computeTaskSlaState(row: LegacyRecord): "none" | "watch" | "breached" {
  if (asString(row.sla_breached_at)) return "breached";
  const dueRaw = asString(row.sla_due_at) || asString(row.due_at);
  if (!dueRaw) return "none";
  const dueAt = new Date(dueRaw).valueOf();
  if (!Number.isFinite(dueAt)) return "none";
  if (dueAt < Date.now()) return "breached";
  if (dueAt <= plusHours(24)) return "watch";
  return "none";
}

function computeMaintenanceSlaState(row: LegacyRecord): "none" | "watch" | "breached" {
  const status = lower(asString(row.status));
  if (isClosedMaintenance(status)) return "none";
  const createdAt = new Date(asString(row.created_at)).valueOf();
  if (!Number.isFinite(createdAt)) return "none";

  const elapsed = Date.now() - createdAt;
  const urgency = lower(asString(row.urgency) || "medium");
  const breachWindowMs =
    urgency === "emergency"
      ? 4 * 60 * 60 * 1000
      : urgency === "high"
        ? 24 * 60 * 60 * 1000
        : urgency === "low"
          ? 7 * 24 * 60 * 60 * 1000
          : 72 * 60 * 60 * 1000;
  const watchWindowMs = Math.round(breachWindowMs * 0.75);

  if (elapsed >= breachWindowMs) return "breached";
  if (elapsed >= watchWindowMs) return "watch";
  return "none";
}

function sortPriorityRank(priority: string): number {
  switch (lower(priority)) {
    case "critical":
      return 0;
    case "emergency":
      return 1;
    case "urgent":
      return 2;
    case "high":
      return 3;
    case "medium":
      return 4;
    case "low":
      return 5;
    default:
      return 6;
  }
}

function sortSlaRank(state: string): number {
  switch (lower(state)) {
    case "breached":
      return 0;
    case "watch":
      return 1;
    default:
      return 2;
  }
}

function sortItems(
  rows: InternalOperationsWorkItem[],
  sort: string | undefined
): InternalOperationsWorkItem[] {
  const copy = [...rows];
  copy.sort((left, right) => {
    if (sort === "created_desc") {
      return (
        new Date(right.createdAt ?? 0).valueOf() -
        new Date(left.createdAt ?? 0).valueOf()
      );
    }
    if (sort === "due_asc") {
      return (
        new Date(left.dueAt ?? "9999-12-31").valueOf() -
        new Date(right.dueAt ?? "9999-12-31").valueOf()
      );
    }
    if (sort === "sla_desc") {
      const bySla = sortSlaRank(left.slaState) - sortSlaRank(right.slaState);
      if (bySla !== 0) return bySla;
    } else {
      const byPriority = sortPriorityRank(left.priority) - sortPriorityRank(right.priority);
      if (byPriority !== 0) return byPriority;
      const bySla = sortSlaRank(left.slaState) - sortSlaRank(right.slaState);
      if (bySla !== 0) return bySla;
    }

    return (
      new Date(left.dueAt ?? "9999-12-31").valueOf() -
      new Date(right.dueAt ?? "9999-12-31").valueOf()
    );
  });
  return copy;
}

function matchesBaseFilters(
  row: InternalOperationsWorkItem,
  filters: OperationsOverviewFilters
): boolean {
  const q = lower(filters.q);
  if (q) {
    const haystack = [
      row.title,
      row.status,
      row.priority,
      row.propertyName,
      row.unitName,
      row.assigneeName,
      row.kind,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.property_id && row.propertyId !== filters.property_id) return false;
  if (filters.unit_id && row.unitId !== filters.unit_id) return false;
  if (
    filters.assigned_user_id &&
    filters.assigned_user_id !== "unassigned" &&
    filters.assigned_user_id !== "__unassigned__" &&
    row.assigneeUserId !== filters.assigned_user_id
  ) {
    return false;
  }
  if (
    (filters.assigned_user_id === "unassigned" ||
      filters.assigned_user_id === "__unassigned__") &&
    row.assigneeUserId
  ) {
    return false;
  }
  if (filters.reservation_id && row.reservationId !== filters.reservation_id) return false;
  if (filters.task_id && !(row.kind === "task" && row.id === filters.task_id)) return false;
  if (
    filters.request_id &&
    !(row.kind === "maintenance" && row.id === filters.request_id)
  ) {
    return false;
  }
  if (filters.kind && row.kind !== filters.kind) return false;
  return true;
}

function matchesView(
  row: InternalOperationsWorkItem,
  view: string | undefined
): boolean {
  switch (view) {
    case "today":
      return dueDateOnly(row.dueAt) === todayIso();
    case "sla_risk":
      return row.slaState !== "none";
    case "unassigned":
      return ["task", "maintenance"].includes(row.kind) && !row.assigneeUserId;
    case "turnovers":
      return row.kind === "turnover";
    case "maintenance_emergency":
      return row.kind === "maintenance" && lower(row.priority) === "emergency";
    default:
      return true;
  }
}

function viewCounts(rows: InternalOperationsWorkItem[]): Record<string, number> {
  return {
    all: rows.length,
    today: rows.filter((row) => dueDateOnly(row.dueAt) === todayIso()).length,
    sla_risk: rows.filter((row) => row.slaState !== "none").length,
    unassigned: rows.filter(
      (row) => ["task", "maintenance"].includes(row.kind) && !row.assigneeUserId
    ).length,
    turnovers: rows.filter((row) => row.kind === "turnover").length,
    maintenance_emergency: rows.filter(
      (row) => row.kind === "maintenance" && lower(row.priority) === "emergency"
    ).length,
  };
}

function buildAttentionSubtitle(row: InternalOperationsWorkItem): string {
  return [
    row.kind === "availability_conflict"
      ? "Calendar conflict"
      : row.kind === "turnover"
        ? "Turnover"
        : row.kind === "maintenance"
          ? "Maintenance"
          : "Task",
    row.propertyName,
    row.unitName,
    row.status && row.status !== "conflict" ? row.status.replaceAll("_", " ") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function attentionSeverity(
  row: InternalOperationsWorkItem
): "high" | "medium" | "low" {
  if (row.slaState === "breached") return "high";
  if (row.slaState === "watch") return "medium";
  switch (lower(row.priority)) {
    case "critical":
    case "emergency":
    case "urgent":
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

function buildAiBriefingSeed(
  summary: OperationsOverviewResponse["summary"],
  attentionItems: OperationsOverviewResponse["attentionItems"]
): string {
  const parts = [
    `${summary.dueToday} due today, ${summary.slaRisk} at SLA risk, ${summary.unassigned} unassigned, ${summary.turnoversToday} turnovers today.`,
  ];
  if (attentionItems.length > 0) {
    parts.push(
      `Focus on ${attentionItems
        .slice(0, 3)
        .map((item) => item.title)
        .join("; ")}.`
    );
  }
  return parts.join(" ");
}

function toPublicRow(row: InternalOperationsWorkItem): OperationsWorkItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    status: row.status,
    priority: row.priority,
    propertyId: row.propertyId,
    propertyName: row.propertyName,
    unitId: row.unitId,
    unitName: row.unitName,
    assigneeUserId: row.assigneeUserId,
    assigneeName: row.assigneeName,
    dueAt: row.dueAt,
    createdAt: row.createdAt,
    slaState: row.slaState,
    sourceHref: row.sourceHref,
    primaryHref: row.primaryHref,
  };
}

async function buildLegacyOverview(
  filters: OperationsOverviewFilters
): Promise<OperationsOverviewResponse> {
  const orgId = filters.org_id;
  const [tasks, maintenanceRequests, reservations, properties, units, members, blocks] =
    await Promise.all([
      fetchList("/tasks", orgId, 1000, {
        property_id: filters.property_id,
        unit_id: filters.unit_id,
        reservation_id: filters.reservation_id,
      }),
      fetchList("/maintenance-requests", orgId, 500, {
        property_id: filters.property_id,
      }),
      fetchList("/reservations", orgId, 800, {
        property_id: filters.property_id,
        unit_id: filters.unit_id,
      }),
      fetchList("/properties", orgId, 400),
      fetchList("/units", orgId, 800),
      fetchList(`/organizations/${orgId}/members`, orgId, 200).catch(
        () => [] as unknown[]
      ),
      fetchList("/calendar/blocks", orgId, 800, {
        unit_id: filters.unit_id,
      }).catch(() => [] as unknown[]),
    ]);

  const propertyNameById = new Map<string, string>();
  for (const property of properties as LegacyRecord[]) {
    const id = asString(property.id);
    if (!id) continue;
    propertyNameById.set(id, asString(property.name) || id);
  }

  const unitInfoById = new Map<
    string,
    { name: string; propertyId: string | null; propertyName: string | null }
  >();
  for (const unit of units as LegacyRecord[]) {
    const id = asString(unit.id);
    if (!id) continue;
    const propertyId = asNullableString(unit.property_id);
    unitInfoById.set(id, {
      name: asString(unit.name) || asString(unit.code) || id,
      propertyId,
      propertyName: propertyId ? propertyNameById.get(propertyId) ?? null : null,
    });
  }

  const assigneeNameById = new Map<string, string>();
  for (const member of members as LegacyRecord[]) {
    const userId = asString(member.user_id) || asString(member.id);
    if (!userId) continue;
    const name =
      asString(member.full_name) || asString(member.name) || asString(member.email);
    if (name) assigneeNameById.set(userId, name);
  }

  const taskById = new Map<string, LegacyRecord>();
  const openTurnoverTaskCountByReservationId = new Map<string, number>();

  for (const task of tasks as LegacyRecord[]) {
    const id = asString(task.id);
    if (!id) continue;
    taskById.set(id, task);

    const reservationId = asNullableString(task.reservation_id);
    const taskType = lower(asString(task.type));
    if (
      reservationId &&
      !isClosedTask(asString(task.status)) &&
      ["check_in", "check_out", "cleaning", "inspection"].includes(taskType)
    ) {
      openTurnoverTaskCountByReservationId.set(
        reservationId,
        (openTurnoverTaskCountByReservationId.get(reservationId) ?? 0) + 1
      );
    }
  }

  const rows: InternalOperationsWorkItem[] = [];

  for (const task of tasks as LegacyRecord[]) {
    const id = asString(task.id);
    if (!id || isClosedTask(asString(task.status))) continue;
    const propertyId = asNullableString(task.property_id);
    const unitId = asNullableString(task.unit_id);
    const unitInfo = unitId ? unitInfoById.get(unitId) : null;
    const assigneeUserId = asNullableString(task.assigned_user_id);
    rows.push({
      id,
      kind: "task",
      title: asString(task.title) || "Task",
      status: asString(task.status) || "todo",
      priority: asString(task.priority) || "medium",
      propertyId: propertyId ?? unitInfo?.propertyId ?? null,
      propertyName:
        asNullableString(task.property_name) ??
        (propertyId ? propertyNameById.get(propertyId) ?? null : null) ??
        unitInfo?.propertyName ??
        null,
      unitId,
      unitName:
        asNullableString(task.unit_name) ?? unitInfo?.name ?? null,
      assigneeUserId,
      assigneeName:
        asNullableString(task.assigned_user_name) ??
        (assigneeUserId ? assigneeNameById.get(assigneeUserId) ?? null : null),
      dueAt: asNullableString(task.sla_due_at) ?? asNullableString(task.due_at),
      createdAt: asNullableString(task.created_at),
      slaState: computeTaskSlaState(task),
      sourceHref: `/module/tasks/${encodeURIComponent(id)}`,
      primaryHref: `/module/tasks/${encodeURIComponent(id)}`,
      reservationId: asNullableString(task.reservation_id),
    });
  }

  for (const request of maintenanceRequests as LegacyRecord[]) {
    const id = asString(request.id);
    if (!id || isClosedMaintenance(asString(request.status))) continue;
    const propertyId = asNullableString(request.property_id);
    const unitId = asNullableString(request.unit_id);
    const unitInfo = unitId ? unitInfoById.get(unitId) : null;
    const linkedTask = asNullableString(request.task_id)
      ? taskById.get(asString(request.task_id))
      : null;
    const assigneeUserId = linkedTask ? asNullableString(linkedTask.assigned_user_id) : null;
    rows.push({
      id,
      kind: "maintenance",
      title:
        asString(request.title) ||
        asString(request.description) ||
        "Maintenance request",
      status: asString(request.status) || "submitted",
      priority: asString(request.urgency) || "medium",
      propertyId: propertyId ?? unitInfo?.propertyId ?? null,
      propertyName:
        asNullableString(request.property_name) ??
        (propertyId ? propertyNameById.get(propertyId) ?? null : null) ??
        unitInfo?.propertyName ??
        null,
      unitId,
      unitName: asNullableString(request.unit_name) ?? unitInfo?.name ?? null,
      assigneeUserId,
      assigneeName: assigneeUserId ? assigneeNameById.get(assigneeUserId) ?? null : null,
      dueAt:
        asNullableString(request.scheduled_at) ??
        asNullableString(request.acknowledged_at) ??
        asNullableString(request.created_at),
      createdAt: asNullableString(request.created_at),
      slaState: computeMaintenanceSlaState(request),
      sourceHref: `/module/maintenance?request_id=${encodeURIComponent(id)}`,
      primaryHref: `/module/operations?tab=maintenance&request_id=${encodeURIComponent(id)}`,
      reservationId: linkedTask ? asNullableString(linkedTask.reservation_id) : null,
    });
  }

  for (const reservation of reservations as LegacyRecord[]) {
    const reservationId = asString(reservation.id);
    if (!reservationId) continue;
    const status = lower(asString(reservation.status));
    const guestName = asString(reservation.guest_name) || "Guest";
    const unitId = asNullableString(reservation.unit_id);
    const unitInfo = unitId ? unitInfoById.get(unitId) : null;
    const propertyId = asNullableString(reservation.property_id) ?? unitInfo?.propertyId ?? null;
    const propertyName =
      asNullableString(reservation.property_name) ??
      (propertyId ? propertyNameById.get(propertyId) ?? null : null) ??
      unitInfo?.propertyName ??
      null;
    const unitName = asNullableString(reservation.unit_name) ?? unitInfo?.name ?? null;

    const isArrivalToday =
      asString(reservation.check_in_date) === todayIso() &&
      ["pending", "confirmed", "checked_in"].includes(status);
    const isDepartureToday =
      asString(reservation.check_out_date) === todayIso() &&
      ["confirmed", "checked_in", "checked_out"].includes(status);

    if (isArrivalToday || isDepartureToday) {
      const openTurnoverTasks =
        openTurnoverTaskCountByReservationId.get(reservationId) ?? 0;
      rows.push({
        id: reservationId,
        kind: "turnover",
        title: `${isArrivalToday ? "Arrival" : "Departure"} · ${guestName}`,
        status: isArrivalToday ? "arriving_today" : "departing_today",
        priority: "high",
        propertyId,
        propertyName,
        unitId,
        unitName,
        assigneeUserId: null,
        assigneeName: null,
        dueAt: isArrivalToday
          ? asNullableString(reservation.check_in_date)
          : asNullableString(reservation.check_out_date),
        createdAt: asNullableString(reservation.created_at),
        slaState: openTurnoverTasks > 0 ? "watch" : "none",
        sourceHref: `/module/reservations/${encodeURIComponent(reservationId)}`,
        primaryHref: `/module/reservations/${encodeURIComponent(reservationId)}`,
        reservationId,
      });
    }
  }

  const activeReservationsByUnit = new Map<string, LegacyRecord[]>();
  for (const reservation of reservations as LegacyRecord[]) {
    const status = lower(asString(reservation.status));
    if (!["pending", "confirmed", "checked_in"].includes(status)) continue;
    const unitId = asString(reservation.unit_id);
    if (!unitId) continue;
    const list = activeReservationsByUnit.get(unitId) ?? [];
    list.push(reservation);
    activeReservationsByUnit.set(unitId, list);
  }

  for (const block of blocks as LegacyRecord[]) {
    if (lower(asString(block.source) || "manual") !== "manual") continue;
    const blockId = asString(block.id);
    const unitId = asString(block.unit_id);
    if (!(blockId && unitId)) continue;
    const reservationsForUnit = activeReservationsByUnit.get(unitId) ?? [];
    for (const reservation of reservationsForUnit) {
      const reservationId = asString(reservation.id);
      const reservationFrom = asString(reservation.check_in_date);
      const reservationTo = asString(reservation.check_out_date);
      const blockFrom = asString(block.starts_on);
      const blockTo = asString(block.ends_on);
      if (!(reservationId && reservationFrom && reservationTo && blockFrom && blockTo)) {
        continue;
      }
      if (!(reservationFrom < blockTo && reservationTo > blockFrom)) continue;
      const unitInfo = unitInfoById.get(unitId);
      const propertyId = asNullableString(reservation.property_id) ?? unitInfo?.propertyId ?? null;
      const propertyName =
        asNullableString(reservation.property_name) ??
        (propertyId ? propertyNameById.get(propertyId) ?? null : null) ??
        unitInfo?.propertyName ??
        null;

      rows.push({
        id: `conflict:${reservationId}:${blockId}`,
        kind: "availability_conflict",
        title: `Availability conflict · ${asString(reservation.guest_name) || "Guest"}`,
        status: "conflict",
        priority:
          todayIso() >= blockFrom && todayIso() < blockTo ? "critical" : "high",
        propertyId,
        propertyName,
        unitId,
        unitName: asNullableString(reservation.unit_name) ?? unitInfo?.name ?? null,
        assigneeUserId: null,
        assigneeName: null,
        dueAt: blockFrom,
        createdAt: asNullableString(block.created_at),
        slaState:
          todayIso() >= blockFrom && todayIso() < blockTo ? "breached" : "watch",
        sourceHref: `/module/calendar?unit_id=${encodeURIComponent(unitId)}`,
        primaryHref: `/module/reservations/${encodeURIComponent(reservationId)}`,
        reservationId,
      });
    }
  }

  const baseFiltered = rows.filter((row) => matchesBaseFilters(row, filters));
  const visible = baseFiltered.filter((row) => matchesView(row, filters.view));
  const counts = viewCounts(baseFiltered);
  const sorted = sortItems(visible, filters.sort);
  const offset = Math.max(filters.offset ?? 0, 0);
  const limit = Math.max(filters.limit ?? 50, 1);
  const paged = sorted.slice(offset, offset + limit);

  const summary = {
    dueToday: counts.today,
    slaRisk: counts.sla_risk,
    unassigned: counts.unassigned,
    turnoversToday: counts.turnovers,
  };

  const attentionItems = sortItems(
    baseFiltered.filter(
      (row) =>
        row.slaState !== "none" ||
        ["critical", "emergency", "urgent", "high"].includes(lower(row.priority)) ||
        row.kind === "turnover" ||
        row.kind === "availability_conflict"
    ),
    filters.sort
  )
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: buildAttentionSubtitle(row),
      href: row.primaryHref,
      severity: attentionSeverity(row),
    }));

  return {
    summary,
    viewCounts: counts,
    items: paged.map(toPublicRow),
    attentionItems,
    aiBriefingSeed: buildAiBriefingSeed(summary, attentionItems),
  };
}

export async function fetchOperationsOverview(
  filters: OperationsOverviewFilters
): Promise<OperationsOverviewResponse> {
  try {
    return await fetchJson<OperationsOverviewResponse>("/operations/overview", filters);
  } catch (error) {
    if (!isMissingOverviewRoute(error, "/operations/overview")) {
      throw error;
    }
    return buildLegacyOverview(filters);
  }
}
