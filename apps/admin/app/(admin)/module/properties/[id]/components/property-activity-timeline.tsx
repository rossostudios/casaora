"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";

import type { AgentApproval } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const EASING = [0.22, 1, 0.36, 1] as const;

const STAGGER_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
} as const;

const FADE_VARIANT = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: EASING },
  },
} as const;

const AMBIENT_EN = [
  "Monitoring property signals",
  "Scanning for optimization opportunities",
  "Watching market trends",
];

const AMBIENT_ES = [
  "Monitoreando señales de la propiedad",
  "Buscando oportunidades de optimización",
  "Observando tendencias del mercado",
];

type PropertyActivityTimelineProps = {
  orgId: string;
  propertyId: string;
  isEn: boolean;
};

function statusDotColor(status: AgentApproval["status"]): string {
  switch (status) {
    case "executed":
    case "approved":
      return "bg-emerald-500";
    case "rejected":
    case "execution_failed":
      return "bg-red-500";
    case "pending":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground/30";
  }
}

export function PropertyActivityTimeline({
  orgId,
  propertyId,
  isEn,
}: PropertyActivityTimelineProps) {
  const { data: approvals } = useQuery<AgentApproval[]>({
    queryKey: ["property-activity", orgId, propertyId],
    queryFn: async () => {
      const res = await fetch(
        `/api/agent/approvals?org_id=${encodeURIComponent(orgId)}`,
        { cache: "no-store", headers: { Accept: "application/json" } }
      );
      if (!res.ok) return [];
      const data = (await res.json()) as AgentApproval[];
      return data.filter(
        (a) =>
          a.tool_args &&
          String(a.tool_args.property_id ?? "") === propertyId
      );
    },
    staleTime: 60_000,
    enabled: !!orgId && !!propertyId,
    retry: false,
  });

  const hasActivity = approvals && approvals.length > 0;
  const ambientLines = isEn ? AMBIENT_EN : AMBIENT_ES;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em]">
        {isEn ? "Activity" : "Actividad"}
      </h3>

      {hasActivity ? (
        <div className="space-y-1">
          {approvals.slice(0, 5).map((approval) => (
            <div
              className="flex items-center justify-between gap-3 py-1.5"
              key={approval.id}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    statusDotColor(approval.status)
                  )}
                />
                <span className="truncate text-[13px] text-muted-foreground">
                  {approval.tool_name.replace(/_/g, " ")}
                </span>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground/40">
                {formatRelativeTime(approval.created_at, isEn)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          animate="visible"
          className="space-y-2"
          initial="hidden"
          variants={STAGGER_VARIANTS}
        >
          {ambientLines.map((line) => (
            <motion.div
              className="flex items-center gap-2 text-xs text-muted-foreground/40"
              key={line}
              variants={FADE_VARIANT}
            >
              <span className="gentle-pulse h-1 w-1 shrink-0 rounded-full bg-[var(--agentic-cyan)]" />
              <span>{line}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
