"use client";

import {
  AiVoiceGeneratorIcon,
  DollarCircleIcon,
  Home01Icon,
  InformationCircleIcon,
  Invoice03Icon,
  SparklesIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo } from "react";

import { Icon } from "@/components/ui/icon";
import type { AgentApproval } from "@/lib/api";
import type {
  PropertyActivityItem,
  PropertyPortfolioRow,
} from "@/lib/features/properties/types";
import { formatCompactCurrency, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const EASING = [0.22, 1, 0.36, 1] as const;

const STAGGER_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
} as const;

const STAGGER_VARIANTS_FAST = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
} as const;

const FADE_VARIANT = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: EASING },
  },
} as const;

const SLIDE_VARIANT = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: EASING },
  },
} as const;

type AgenticSidebarProps = {
  occupancyRate: number;
  avgRentPyg: number;
  totalRevenueMtdPyg: number;
  totalOverdueCollections: number;
  totalVacantUnits: number;
  vacancyCostPyg: number;
  recentActivity: PropertyActivityItem[];
  approvals: AgentApproval[];
  propertyRows: PropertyPortfolioRow[];
  isEn: boolean;
  formatLocale: "en-US" | "es-PY";
  orgId?: string;
  agentOnline: boolean;
};

/* ── helpers ── */

type WorkLogEntry = {
  id: string;
  text: string;
  time: string;
  type: "activity" | "approval-executed" | "approval-pending";
  timestamp: number;
};

function buildWorkLog(
  recentActivity: PropertyActivityItem[],
  approvals: AgentApproval[],
  propertyRows: PropertyPortfolioRow[],
  isEn: boolean
): WorkLogEntry[] {
  const propertyNameMap = new Map(propertyRows.map((r) => [r.id, r.name]));
  const entries: WorkLogEntry[] = [];

  for (const item of recentActivity) {
    let text: string;
    if (item.id.startsWith("task")) {
      text = isEn
        ? `Completed maintenance '${item.title}'`
        : `Completó mantenimiento '${item.title}'`;
    } else if (item.id.startsWith("collection")) {
      text = isEn
        ? `Reconciled payment · ${item.detail}`
        : `Concilió pago · ${item.detail}`;
    } else {
      text = item.title;
    }
    entries.push({
      id: item.id,
      text,
      time: formatRelativeTime(item.timestamp, isEn),
      type: "activity",
      timestamp: item.timestamp.getTime(),
    });
  }

  for (const approval of approvals.slice(0, 8)) {
    const toolLabel = approval.tool_name.replace(/_/g, " ");
    const agentLabel = approval.agent_slug;
    const isPending = approval.status === "pending";

    const args = approval.tool_args;
    const pid =
      (typeof args?.property_id === "string" && args.property_id) ||
      ((args?.data as Record<string, unknown> | undefined)?.property_id as
        | string
        | undefined) ||
      (args?.table === "properties" && typeof args.id === "string"
        ? args.id
        : null);
    const propName = pid ? propertyNameMap.get(pid) : undefined;
    const propSuffix = propName ? ` · ${propName}` : "";

    const text = isPending
      ? isEn
        ? `Needs your approval: ${toolLabel}${propSuffix}`
        : `Necesita tu aprobación: ${toolLabel}${propSuffix}`
      : isEn
        ? `Executed ${toolLabel} via ${agentLabel}${propSuffix}`
        : `Ejecutó ${toolLabel} vía ${agentLabel}${propSuffix}`;

    const ts = approval.executed_at ?? approval.created_at;

    entries.push({
      id: `approval-${approval.id}`,
      text,
      time: formatRelativeTime(ts, isEn),
      type: isPending ? "approval-pending" : "approval-executed",
      timestamp: new Date(ts).getTime(),
    });
  }

  entries.sort((a, b) => b.timestamp - a.timestamp);
  return entries.slice(0, 10);
}

