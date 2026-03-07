"use client";

import { Cancel01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatCompactCurrency } from "@/lib/format";
import { EASING } from "@/lib/module-helpers";
import { cn } from "@/lib/utils";

type PricingRecommendation = {
  id: string;
  property_id: string;
  unit_id: string | null;
  property_name: string;
  unit_name: string | null;
  current_rate: number;
  recommended_rate: number;
  confidence: number;
  reasoning: string;
  revenue_impact_monthly: number;
  status: string;
};

type AiRecommendationsPanelProps = {
  orgId: string;
  isEn: boolean;
  formatLocale: string;
};

const PYG_RE = /PYG\s?/;

function confidenceTone(c: number): "success" | "warning" | "danger" {
  if (c >= 80) return "success";
  if (c >= 60) return "warning";
  return "danger";
}

export function AiRecommendationsPanel({
  orgId,
  isEn,
  formatLocale,
}: AiRecommendationsPanelProps) {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  const { data: recommendations } = useQuery<PricingRecommendation[]>({
    queryKey: ["pricing-recommendations", orgId],
    queryFn: async () => {
      const res = await fetch(
        `/api/proxy/pricing/recommendations?org_id=${encodeURIComponent(orgId)}&status=pending&limit=5`,
        { cache: "no-store", headers: { Accept: "application/json" } }
      );
      if (!res.ok) return [];
      const payload = await res.json();
      return (payload.data ?? payload) as PricingRecommendation[];
    },
    staleTime: 60_000,
    enabled: !!orgId,
    retry: false,
  });

  const handleDismissRec = useCallback(
    async (recId: string) => {
      await fetch(
        `/api/proxy/pricing/recommendations/${encodeURIComponent(recId)}/dismiss`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      ).catch(() => {});
      queryClient.invalidateQueries({
        queryKey: ["pricing-recommendations", orgId],
      });
    },
    [orgId, queryClient]
  );

  if (dismissed || !recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, ease: EASING }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className="text-[var(--agentic-lavender)]"
            icon={SparklesIcon}
            size={14}
          />
          <h3 className="font-bold text-[11px] text-muted-foreground/70 uppercase tracking-widest">
            {isEn ? "AI Recommendations" : "Recomendaciones IA"}
          </h3>
          <Badge
            className="border-border/40 bg-muted/30 text-[10px] text-muted-foreground"
            variant="outline"
          >
            {recommendations.length}
          </Badge>
        </div>
        <button
          aria-label={isEn ? "Dismiss" : "Cerrar"}
          className="rounded-lg p-1 text-muted-foreground/40 transition-colors hover:bg-muted/50 hover:text-muted-foreground"
          onClick={() => setDismissed(true)}
          type="button"
        >
          <Icon className="h-3.5 w-3.5" icon={Cancel01Icon} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {recommendations.map((rec, i) => {
          const pctChange = Math.round(
            ((rec.recommended_rate - rec.current_rate) / rec.current_rate) * 100
          );
          const isIncrease = pctChange > 0;
          const tone = confidenceTone(rec.confidence);

          return (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="glass-inner space-y-2.5 rounded-xl p-4"
              initial={{ opacity: 0, scale: 0.97 }}
              key={rec.id}
              transition={{
                delay: 0.05 + i * 0.04,
                duration: 0.3,
                ease: EASING,
              }}
            >
              <div className="space-y-1">
                <p className="truncate font-medium text-foreground text-xs">
                  {rec.property_name}
                  {rec.unit_name ? ` · ${rec.unit_name}` : ""}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-muted-foreground/60 text-xs tabular-nums line-through">
                    {formatCompactCurrency(
                      rec.current_rate,
                      "PYG",
                      formatLocale
                    ).replace(PYG_RE, "₲")}
                  </span>
                  <span className="font-semibold text-foreground text-sm tabular-nums">
                    {formatCompactCurrency(
                      rec.recommended_rate,
                      "PYG",
                      formatLocale
                    ).replace(PYG_RE, "₲")}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold tabular-nums",
                      isIncrease
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {isIncrease ? "+" : ""}
                    {pctChange}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "text-[10px]",
                    tone === "success" &&
                      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
                    tone === "warning" &&
                      "border-amber-500/30 bg-amber-500/10 text-amber-600",
                    tone === "danger" &&
                      "border-red-500/30 bg-red-500/10 text-red-600"
                  )}
                  variant="outline"
                >
                  {rec.confidence}%
                </Badge>
                {rec.revenue_impact_monthly !== 0 && (
                  <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                    {isIncrease ? "+" : ""}
                    {formatCompactCurrency(
                      rec.revenue_impact_monthly,
                      "PYG",
                      formatLocale
                    ).replace(PYG_RE, "₲")}
                    /mo
                  </span>
                )}
              </div>

              <p className="line-clamp-2 text-[11px] text-muted-foreground/60 leading-relaxed">
                {rec.reasoning}
              </p>

              <div className="flex items-center gap-2 pt-0.5">
                <Link
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  href={`/app/agents?prompt=${encodeURIComponent(
                    `Review pricing recommendation for ${rec.property_name}${rec.unit_name ? ` ${rec.unit_name}` : ""}: change rate from ${rec.current_rate} to ${rec.recommended_rate} PYG`
                  )}`}
                >
                  <Icon icon={SparklesIcon} size={10} />
                  {isEn ? "Review" : "Revisar"}
                </Link>
                <Button
                  className="h-auto p-0 text-[11px] text-muted-foreground/50 hover:text-muted-foreground"
                  onClick={() => handleDismissRec(rec.id)}
                  size="sm"
                  variant="link"
                >
                  {isEn ? "Dismiss" : "Descartar"}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
