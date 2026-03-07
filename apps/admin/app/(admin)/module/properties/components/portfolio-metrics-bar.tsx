"use client";

import { motion } from "motion/react";
import type { TwinSummary } from "@/app/(admin)/module/properties/hooks/use-batch-property-twins";
import type { PropertyPortfolioSummary } from "@/lib/features/properties/types";
import { formatCompactCurrency } from "@/lib/format";
import { EASING } from "@/lib/module-helpers";
import { cn } from "@/lib/utils";

type PortfolioMetricsBarProps = {
  summary: PropertyPortfolioSummary;
  isEn: boolean;
  formatLocale: string;
  twinSummary?: TwinSummary | null;
  aiInterventionCount?: number;
};

export function PortfolioMetricsBar({
  summary,
  isEn,
  formatLocale,
  twinSummary,
  aiInterventionCount,
}: PortfolioMetricsBarProps) {
  const occupancyPct = Math.round(summary.averageOccupancy);
  const hasHealth = twinSummary != null;
  const healthScore = twinSummary?.avgHealthScore ?? 0;
  const interventions = aiInterventionCount ?? 0;
  const attentionCount =
    summary.totalOpenTasks + summary.totalOverdueCollections;

  const metrics: Array<{
    label: string;
    value: string;
    tone: "default" | "success" | "warning" | "danger";
  }> = [
    {
      label: isEn ? "Revenue" : "Ingresos",
      value: formatCompactCurrency(
        summary.totalRevenueMtdPyg,
        "PYG",
        formatLocale
      ).replace(/PYG\s?/, "₲"),
      tone: "default",
    },
    {
      label: isEn ? "Occupancy" : "Ocupación",
      value: `${occupancyPct}%`,
      tone:
        occupancyPct >= 80
          ? "success"
          : occupancyPct >= 50
            ? "warning"
            : "danger",
    },
    {
      label: isEn ? "Units" : "Unidades",
      value: `${summary.totalActiveLeases}/${summary.totalUnits}`,
      tone: "default",
    },
    hasHealth
      ? {
          label: isEn ? "Health" : "Salud",
          value: `${healthScore}`,
          tone:
            healthScore >= 75
              ? "success"
              : healthScore >= 50
                ? "warning"
                : "danger",
        }
      : {
          label: isEn ? "Attention" : "Atención",
          value: `${attentionCount}`,
          tone: attentionCount > 0 ? "danger" : "default",
        },
    ...(hasHealth
      ? [
          {
            label: isEn ? "AI Actions" : "Acciones IA",
            value: `${interventions}`,
            tone: "default" as const,
          },
        ]
      : []),
  ];

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="flex flex-wrap items-center gap-x-5 gap-y-1"
      initial={{ opacity: 0 }}
      transition={{ delay: 0.06, duration: 0.3, ease: EASING }}
    >
      {metrics.map((m, i) => (
        <div className="flex items-baseline gap-1.5" key={m.label}>
          {i > 0 && (
            <span className="text-border/40 text-xs" aria-hidden>
              ·
            </span>
          )}
          <span className="text-[11px] text-muted-foreground/40">
            {m.label}
          </span>
          <span
            className={cn(
              "text-[13px] font-medium tabular-nums",
              m.tone === "success" && "text-emerald-600 dark:text-emerald-400",
              m.tone === "warning" && "text-amber-600 dark:text-amber-400",
              m.tone === "danger" && "text-red-600 dark:text-red-400",
              m.tone === "default" && "text-foreground/80"
            )}
          >
            {m.value}
          </span>
        </div>
      ))}
    </motion.div>
  );
}
