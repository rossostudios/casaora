"use client";

import {
  Activity01Icon,
  Alert02Icon,
  Calendar02Icon,
  ChartLineData02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatCompactCurrency } from "@/lib/format";
import { EASING } from "@/lib/module-helpers";
import { cn } from "@/lib/utils";

const PYG_RE = /PYG\s?/;

type DigitalTwinPanelProps = {
  orgId: string;
  propertyId: string;
  isEn: boolean;
};

type TwinData = {
  health_score: number;
  occupancy_rate: number;
  avg_daily_rate: number;
  revenue_mtd: number;
  pending_maintenance: number;
  avg_review_score: number;
  guest_sentiment_score: number;
  risk_flags: Array<{
    type: string;
    severity: string;
    detail: string;
  }>;
  state_snapshot: Record<string, unknown>;
  refreshed_at: string;
  error?: string;
};

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

function MetricCard({
  icon,
  label,
  value,
  tone,
  delay,
}: {
  icon: typeof Activity01Icon;
  label: string;
  value: string;
  tone: "default" | "success" | "warning" | "danger";
  delay: number;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3"
      initial={{ opacity: 0, scale: 0.97 }}
      transition={{ delay, duration: 0.3, ease: EASING }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
        <Icon className="text-muted-foreground/70" icon={icon} size={18} />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "font-semibold text-lg tabular-nums leading-tight",
            tone === "success" && "text-emerald-600 dark:text-emerald-400",
            tone === "warning" && "text-amber-600 dark:text-amber-400",
            tone === "danger" && "text-red-600 dark:text-red-400",
            tone === "default" && "text-foreground"
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground/70 text-xs">{label}</p>
      </div>
    </motion.div>
  );
}

export function DigitalTwinPanel({
  orgId,
  propertyId,
  isEn,
}: DigitalTwinPanelProps) {
  const { data: twin, isLoading } = useQuery<TwinData>({
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

  if (isLoading) {
    return (
      <div className="glass-inner animate-pulse rounded-xl p-6">
        <div className="h-4 w-48 rounded bg-muted/50" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {["occ", "adr", "rev", "maint", "review", "sent"].map((k) => (
            <div className="h-16 rounded-xl bg-muted/30" key={k} />
          ))}
        </div>
      </div>
    );
  }

  if (!twin || twin.error) return null;

  const healthScore = Math.round(twin.health_score);
  const occRate = Math.round(twin.occupancy_rate);
  const adr = twin.avg_daily_rate;
  const revMtd = twin.revenue_mtd;
  const pendingMx = twin.pending_maintenance;
  const reviewScore = twin.avg_review_score;
  const riskFlags = twin.risk_flags ?? [];

  const refreshedAt = twin.refreshed_at
    ? new Date(twin.refreshed_at).toLocaleTimeString(isEn ? "en-US" : "es-PY", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const metrics = [
    {
      icon: Calendar02Icon,
      label: isEn ? "Occupancy" : "Ocupación",
      value: `${occRate}%`,
      tone: occRate >= 80 ? "success" : occRate >= 50 ? "warning" : "danger",
    },
    {
      icon: ChartLineData02Icon,
      label: isEn ? "ADR" : "Tarifa prom.",
      value: formatCompactCurrency(
        adr,
        "PYG",
        isEn ? "en-US" : "es-PY"
      ).replace(PYG_RE, "₲"),
      tone: "default" as const,
    },
    {
      icon: ChartLineData02Icon,
      label: isEn ? "Revenue MTD" : "Ingresos mes",
      value: formatCompactCurrency(
        revMtd,
        "PYG",
        isEn ? "en-US" : "es-PY"
      ).replace(PYG_RE, "₲"),
      tone: "default" as const,
    },
    {
      icon: Wrench01Icon,
      label: isEn ? "Pending Maint." : "Mant. pendiente",
      value: `${pendingMx}`,
      tone: pendingMx > 3 ? "danger" : pendingMx > 0 ? "warning" : "success",
    },
    {
      icon: CheckmarkCircle02Icon,
      label: isEn ? "Avg Review" : "Calif. prom.",
      value: reviewScore > 0 ? `${reviewScore.toFixed(1)}/5` : "—",
      tone:
        reviewScore >= 4
          ? "success"
          : reviewScore >= 3
            ? "warning"
            : reviewScore > 0
              ? "danger"
              : "default",
    },
    {
      icon: Activity01Icon,
      label: isEn ? "Sentiment" : "Sentimiento",
      value: `${Math.round(twin.guest_sentiment_score)}%`,
      tone:
        twin.guest_sentiment_score >= 70
          ? "success"
          : twin.guest_sentiment_score >= 50
            ? "warning"
            : "danger",
    },
  ] as const;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="glass-inner space-y-4 rounded-xl p-5"
      initial={{ opacity: 0, y: 8 }}
      transition={{ delay: 0.05, duration: 0.35, ease: EASING }}
    >
      {/* Header with health score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center">
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
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              {isEn ? "Property Health" : "Salud de propiedad"}
            </h3>
            <p className="text-muted-foreground/60 text-xs">
              {isEn ? "Digital Twin" : "Gemelo Digital"}
            </p>
          </div>
        </div>

        {refreshedAt && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
            <Icon className="h-3 w-3" icon={Clock01Icon} />
            <span>{refreshedAt}</span>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {metrics.map((m, i) => (
          <MetricCard
            delay={0.1 + i * 0.04}
            icon={m.icon}
            key={m.label}
            label={m.label}
            tone={m.tone as "default" | "success" | "warning" | "danger"}
            value={m.value}
          />
        ))}
      </div>

      {/* Risk Flags */}
      {riskFlags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-amber-500" icon={Alert02Icon} />
            <span className="font-medium text-foreground text-xs">
              {isEn ? "Risk Flags" : "Alertas de riesgo"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {riskFlags.map((flag) => (
              <Badge
                className={cn("text-[11px]", severityBadge(flag.severity))}
                key={flag.type}
                variant="outline"
              >
                {flag.detail}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