/* ── Ambient status items shown when no real activity exists ── */
const AMBIENT_EN = [
  "Scanning vacancy risk",
  "Monitoring pricing signals",
  "Checking maintenance alerts",
];
const AMBIENT_ES = [
  "Analizando riesgo de vacantes",
  "Monitoreando señales de precio",
  "Revisando alertas de mantenimiento",
];

/* ── component ── */

export function AgenticSidebar({
  occupancyRate,
  avgRentPyg,
  totalRevenueMtdPyg,
  totalOverdueCollections,
  totalVacantUnits,
  vacancyCostPyg,
  recentActivity,
  approvals,
  propertyRows,
  isEn,
  formatLocale,
  orgId,
  agentOnline,
}: AgenticSidebarProps) {
  const hasAlerts = totalOverdueCollections > 0 || totalVacantUnits > 0;
  const workLog = useMemo(
    () => buildWorkLog(recentActivity, approvals, propertyRows, isEn),
    [recentActivity, approvals, propertyRows, isEn]
  );

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4">
        <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">
          {isEn ? "AI Workspace" : "Espacio IA"}
        </span>
        {agentOnline && (
          <span className="gentle-pulse inline-block h-1.5 w-1.5 rounded-full bg-[var(--agentic-cyan)]" />
        )}
      </div>

      {/* Portfolio — inline metrics, no card */}
      <div className="space-y-2.5 pb-4">
        <MetricRow
          label={isEn ? "Revenue MTD" : "Ingresos mes"}
          value={formatCompactCurrency(
            totalRevenueMtdPyg,
            "PYG",
            formatLocale
          )}
        />
        <MetricRow
          label={isEn ? "Occupancy" : "Ocupación"}
          tone={
            occupancyRate >= 80
              ? "success"
              : occupancyRate >= 50
                ? "warning"
                : "danger"
          }
          value={`${Math.round(occupancyRate)}%`}
        />
        <MetricRow
          label={isEn ? "Avg Rent" : "Alq. prom."}
          value={formatCompactCurrency(avgRentPyg, "PYG", formatLocale)}
        />
      </div>

      <div className="h-px bg-border/20" />

      {/* Insights — contextual alerts */}
      {hasAlerts && (
        <>
          <div className="space-y-2 py-4">
            <span className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
              {isEn ? "Insights" : "Perspectivas"}
            </span>

            {totalOverdueCollections > 0 && (
              <div className="flex items-start gap-2">
                <Icon
                  className="mt-0.5 shrink-0 text-[var(--agentic-rose-gold)]"
                  icon={Invoice03Icon}
                  size={13}
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-xs leading-snug text-foreground/80">
                    {isEn
                      ? `${totalOverdueCollections} overdue collection${totalOverdueCollections > 1 ? "s" : ""} found`
                      : `${totalOverdueCollections} cobro${totalOverdueCollections > 1 ? "s" : ""} vencido${totalOverdueCollections > 1 ? "s" : ""}`}
                  </p>
                  <Link
                    className="text-[11px] text-[var(--agentic-rose-gold)] hover:underline"
                    href={
                      orgId
                        ? "/module/agent-playground?agent=collections"
                        : "#"
                    }
                  >
                    {isEn ? "Draft reminders →" : "Redactar recordatorios →"}
                  </Link>
                </div>
              </div>
            )}

            {totalVacantUnits > 0 && (
              <div className="flex items-start gap-2">
                <Icon
                  className="mt-0.5 shrink-0 text-[var(--agentic-rose-gold)]"
                  icon={Home01Icon}
                  size={13}
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-xs leading-snug text-foreground/80">
                    {isEn
                      ? `${totalVacantUnits} vacant unit${totalVacantUnits > 1 ? "s" : ""} (~${formatCompactCurrency(vacancyCostPyg, "PYG", formatLocale)}/mo)`
                      : `${totalVacantUnits} unidad${totalVacantUnits > 1 ? "es" : ""} vacante${totalVacantUnits > 1 ? "s" : ""} (~${formatCompactCurrency(vacancyCostPyg, "PYG", formatLocale)}/mes)`}
                  </p>
                  <Link
                    className="text-[11px] text-[var(--agentic-rose-gold)] hover:underline"
                    href={
                      orgId
                        ? "/module/agent-playground?agent=dynamic-pricing"
                        : "#"
                    }
                  >
                    {isEn ? "Review pricing →" : "Revisar precios →"}
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-border/20" />
        </>
      )}

      {/* Work Log — dynamic activity or ambient status */}
      <div className="space-y-2 py-4">
        <span className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
          {isEn ? "Work Log" : "Actividad"}
        </span>

        {workLog.length === 0 ? (
          <motion.div
            animate="visible"
            className="space-y-1.5"
            initial="hidden"
            variants={STAGGER_VARIANTS}
          >
            {(isEn ? AMBIENT_EN : AMBIENT_ES).map((line) => (
              <motion.div
                className="flex items-center gap-2 text-xs text-muted-foreground/50"
                key={line}
                variants={FADE_VARIANT}
              >
                <span className="gentle-pulse h-1 w-1 rounded-full bg-[var(--agentic-cyan)]" />
                <span>{line}</span>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            animate="visible"
            className="space-y-1.5"
            initial="hidden"
            variants={STAGGER_VARIANTS_FAST}
          >
            {workLog.map((entry) => (
              <motion.div
                className="flex items-start gap-2 text-xs"
                key={entry.id}
                variants={SLIDE_VARIANT}
              >
                <Icon
                  className={cn(
                    "mt-0.5 shrink-0",
                    entry.type === "approval-pending"
                      ? "text-[var(--agentic-rose-gold)]"
                      : entry.type === "approval-executed"
                        ? "text-[var(--agentic-lavender)]"
                        : "text-muted-foreground/40"
                  )}
                  icon={
                    entry.type === "approval-pending" ||
                    entry.type === "approval-executed"
                      ? SparklesIcon
                      : entry.id.startsWith("task")
                        ? Task01Icon
                        : entry.id.startsWith("collection")
                          ? Invoice03Icon
                          : InformationCircleIcon
                  }
                  size={12}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "leading-snug",
                      entry.type === "approval-pending"
                        ? "text-[var(--agentic-rose-gold)]"
                        : "text-foreground/70"
                    )}
                  >
                    {entry.text}
                  </p>
                  <span className="text-[10px] text-muted-foreground/40">
                    {entry.time}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <div className="h-px bg-border/20" />

      {/* Quick Actions — text links, no heavy pills */}
      {orgId && (
        <div className="space-y-1.5 pt-4">
          <span className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
            {isEn ? "Quick Actions" : "Acciones rápidas"}
          </span>
          <div className="space-y-1">
            <ActionLink
              href="/module/agent-playground?agent=portfolio-advisor"
              icon={AiVoiceGeneratorIcon}
              label={isEn ? "Ask about vacancies" : "Preguntar vacantes"}
            />
            <ActionLink
              href="/module/agent-playground?agent=dynamic-pricing"
              icon={DollarCircleIcon}
              label={isEn ? "Run pricing analysis" : "Análisis de precios"}
            />
            <ActionLink
              href="/module/agent-playground?agent=maintenance-coordinator"
              icon={Task01Icon}
              label={isEn ? "Scan maintenance" : "Escanear mantenimiento"}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted-foreground/50">{label}</span>
      <span
        className={cn(
          "text-sm font-medium tabular-nums",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-600 dark:text-amber-400",
          tone === "danger" && "text-red-600 dark:text-red-400",
          !tone && "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: typeof SparklesIcon;
  label: string;
}) {
  return (
    <Link
      className="flex items-center gap-2 rounded-md px-1 py-1 text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
      href={href}
    >
      <Icon icon={icon} size={12} />
      <span>{label}</span>
    </Link>
  );
}
