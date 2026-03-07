import { formatCompactCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PropertyOverview as PropertyOverviewData } from "../types";

type PropertyOverviewKpiCardsProps = {
  overview: PropertyOverviewData;
  locale: "en-US" | "es-PY";
  isEn: boolean;
};

/* ---------- threshold color helpers ---------- */

function occupancyColor(rate: number | null) {
  if (rate === null) return "text-foreground";
  if (rate >= 80) return "text-[var(--status-success-fg)]";
  if (rate >= 50) return "text-[var(--status-warning-fg)]";
  return "text-[var(--status-danger-fg)]";
}

/* ---------- KPI metric row ---------- */

function KpiMetric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="font-semibold text-[10px] text-muted-foreground/60 uppercase tracking-[0.1em]">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">{children}</div>
    </div>
  );
}

/* ---------- main component ---------- */

export function PropertyOverviewKpiCards({
  overview,
  locale,
  isEn,
}: PropertyOverviewKpiCardsProps) {
  const oRate = overview.occupancyRate;

  const taskColor =
    overview.openTaskCount > 0 ? "text-[var(--status-warning-fg)]" : "";

  const collectionColor =
    overview.overdueCollectionCount > 0
      ? "text-[var(--status-danger-fg)]"
      : overview.openCollectionCount > 0
        ? "text-[var(--status-warning-fg)]"
        : "";

  const netIncomePositive = overview.monthNetIncomePyg >= 0;

  return (
    <div className="space-y-6">
      {/* ── Performance ── */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em]">
          {isEn ? "Performance" : "Rendimiento"}
        </h3>
        <div className="flex gap-8">
          <KpiMetric label={isEn ? "Occupancy" : "Ocupación"}>
            <span
              className={cn(
                "font-bold text-2xl tabular-nums tracking-tight",
                occupancyColor(oRate)
              )}
            >
              {oRate !== null ? `${oRate}%` : "-"}
            </span>
            {overview.vacantUnitCount > 0 && (
              <span
                className={cn(
                  "text-xs",
                  oRate !== null && oRate < 50
                    ? "text-[var(--status-danger-fg)]"
                    : "text-muted-foreground/60"
                )}
              >
                {overview.vacantUnitCount} {isEn ? "vacant" : "vacantes"}
              </span>
            )}
          </KpiMetric>

          <KpiMetric label={isEn ? "Monthly Rent" : "Renta Mensual"}>
            <span className="font-bold text-2xl tabular-nums tracking-tight">
              {formatCompactCurrency(overview.projectedRentPyg, "PYG", locale)}
            </span>
            {overview.collectionRate !== null && (
              <span
                className={cn(
                  "text-xs",
                  overview.collectionRate >= 80
                    ? "text-[var(--status-success-fg)]"
                    : overview.collectionRate >= 50
                      ? "text-[var(--status-warning-fg)]"
                      : "text-[var(--status-danger-fg)]"
                )}
              >
                {overview.collectionRate}% {isEn ? "collected" : "cobrado"}
              </span>
            )}
          </KpiMetric>

          <KpiMetric label={isEn ? "Net Income" : "Ingreso Neto"}>
            <span
              className={cn(
                "font-bold text-2xl tabular-nums tracking-tight",
                netIncomePositive
                  ? "text-[var(--status-success-fg)]"
                  : "text-[var(--status-danger-fg)]"
              )}
            >
              {formatCompactCurrency(
                overview.monthNetIncomePyg,
                "PYG",
                locale
              )}
            </span>
            <span
              className={cn(
                "text-xs",
                netIncomePositive
                  ? "text-[var(--status-success-fg)]"
                  : "text-[var(--status-danger-fg)]"
              )}
            >
              {netIncomePositive
                ? isEn
                  ? "Positive margin"
                  : "Margen positivo"
                : isEn
                  ? "Negative margin"
                  : "Margen negativo"}
            </span>
          </KpiMetric>
        </div>
      </div>

      <div className="h-px bg-border/20" />

      {/* ── Operations ── */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em]">
          {isEn ? "Operations" : "Operaciones"}
        </h3>
        <div className="flex gap-8">
          <KpiMetric label={isEn ? "Open Tasks" : "Tareas Abiertas"}>
            <span
              className={cn(
                "font-bold text-2xl tabular-nums tracking-tight",
                taskColor
              )}
            >
              {overview.openTaskCount}
            </span>
            {overview.urgentTaskCount > 0 && (
              <span className="text-[var(--status-danger-fg)] text-xs">
                {overview.urgentTaskCount} {isEn ? "urgent" : "urgentes"}
              </span>
            )}
          </KpiMetric>

          <KpiMetric label={isEn ? "Active Leases" : "Contratos Activos"}>
            <span className="font-bold text-2xl tabular-nums tracking-tight">
              {overview.activeLeaseCount}
            </span>
            {overview.activeReservationCount > 0 && (
              <span className="text-muted-foreground/60 text-xs">
                +{overview.activeReservationCount}{" "}
                {isEn ? "reservations" : "reservas"}
              </span>
            )}
          </KpiMetric>

          <KpiMetric label={isEn ? "Collections" : "Cobros"}>
            <span
              className={cn(
                "font-bold text-2xl tabular-nums tracking-tight",
                collectionColor
              )}
            >
              {overview.openCollectionCount}
            </span>
            {overview.overdueCollectionCount > 0 && (
              <span className="text-[var(--status-danger-fg)] text-xs">
                {overview.overdueCollectionCount} {isEn ? "overdue" : "vencidos"}
              </span>
            )}
          </KpiMetric>
        </div>
      </div>
    </div>
  );
}
