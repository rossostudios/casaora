"use client";

import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/format";

import type { SummaryData } from "./collections-utils";

export function CollectionsSummary({
  summaries,
  isEn,
  locale,
}: {
  summaries: SummaryData;
  isEn: boolean;
  locale: string;
}) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from(summaries.byCurrency.entries()).map(([cur, s]) => (
        <StatCard
          helper={
            s.overdue > 0
              ? `${isEn ? "Overdue" : "Vencido"}: ${formatCurrency(s.overdue, cur, locale)}`
              : isEn
                ? "No overdue"
                : "Sin vencidos"
          }
          key={`outstanding-${cur}`}
          label={`${isEn ? "Outstanding" : "Pendiente"} (${cur})`}
          value={formatCurrency(s.outstanding, cur, locale)}
        />
      ))}
      {Array.from(summaries.byCurrency.entries()).map(([cur, s]) => (
        <StatCard
          key={`collected-${cur}`}
          label={`${isEn ? "Collected this month" : "Cobrado este mes"} (${cur})`}
          value={formatCurrency(s.collectedThisMonth, cur, locale)}
        />
      ))}
      <StatCard
        helper={`${summaries.paidThisMonth}/${summaries.totalThisMonth} ${isEn ? "this month" : "este mes"}`}
        label={isEn ? "Collection rate" : "Tasa de cobro"}
        value={`${(summaries.collectionRate * 100).toFixed(1)}%`}
      />
    </section>
  );
}
