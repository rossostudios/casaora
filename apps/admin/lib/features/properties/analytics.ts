import type { Locale } from "@/lib/i18n";
import { buildPropertyRecentActivity as buildPropertyRecentActivityImpl } from "./analytics-activity";
import { buildPropertyNotifications as buildPropertyNotificationsImpl } from "./analytics-notifications";
import {
  buildPropertyPortfolioRows as buildPropertyPortfolioRowsImpl,
  buildPropertyPortfolioSummary as buildPropertyPortfolioSummaryImpl,
  buildPropertyRelationIndex as buildPropertyRelationIndexImpl,
  filterPropertyPortfolioRows as filterPropertyPortfolioRowsImpl,
} from "./analytics-portfolio";
import type {
  PropertyActivityItem,
  PropertyHealthFilter,
  PropertyNotificationItem,
  PropertyPortfolioRow,
  PropertyPortfolioSummary,
  PropertyRecord,
  PropertyRelationIndex,
  PropertyRelationRow,
  PropertyStatusFilter,
} from "./types";

export function buildPropertyRelationIndex(
  units: PropertyRelationRow[],
  leases: PropertyRelationRow[]
): PropertyRelationIndex {
  return buildPropertyRelationIndexImpl(units, leases);
}

export function buildPropertyPortfolioRows(params: {
  properties: PropertyRecord[];
  units: PropertyRelationRow[];
  leases: PropertyRelationRow[];
  tasks: PropertyRelationRow[];
  collections: PropertyRelationRow[];
  relationIndex: PropertyRelationIndex;
}): PropertyPortfolioRow[] {
  return buildPropertyPortfolioRowsImpl(params);
}

export function filterPropertyPortfolioRows(params: {
  rows: PropertyPortfolioRow[];
  query: string;
  statusFilter: PropertyStatusFilter;
  healthFilter: PropertyHealthFilter;
}): PropertyPortfolioRow[] {
  return filterPropertyPortfolioRowsImpl(params);
}

export function buildPropertyPortfolioSummary(
  rows: PropertyPortfolioRow[]
): PropertyPortfolioSummary {
  return buildPropertyPortfolioSummaryImpl(rows);
}

export function buildPropertyRecentActivity(params: {
  rows: PropertyPortfolioRow[];
  tasks: PropertyRelationRow[];
  collections: PropertyRelationRow[];
  relationIndex: PropertyRelationIndex;
  locale: Locale;
}): PropertyActivityItem[] {
  return buildPropertyRecentActivityImpl(params);
}

export function buildPropertyNotifications(params: {
  rows: PropertyPortfolioRow[];
  locale: Locale;
}): PropertyNotificationItem[] {
  return buildPropertyNotificationsImpl(params);
}
