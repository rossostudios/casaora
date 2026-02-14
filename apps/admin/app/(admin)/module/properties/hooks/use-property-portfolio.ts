import { useMemo } from "react";

import {
  buildPropertyNotifications,
  buildPropertyPortfolioRows,
  buildPropertyPortfolioSummary,
  buildPropertyRecentActivity,
  buildPropertyRelationIndex,
} from "@/lib/features/properties/analytics";
import type {
  PropertyActivityItem,
  PropertyNotificationItem,
  PropertyPortfolioRow,
  PropertyPortfolioSummary,
  PropertyRecord,
  PropertyRelationRow,
} from "@/lib/features/properties/types";
import type { Locale } from "@/lib/i18n";

type UsePropertyPortfolioParams = {
  locale: Locale;
  properties: PropertyRecord[];
  units: PropertyRelationRow[];
  leases: PropertyRelationRow[];
  tasks: PropertyRelationRow[];
  collections: PropertyRelationRow[];
};

export function usePropertyPortfolio({
  locale,
  properties,
  units,
  leases,
  tasks,
  collections,
}: UsePropertyPortfolioParams): {
  rows: PropertyPortfolioRow[];
  summary: PropertyPortfolioSummary;
  recentActivity: PropertyActivityItem[];
  notifications: PropertyNotificationItem[];
} {
  const relationIndex = useMemo(
    () => buildPropertyRelationIndex(units, leases),
    [leases, units]
  );

  const rows = useMemo(
    () =>
      buildPropertyPortfolioRows({
        properties,
        units,
        leases,
        tasks,
        collections,
        relationIndex,
      }),
    [collections, leases, properties, relationIndex, tasks, units]
  );

  const summary = useMemo(() => buildPropertyPortfolioSummary(rows), [rows]);

  const recentActivity = useMemo(
    () =>
      buildPropertyRecentActivity({
        rows,
        tasks,
        collections,
        relationIndex,
        locale,
      }),
    [collections, locale, relationIndex, rows, tasks]
  );

  const notifications = useMemo(
    () => buildPropertyNotifications({ rows, locale }),
    [locale, rows]
  );

  return {
    rows,
    summary,
    recentActivity,
    notifications,
  };
}
