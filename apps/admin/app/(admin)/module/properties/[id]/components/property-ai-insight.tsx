"use client";

import { Alert02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatCompactCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PropertyOverview, TwinData } from "../types";

const PYG_RE = /PYG\s?/;

type PropertyAiInsightProps = {
  orgId: string;
  propertyId: string;
  propertyName: string;
  overview: PropertyOverview;
  isEn: boolean;
  locale: "en-US" | "es-PY";
};

/* ── health score helpers ── */

function healthColor(score: number): string {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function healthBg(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function severityBadge(severity: string): string {
  switch (severity) {
    case "critical":
      return "border-red-500/30 bg-red-500/10 text-red-600";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-600";
    default:
      return "border-border/40 bg-muted/30 text-muted-foreground";
  }
}

/* ── deterministic insight generation ── */

type InsightResult = {
  message: string;
  actions: Array<{ label: string; href: string }>;
  ctaLabel: string;
  ctaHref: string;
  tone: "danger" | "warning" | "info" | "success";
};

function generateInsight(
  overview: PropertyOverview,
  propertyId: string,
  propertyName: string,
  healthScore: number | null,
  isEn: boolean,
  locale: "en-US" | "es-PY"
): InsightResult {
  const playgroundBase = `/module/agent-playground?property_id=${encodeURIComponent(propertyId)}&property_name=${encodeURIComponent(propertyName)}`;

  // Priority 1: Vacancy
  if (overview.vacantUnitCount > 0) {
    const vacancyCostLabel = formatCompactCurrency(
      overview.vacancyCostPyg,
      "PYG",
      locale
    ).replace(PYG_RE, "₲");
    return {
      message: isEn
        ? `${overview.vacantUnitCount} unit${overview.vacantUnitCount > 1 ? "s" : ""} vacant. Estimated vacancy cost: ${vacancyCostLabel}/mo.`
        : `${overview.vacantUnitCount} unidad${overview.vacantUnitCount > 1 ? "es" : ""} vacante${overview.vacantUnitCount > 1 ? "s" : ""}. Costo estimado de vacancia: ${vacancyCostLabel}/mes.`,
      actions: [
        {
          label: isEn ? "Adjust pricing" : "Ajustar precios",
          href: `${playgroundBase}&agent=dynamic-pricing`,
        },
        {
          label: isEn ? "Promote units" : "Promover unidades",
          href: `/module/listings?property_id=${encodeURIComponent(propertyId)}`,
        },
      ],
      ctaLabel: isEn ? "Run pricing analysis" : "Analizar precios",
      ctaHref: `${playgroundBase}&agent=dynamic-pricing`,
      tone: "warning",
    };
  }

  // Priority 2: Overdue collections
  if (overview.overdueCollectionCount > 0) {
    const overdueLabel = formatCompactCurrency(
      overview.overdueCollectionAmountPyg,
      "PYG",
      locale
    ).replace(PYG_RE, "₲");
    return {
      message: isEn
        ? `${overview.overdueCollectionCount} overdue collection${overview.overdueCollectionCount > 1 ? "s" : ""} totaling ${overdueLabel}.`
        : `${overview.overdueCollectionCount} cobro${overview.overdueCollectionCount > 1 ? "s" : ""} vencido${overview.overdueCollectionCount > 1 ? "s" : ""} por ${overdueLabel}.`,
      actions: [
        {
          label: isEn ? "Send reminders" : "Enviar recordatorios",
          href: `${playgroundBase}&agent=guest-concierge`,
        },
        {
          label: isEn ? "Review delinquent" : "Revisar morosos",
          href: `/module/collections?property_id=${encodeURIComponent(propertyId)}&status=late`,
        },
      ],
      ctaLabel: isEn ? "Review collections" : "Revisar cobros",
      ctaHref: `/module/collections?property_id=${encodeURIComponent(propertyId)}`,
      tone: "danger",
    };
  }

  // Priority 3: Maintenance
  if (overview.openTaskCount > 0) {
    return {
      message: isEn
        ? `${overview.openTaskCount} pending maintenance item${overview.openTaskCount > 1 ? "s" : ""}${overview.urgentTaskCount > 0 ? `, ${overview.urgentTaskCount} urgent` : ""}.`
        : `${overview.openTaskCount} tarea${overview.openTaskCount > 1 ? "s" : ""} de mantenimiento pendiente${overview.openTaskCount > 1 ? "s" : ""}${overview.urgentTaskCount > 0 ? `, ${overview.urgentTaskCount} urgente${overview.urgentTaskCount > 1 ? "s" : ""}` : ""}.`,
      actions: [
        {
          label: isEn ? "Review queue" : "Revisar cola",
          href: `/module/maintenance?property_id=${encodeURIComponent(propertyId)}`,
        },
        {
          label: isEn ? "Auto-assign" : "Auto-asignar",
          href: `${playgroundBase}&agent=maintenance-coordinator`,
        },
      ],
      ctaLabel: isEn ? "Triage maintenance" : "Priorizar mantenimiento",
      ctaHref: `${playgroundBase}&agent=maintenance-coordinator`,
      tone: overview.urgentTaskCount > 0 ? "danger" : "warning",
    };
  }

  // Priority 4: Lease renewals
  if (overview.leasesExpiringSoon.length > 0) {
    return {
      message: isEn
        ? `${overview.leasesExpiringSoon.length} lease${overview.leasesExpiringSoon.length > 1 ? "s" : ""} expiring in the next 90 days.`
        : `${overview.leasesExpiringSoon.length} contrato${overview.leasesExpiringSoon.length > 1 ? "s" : ""} por vencer en los próximos 90 días.`,
      actions: [
        {
          label: isEn ? "Send renewal notices" : "Enviar avisos",
          href: `${playgroundBase}&agent=guest-concierge`,
        },
        {
          label: isEn ? "Review terms" : "Revisar términos",
          href: `/module/leases?property_id=${encodeURIComponent(propertyId)}`,
        },
      ],
      ctaLabel: isEn ? "Manage renewals" : "Gestionar renovaciones",
      ctaHref: `/module/leases?property_id=${encodeURIComponent(propertyId)}`,
      tone: "info",
    };
  }

  // Priority 5: Stable
  const scoreLabel =
    healthScore !== null ? ` ${isEn ? "Health score" : "Salud"}: ${healthScore}/100.` : "";
  return {
    message: isEn
      ? `Property operating normally.${scoreLabel}`
      : `Propiedad operando con normalidad.${scoreLabel}`,
    actions: [
      {
        label: isEn ? "Run analysis" : "Ejecutar análisis",
        href: `${playgroundBase}&agent=guest-concierge`,
      },
      {
        label: isEn ? "View report" : "Ver reporte",
        href: `/module/reports?property_id=${encodeURIComponent(propertyId)}`,
      },
    ],
    ctaLabel: isEn ? "Open playground" : "Abrir playground",
    ctaHref: playgroundBase,
    tone: "success",
  };
}

/* ── component ── */

export function PropertyAiInsight({
  orgId,
  propertyId,
  propertyName,
  overview,
  isEn,
  locale,
}: PropertyAiInsightProps) {
  const { data: twin } = useQuery<TwinData>({
    queryKey: ["property-twin", orgId, propertyId],
    queryFn: async () => {
      const res = await fetch(
        `/api/proxy/properties/${encodeURIComponent(propertyId)}/twin?org_id=${encodeURIComponent(orgId)}`,
        { cache: "no-store", headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error("Failed to fetch twin");
      return res.json() as Promise<TwinData>;
    },
    staleTime: 60_000,
    enabled: !!orgId && !!propertyId,
    retry: false,
  });

  const healthScore =
    twin && !twin.error ? Math.round(twin.health_score) : null;
  const riskFlags = twin?.risk_flags ?? [];

  const insight = generateInsight(
    overview,
    propertyId,
    propertyName,
    healthScore,
    isEn,
    locale
  );

  const toneAccent =
    insight.tone === "danger"
      ? "border-l-red-500"
      : insight.tone === "warning"
        ? "border-l-amber-500"
        : insight.tone === "success"
          ? "border-l-emerald-500"
          : "border-l-blue-500";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/40 bg-card",
        "border-l-2",
        toneAccent
      )}
    >
      <div className="flex items-start gap-4 p-5">
        {/* Health score circle */}
        {healthScore !== null ? (
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <svg
              className="h-12 w-12 -rotate-90"
              role="img"
              viewBox="0 0 48 48"
            >
              <title>Health score</title>
              <circle
                className="stroke-muted/30"
                cx="24"
                cy="24"
                fill="none"
                r="20"
                strokeWidth="4"
              />
              <circle
                className={cn(
                  "transition-all duration-700",
                  healthBg(healthScore)
                )}
                cx="24"
                cy="24"
                fill="none"
                r="20"
                stroke="currentColor"
                strokeDasharray={`${(healthScore / 100) * 125.6} 125.6`}
                strokeLinecap="round"
                strokeWidth="4"
              />
            </svg>
            <span
              className={cn(
                "absolute font-bold text-sm tabular-nums",
                healthColor(healthScore)
              )}
            >
              {healthScore}
            </span>
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-casaora-gradient text-white shadow-casaora">
            <Icon className="h-5 w-5" icon={SparklesIcon} />
          </div>
        )}

        {/* Insight content */}
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-medium text-foreground text-sm leading-relaxed">
              {insight.message}
            </p>
          </div>

          {/* Action pills */}
          <div className="flex flex-wrap items-center gap-2">
            {insight.actions.map((action) => (
              <Link
                className="rounded-full border border-border/30 bg-muted/20 px-3 py-1 font-medium text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                href={action.href}
                key={action.label}
              >
                {action.label}
              </Link>
            ))}
          </div>

          {/* Risk flags */}
          {riskFlags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Icon
                className="h-3 w-3 text-amber-500"
                icon={Alert02Icon}
              />
              {riskFlags.map((flag) => (
                <Badge
                  className={cn("text-[10px]", severityBadge(flag.severity))}
                  key={flag.type}
                  variant="outline"
                >
                  {flag.detail}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          className="shrink-0 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 font-medium text-xs text-foreground transition-colors hover:bg-muted/50"
          href={insight.ctaHref}
        >
          {insight.ctaLabel}
        </Link>
      </div>
    </div>
  );
}
