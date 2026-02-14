import type { Locale } from "@/lib/i18n";
import {
  asDateLabel,
  asString,
  convertAmountToPyg,
  daysUntilDate,
  getFirstValue,
  normalizedStatus,
  toDate,
  toNumber,
  URGENT_TASK_PRIORITIES,
} from "./data-helpers";
import type { PropertyAttentionItem } from "./types";

const MAX_DATE = new Date(8_640_000_000_000_000);

export function buildAttentionItems(params: {
  openTasks: Record<string, unknown>[];
  openCollections: Record<string, unknown>[];
  activeLeases: Record<string, unknown>[];
  locale: Locale;
  recordId: string;
  isEn: boolean;
  now: Date;
}): PropertyAttentionItem[] {
  const {
    openTasks,
    openCollections,
    activeLeases,
    locale,
    recordId,
    isEn,
    now,
  } = params;

  const urgentTasks = [...openTasks]
    .filter((task) => {
      const dueDate = toDate(task.due_at);
      const isPastDue = dueDate !== null && dueDate.getTime() < now.getTime();
      const highPriority = URGENT_TASK_PRIORITIES.has(
        normalizedStatus(task.priority)
      );
      return isPastDue || highPriority;
    })
    .sort((left, right) => {
      const leftDue = toDate(left.due_at) ?? MAX_DATE;
      const rightDue = toDate(right.due_at) ?? MAX_DATE;
      return leftDue.getTime() - rightDue.getTime();
    });

  const overdueCollections = [...openCollections]
    .filter((row) => {
      const dueDate = toDate(row.due_date);
      return dueDate !== null && dueDate.getTime() < now.getTime();
    })
    .sort((left, right) => {
      const leftDue = toDate(left.due_date) ?? MAX_DATE;
      const rightDue = toDate(right.due_date) ?? MAX_DATE;
      return leftDue.getTime() - rightDue.getTime();
    });

  const leasesExpiringSoon = [...activeLeases]
    .filter((lease) => {
      const endsOn = toDate(lease.ends_on);
      if (!endsOn) return false;
      const daysUntil = daysUntilDate(endsOn, now);
      return daysUntil >= 0 && daysUntil <= 60;
    })
    .sort((left, right) => {
      const leftDate = toDate(left.ends_on) ?? MAX_DATE;
      const rightDate = toDate(right.ends_on) ?? MAX_DATE;
      return leftDate.getTime() - rightDate.getTime();
    });

  const attentionItems: PropertyAttentionItem[] = [];
  for (const row of overdueCollections.slice(0, 2)) {
    const collectionId = asString(row.id);
    const leaseId = asString(row.lease_id);
    const dueDate = asDateLabel(asString(row.due_date), locale);
    const amount = convertAmountToPyg(
      toNumber(row.amount) ?? 0,
      asString(row.currency) || "PYG",
      toNumber(row.fx_rate_to_pyg)
    );
    attentionItems.push({
      id: `collection:${collectionId || leaseId || attentionItems.length}`,
      title: isEn ? "Overdue collection" : "Cobro vencido",
      detail: `${new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "PYG",
        maximumFractionDigits: 0,
      }).format(
        amount
      )} · ${dueDate ?? (isEn ? "No due date" : "Sin vencimiento")}`,
      href: collectionId
        ? `/module/collections/${collectionId}`
        : `/module/collections?property_id=${encodeURIComponent(recordId)}`,
      tone: "danger",
      ctaLabel: isEn ? "Review" : "Revisar",
    });
  }

  for (const row of urgentTasks.slice(0, 2)) {
    const taskId = asString(row.id);
    const dueDate = asDateLabel(asString(row.due_at), locale);
    attentionItems.push({
      id: `task:${taskId || attentionItems.length}`,
      title: getFirstValue(row, ["title", "type", "id"]) ?? "-",
      detail: dueDate
        ? isEn
          ? `Due ${dueDate}`
          : `Vence ${dueDate}`
        : isEn
          ? "Task needs attention"
          : "La tarea requiere atención",
      href: taskId
        ? `/module/tasks/${taskId}`
        : `/module/tasks?property_id=${encodeURIComponent(recordId)}`,
      tone: "warning",
      ctaLabel: isEn ? "Open task" : "Abrir tarea",
    });
  }

  for (const row of leasesExpiringSoon.slice(0, 2)) {
    const leaseId = asString(row.id);
    const endsOn = toDate(row.ends_on);
    const daysLeft = endsOn ? daysUntilDate(endsOn, now) : null;
    const tenantName =
      getFirstValue(row, ["tenant_full_name", "tenant_name"]) ?? "-";
    attentionItems.push({
      id: `lease:${leaseId || attentionItems.length}`,
      title: isEn ? "Lease ending soon" : "Contrato por vencer",
      detail:
        daysLeft === null
          ? tenantName
          : isEn
            ? `${tenantName} · ${daysLeft} days left`
            : `${tenantName} · faltan ${daysLeft} días`,
      href: leaseId
        ? `/module/leases/${leaseId}`
        : `/module/leases?property_id=${encodeURIComponent(recordId)}`,
      tone: "info",
      ctaLabel: isEn ? "Open lease" : "Ver contrato",
    });
  }

  return attentionItems.slice(0, 6);
}
