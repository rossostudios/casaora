import type { Locale } from "@/lib/i18n";
import type { PropertyNotificationItem, PropertyPortfolioRow } from "./types";

export function buildPropertyNotifications(params: {
  rows: PropertyPortfolioRow[];
  locale: Locale;
}): PropertyNotificationItem[] {
  const { rows, locale } = params;
  const isEn = locale === "en-US";

  const notifications: PropertyNotificationItem[] = [];
  for (const row of rows) {
    if (row.overdueCollectionCount > 0) {
      notifications.push({
        id: `${row.id}:collections`,
        title: isEn ? "Overdue collections" : "Cobros vencidos",
        detail: isEn
          ? `${row.name} has ${row.overdueCollectionCount} items.`
          : `${row.name} tiene ${row.overdueCollectionCount} items.`,
        tone: "danger",
      });
    }
    if (row.urgentTaskCount > 0) {
      notifications.push({
        id: `${row.id}:tasks`,
        title: isEn ? "Urgent tasks" : "Tareas urgentes",
        detail: isEn
          ? `${row.name} has ${row.urgentTaskCount} urgent tasks.`
          : `${row.name} tiene ${row.urgentTaskCount} tareas urgentes.`,
        tone: "warning",
      });
    }
  }

  return notifications.slice(0, 4);
}
