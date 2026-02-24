"use client";

import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  Database02Icon,
  Settings02Icon,
  SparklesIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

type ApprovalActivity = {
  agent_slug?: string | null;
  tool_name: string;
  status: string;
  created_at: string;
  reasoning?: string | null;
};

type PlanStats = {
  total?: number;
  completed?: number;
  failed?: number;
};

type MemoryHealth = {
  total?: number;
  high_importance?: number;
  avg_access_count?: number;
  stale_count?: number;
};

type Stats = {
  agents?: { total?: number; active?: number };
  approvals_24h?: {
    total?: number;
    pending?: number;
    approved?: number;
    rejected?: number;
  };
  memory_count?: number;
  recent_activity?: ApprovalActivity[];
  planning?: PlanStats;
  memory_health?: MemoryHealth;
};

type Props = {
  orgId: string;
  initialStats: Record<string, unknown>;
  locale: string;
};

function statusTone(s: string) {
  if (s === "approved") return "status-tone-success";
  if (s === "rejected") return "status-tone-danger";
  if (s === "pending") return "status-tone-warning";
  return "status-tone-neutral";
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function AgentDashboard({ initialStats, locale }: Props) {
  const isEn = locale === "en-US";
  const stats = initialStats as unknown as Stats;
  const agents = stats.agents ?? { total: 0, active: 0 };
  const approvals = stats.approvals_24h ?? {};
  const memoryCount = stats.memory_count ?? 0;
  const recentActivity = stats.recent_activity ?? [];
  const planning = stats.planning ?? {};
  const memoryHealth = stats.memory_health ?? {};

  const interventionRate =
    (approvals.total ?? 0) > 0
      ? ((approvals.rejected ?? 0) / (approvals.total ?? 1)) * 100
      : 0;

  const interventionHelper =
    (approvals.total ?? 0) > 0
      ? `${approvals.rejected ?? 0} ${isEn ? "rejected" : "rechazado"} / ${approvals.total} ${isEn ? "total" : "total"}`
      : isEn
        ? "No activity yet"
        : "Sin actividad aún";

  const planningSuccess =
    (planning.total ?? 0) > 0
      ? ((planning.completed ?? 0) / (planning.total ?? 1)) * 100
      : 0;

  const memoryHealthScore =
    (memoryHealth.total ?? 0) > 0
      ? Math.round(
          ((memoryHealth.high_importance ?? 0) / (memoryHealth.total ?? 1)) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={SparklesIcon}
          label={isEn ? "Active Agents" : "Agentes Activos"}
          value={`${agents.active}/${agents.total}`}
        />
        <StatCard
          helper={`${approvals.pending ?? 0} ${isEn ? "pending" : "pendiente"} · ${approvals.approved ?? 0} ${isEn ? "approved" : "aprobado"}`}
          icon={CheckmarkCircle02Icon}
          label={isEn ? "Approvals (24h)" : "Aprobaciones (24h)"}
          value={String(approvals.total ?? 0)}
        />
        <StatCard
          helper={interventionHelper}
          icon={AlertCircleIcon}
          label={isEn ? "Intervention Rate" : "Tasa de Intervención"}
          value={
            (approvals.total ?? 0) > 0 ? `${interventionRate.toFixed(0)}%` : "—"
          }
        />
        <StatCard
          icon={Database02Icon}
          label={isEn ? "Memories Stored" : "Memorias Almacenadas"}
          value={String(memoryCount)}
        />
        <StatCard
          helper={
            (planning.total ?? 0) > 0
              ? `${planning.completed ?? 0}/${planning.total} ${isEn ? "completed" : "completado"} · ${planning.failed ?? 0} ${isEn ? "failed" : "fallido"}`
              : isEn
                ? "No plans yet"
                : "Sin planes aún"
          }
          icon={Wrench01Icon}
          label={isEn ? "Planning Success" : "Éxito de Planificación"}
          value={
            (planning.total ?? 0) > 0 ? `${planningSuccess.toFixed(0)}%` : "—"
          }
        />
        <StatCard
          helper={
            (memoryHealth.total ?? 0) > 0
              ? `${memoryHealth.stale_count ?? 0} ${isEn ? "stale" : "inactivas"} · avg ${memoryHealth.avg_access_count?.toFixed(1) ?? 0} ${isEn ? "accesses" : "accesos"}`
              : isEn
                ? "No memories yet"
                : "Sin memorias aún"
          }
          icon={Settings02Icon}
          label={isEn ? "Memory Health" : "Salud de Memoria"}
          value={(memoryHealth.total ?? 0) > 0 ? `${memoryHealthScore}%` : "—"}
        />
      </div>

      {/* Recent Activity Feed */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">
          {isEn ? "Recent Agent Activity" : "Actividad Reciente de Agentes"}
        </h3>

        {recentActivity.length === 0 && (
          <div className="rounded-lg border border-border/50 py-12 text-center">
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "No agent activity recorded yet."
                : "No hay actividad de agentes registrada aún."}
            </p>
          </div>
        )}

        {recentActivity.length > 0 && (
          <div className="divide-y divide-border/40 overflow-hidden rounded-lg border border-border/50">
            {recentActivity.map((item, i) => (
              <div
                className="px-4 py-3 transition-colors hover:bg-muted/20"
                key={`${item.tool_name}-${item.created_at}-${i}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {item.agent_slug && (
                      <Badge
                        className="shrink-0 font-normal text-[10px]"
                        variant="secondary"
                      >
                        {item.agent_slug}
                      </Badge>
                    )}
                    <span className="truncate font-medium text-sm">
                      {item.tool_name.replace(/_/g, " ")}
                    </span>
                    <Badge
                      className={cn(
                        "shrink-0 text-[10px]",
                        statusTone(item.status)
                      )}
                      variant="outline"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {relativeTime(item.created_at)}
                  </span>
                </div>
                {item.reasoning && (
                  <p className="mt-1 line-clamp-1 text-muted-foreground text-xs">
                    {item.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
