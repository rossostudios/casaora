import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import {
  asNumber,
  asString,
  COLLECTION_PAID_STATUSES,
  convertAmountToPyg,
  normalizedStatus,
  toDate,
  URGENT_TASK_PRIORITIES,
} from "./analytics-shared";
import type {
  PropertyActivityItem,
  PropertyPortfolioRow,
  PropertyRelationIndex,
  PropertyRelationRow,
} from "./types";

export function buildPropertyRecentActivity(params: {
  rows: PropertyPortfolioRow[];
  tasks: PropertyRelationRow[];
  collections: PropertyRelationRow[];
  relationIndex: PropertyRelationIndex;
  locale: Locale;
}): PropertyActivityItem[] {
  const { rows, tasks, collections, relationIndex, locale } = params;
  const { propertyIdByLease, propertyIdByUnit } = relationIndex;
  const isEn = locale === "en-US";

  const propertyNameById = new Map(
    rows.map((row) => [row.id, row.name] as const)
  );

  const events: PropertyActivityItem[] = [];
  for (const task of tasks) {
    const propertyId =
      asString(task.property_id) ||
      propertyIdByUnit.get(asString(task.unit_id)) ||
      "";
    if (!propertyId) continue;
    const timestamp =
      toDate(task.updated_at) || toDate(task.created_at) || toDate(task.due_at);
    if (!timestamp) continue;

    const taskTitle =
      asString(task.title) || asString(task.type) || (isEn ? "Task" : "Tarea");
    const isUrgent = URGENT_TASK_PRIORITIES.has(
      normalizedStatus(task.priority)
    );
    const isDone = normalizedStatus(task.status) === "done";
    events.push({
      id: `task:${asString(task.id) || taskTitle}`,
      title: isDone
        ? isEn
          ? "Task completed"
          : "Tarea completada"
        : isEn
          ? "Task updated"
          : "Tarea actualizada",
      detail: `${taskTitle} · ${propertyNameById.get(propertyId) ?? propertyId}`,
      timestamp,
      tone: isUrgent ? "warning" : "info",
    });
  }

  for (const collection of collections) {
    const propertyId =
      propertyIdByLease.get(asString(collection.lease_id)) ||
      asString(collection.property_id);
    if (!propertyId) continue;
    const timestamp =
      toDate(collection.paid_at) ||
      toDate(collection.updated_at) ||
      toDate(collection.due_date);
    if (!timestamp) continue;

    const status = normalizedStatus(collection.status);
    const amountPyg = convertAmountToPyg(
      asNumber(collection.amount) ?? 0,
      asString(collection.currency) || "PYG",
      asNumber(collection.fx_rate_to_pyg)
    );
    const formatLocale = locale === "en-US" ? "en-US" : "es-PY";
    events.push({
      id: `collection:${asString(collection.id) || timestamp.toISOString()}`,
      title: COLLECTION_PAID_STATUSES.has(status)
        ? isEn
          ? "Payment received"
          : "Cobro recibido"
        : isEn
          ? "Collection follow-up"
          : "Seguimiento de cobro",
      detail: `${propertyNameById.get(propertyId) ?? propertyId} · ${formatCurrency(
        amountPyg,
        "PYG",
        formatLocale
      )}`,
      timestamp,
      tone: COLLECTION_PAID_STATUSES.has(status) ? "success" : "warning",
    });
  }

  return events
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 5);
}
