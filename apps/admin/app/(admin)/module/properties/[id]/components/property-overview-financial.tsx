import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, humanizeKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PropertyOverview as PropertyOverviewData } from "../types";
import { isUuid } from "./property-overview-utils";

type PropertyOverviewFinancialProps = {
  overview: PropertyOverviewData;
  recordId: string;
  locale: "en-US" | "es-PY";
  isEn: boolean;
};

const EXPENSE_COLORS = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-red-500",
  "bg-sky-500",
  "bg-pink-500",
  "bg-indigo-500",
];

const AMBIENT_EN = [
  "Checking vacancy risk",
  "Monitoring competitor pricing",
  "Scanning maintenance signals",
];

const AMBIENT_ES = [
  "Analizando riesgo de vacantes",
  "Monitoreando precios competidores",
  "Escaneando señales de mantenimiento",
];

export function PropertyOverviewFinancial({
  overview,
  recordId,
  locale,
  isEn,
}: PropertyOverviewFinancialProps) {
  const hasIncome = overview.monthIncomePyg > 0;
  const expenseRatio = hasIncome
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round((overview.monthExpensePyg / overview.monthIncomePyg) * 100)
        )
      )
    : 0;
  const occupancyValue = Math.max(
    0,
    Math.min(overview.occupancyRate ?? 0, 100)
  );
  const netIncomePositive = overview.monthNetIncomePyg >= 0;
  const latestStatementId = overview.latestStatement
    ? String(overview.latestStatement.id ?? "")
    : "";

  const collectionProgress =
    overview.projectedRentPyg > 0
      ? Math.round(
          (overview.collectedThisMonthPyg / overview.projectedRentPyg) * 100
        )
      : 0;

  const ambientLines = isEn ? AMBIENT_EN : AMBIENT_ES;

  return (
    <section className="space-y-8">
      {/* ---- Financial Pulse ---- */}
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em]">
            {isEn ? "Financial pulse" : "Pulso financiero"}
          </h3>
          <Link
            className={cn(
              buttonVariants({ size: "sm", variant: "ghost" }),
              "h-7 px-2 text-[11px] text-muted-foreground"
            )}
            href={`/module/reports?property_id=${encodeURIComponent(recordId)}`}
          >
            {isEn ? "Report" : "Reporte"}
          </Link>
        </div>

        <p className="text-muted-foreground/50 text-xs">
          {isEn
            ? `Snapshot for ${overview.monthLabel}`
            : `Resumen de ${overview.monthLabel}`}
        </p>

        {/* Net income — flat, no card */}
        <div className="space-y-1">
          <p className="font-semibold text-[10px] text-muted-foreground/60 uppercase tracking-[0.1em]">
            {isEn ? "Net income" : "Ingreso neto"}
          </p>
          <p className="font-bold text-2xl tabular-nums tracking-tight">
            {formatCurrency(overview.monthNetIncomePyg, "PYG", locale)}
          </p>
          <p
            className={cn(
              "text-xs",
              netIncomePositive
                ? "text-[var(--status-success-fg)]"
                : "text-[var(--status-danger-fg)]"
            )}
          >
            {netIncomePositive
              ? isEn
                ? "Positive month-to-date margin"
                : "Margen mensual positivo"
              : isEn
                ? "Expenses exceed collected income"
                : "Los gastos superan el ingreso cobrado"}
          </p>
        </div>

        {/* Income / Expenses */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
              {isEn ? "Income" : "Ingreso"}
            </p>
            <p className="font-semibold text-[var(--status-success-fg)] tabular-nums">
              {formatCurrency(overview.monthIncomePyg, "PYG", locale)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
              {isEn ? "Expenses" : "Gastos"}
            </p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(overview.monthExpensePyg, "PYG", locale)}
            </p>
          </div>
        </div>

        {/* Collected / Overdue */}
        {(overview.collectedThisMonthPyg > 0 ||
          overview.overdueCollectionAmountPyg > 0) && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                {isEn ? "Collected" : "Cobrado"}
              </p>
              <p className="font-semibold text-[var(--status-success-fg)] text-sm tabular-nums">
                {formatCurrency(overview.collectedThisMonthPyg, "PYG", locale)}
              </p>
            </div>
            <div className="space-y-0.5">
              <p
                className={cn(
                  "text-[10px] uppercase tracking-wide",
                  overview.overdueCollectionAmountPyg > 0
                    ? "text-[var(--status-danger-fg)]"
                    : "text-muted-foreground/60"
                )}
              >
                {isEn ? "Overdue" : "Vencido"}
                {overview.overdueCollectionCount > 0
                  ? ` (${overview.overdueCollectionCount})`
                  : ""}
              </p>
              <p
                className={cn(
                  "font-semibold text-sm tabular-nums",
                  overview.overdueCollectionAmountPyg > 0
                    ? "text-[var(--status-danger-fg)]"
                    : ""
                )}
              >
                {formatCurrency(
                  overview.overdueCollectionAmountPyg,
                  "PYG",
                  locale
                )}
              </p>
            </div>
          </div>
        )}

        <div className="h-px bg-border/15" />

        {/* Ratios — flat rows with spacing */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground/60">
              {isEn ? "Occupancy" : "Ocupación"}
            </span>
            <span
              className={cn(
                "font-semibold text-[13px] tabular-nums",
                occupancyValue >= 80
                  ? "text-[var(--status-success-fg)]"
                  : occupancyValue >= 50
                    ? "text-[var(--status-warning-fg)]"
                    : "text-[var(--status-danger-fg)]"
              )}
            >
              {occupancyValue}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground/60">
              {isEn ? "Expense ratio" : "Ratio de gasto"}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[13px] tabular-nums">
                {hasIncome ? `${expenseRatio}%` : "-"}
              </span>
              {hasIncome && expenseRatio > 50 && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  {isEn ? "High" : "Alto"}
                </span>
              )}
            </div>
          </div>
          {overview.projectedRentPyg > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground/60">
                {isEn ? "Collection progress" : "Progreso de cobro"}
              </span>
              <span
                className={cn(
                  "font-semibold text-[13px] tabular-nums",
                  collectionProgress >= 80
                    ? "text-[var(--status-success-fg)]"
                    : collectionProgress >= 50
                      ? "text-[var(--status-warning-fg)]"
                      : "text-[var(--status-danger-fg)]"
                )}
              >
                {collectionProgress}%
              </span>
            </div>
          )}
        </div>

        {/* Mini expense bar */}
        {overview.expenseCategoryBreakdown.length > 0 &&
          overview.monthExpensePyg > 0 && (
            <>
              <div className="h-px bg-border/15" />
              <div className="space-y-2">
                <h4 className="text-[10px] text-muted-foreground/50 uppercase tracking-wide">
                  {isEn ? "Expense breakdown" : "Desglose de gastos"}
                </h4>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-muted/20">
                  {overview.expenseCategoryBreakdown.map((row, i) => {
                    const pct = Math.max(
                      1,
                      Math.round(
                        (row.amount / overview.monthExpensePyg) * 100
                      )
                    );
                    return (
                      <div
                        className={cn(
                          "h-full",
                          EXPENSE_COLORS[i % EXPENSE_COLORS.length]
                        )}
                        key={row.category}
                        style={{ width: `${pct}%` }}
                        title={`${humanizeKey(row.category)}: ${pct}%`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {overview.expenseCategoryBreakdown.map((row, i) => (
                    <div className="flex items-center gap-1" key={row.category}>
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          EXPENSE_COLORS[i % EXPENSE_COLORS.length]
                        )}
                      />
                      <span className="text-[10px] text-muted-foreground/50">
                        {humanizeKey(row.category)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        {/* Latest statement */}
        {overview.latestStatement ? (
          <>
            <div className="h-px bg-border/15" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wide">
                  {isEn
                    ? "Latest owner statement"
                    : "Último estado del propietario"}
                </p>
                <p className="mt-0.5 font-medium text-sm tabular-nums">
                  {formatCurrency(
                    Number(overview.latestStatement.net_payout ?? 0),
                    String(overview.latestStatement.currency ?? "PYG"),
                    locale
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge
                  value={String(overview.latestStatement.status ?? "unknown")}
                />
                {latestStatementId && isUuid(latestStatementId) ? (
                  <Link
                    className="text-primary text-xs hover:underline"
                    href={`/module/owner-statements/${latestStatementId}`}
                  >
                    {isEn ? "Open" : "Abrir"}
                  </Link>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* ---- AI Monitoring ---- */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em]">
          {isEn ? "AI Monitoring" : "Monitoreo IA"}
        </h3>
        <div className="space-y-2">
          {ambientLines.map((line) => (
            <div
              className="flex items-center gap-2 text-xs text-muted-foreground/40"
              key={line}
            >
              <span className="gentle-pulse h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--agentic-cyan)]" />
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Urgent Attention ---- */}
      {overview.attentionItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em]">
            {isEn ? "Urgent attention" : "Atención urgente"}
          </h3>
          <div className="space-y-2">
            {overview.attentionItems.map((item) => {
              const borderColor =
                item.tone === "danger"
                  ? "border-l-[var(--status-danger-fg)]"
                  : item.tone === "warning"
                    ? "border-l-[var(--status-warning-fg)]"
                    : "border-l-[var(--status-info-fg)]";
              return (
                <article
                  className={cn(
                    "rounded-lg border-l-2 py-2.5 pr-3 pl-3",
                    borderColor
                  )}
                  key={item.id}
                >
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="mt-0.5 text-muted-foreground/60 text-xs">
                    {item.detail}
                  </p>
                  <Link
                    className={cn(
                      buttonVariants({ size: "sm", variant: "ghost" }),
                      "mt-1.5 h-6 px-2 text-[11px]"
                    )}
                    href={item.href}
                  >
                    {item.ctaLabel}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Lease Renewals ---- */}
      {overview.leasesExpiringSoon.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em]">
            {isEn ? "Lease renewals" : "Renovaciones de contrato"}
          </h3>
          <div className="space-y-1">
            {overview.leasesExpiringSoon.map((lease) => {
              const urgencyColor =
                lease.daysLeft <= 30
                  ? "text-[var(--status-danger-fg)]"
                  : lease.daysLeft <= 60
                    ? "text-[var(--status-warning-fg)]"
                    : "text-muted-foreground";
              return (
                <div
                  className="flex items-center justify-between gap-3 py-1.5"
                  key={lease.leaseId}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px]">
                      {lease.tenantName}
                    </p>
                    <p className="text-muted-foreground/50 text-[11px]">
                      {lease.unitLabel}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-medium text-[11px] tabular-nums",
                      urgencyColor
                    )}
                  >
                    {lease.daysLeft}d
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
