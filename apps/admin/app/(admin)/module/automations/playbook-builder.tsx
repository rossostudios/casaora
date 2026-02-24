"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Playbook = {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_conditions: Record<string, unknown>;
  steps: {
    type: string;
    content?: string;
    tool_name?: string;
    args?: Record<string, unknown>;
  }[];
  agent_slug: string;
  is_active: boolean;
  last_run_at: string | null;
  run_count: number;
  avg_duration_ms: number | null;
  created_at: string;
};

type Props = {
  playbooks: Record<string, unknown>[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
function bool(v: unknown): boolean {
  return v === true;
}

function triggerColor(t: string): string {
  switch (t) {
    case "manual":
      return "bg-muted text-muted-foreground";
    case "schedule":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "event":
      return "bg-violet-500/10 text-violet-600 border-violet-200";
    case "threshold":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function relTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function PlaybookBuilder({ playbooks: rawPlaybooks }: Props) {
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const playbooks: Playbook[] = useMemo(() => {
    return rawPlaybooks
      .map((p) => ({
        id: str(p.id),
        name: str(p.name),
        description: str(p.description) || null,
        trigger_type: str(p.trigger_type) || "manual",
        trigger_conditions: (typeof p.trigger_conditions === "object" &&
        p.trigger_conditions !== null
          ? p.trigger_conditions
          : {}) as Record<string, unknown>,
        steps: Array.isArray(p.steps) ? (p.steps as Playbook["steps"]) : [],
        agent_slug: str(p.agent_slug) || "guest-concierge",
        is_active: bool(p.is_active),
        last_run_at: str(p.last_run_at) || null,
        run_count: num(p.run_count),
        avg_duration_ms:
          p.avg_duration_ms != null ? num(p.avg_duration_ms) : null,
        created_at: str(p.created_at),
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [rawPlaybooks]);

  const filtered = useMemo(() => {
    if (filter === "active") return playbooks.filter((p) => p.is_active);
    if (filter === "inactive") return playbooks.filter((p) => !p.is_active);
    return playbooks;
  }, [playbooks, filter]);

  const stats = useMemo(
    () => ({
      total: playbooks.length,
      active: playbooks.filter((p) => p.is_active).length,
      totalRuns: playbooks.reduce((s, p) => s + p.run_count, 0),
      byTrigger: {
        manual: playbooks.filter((p) => p.trigger_type === "manual").length,
        schedule: playbooks.filter((p) => p.trigger_type === "schedule").length,
        event: playbooks.filter((p) => p.trigger_type === "event").length,
        threshold: playbooks.filter((p) => p.trigger_type === "threshold")
          .length,
      },
    }),
    [playbooks]
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Playbooks</p>
          <p className="font-semibold text-2xl">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Active</p>
          <p className="font-semibold text-2xl text-emerald-600">
            {stats.active}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Total Runs</p>
          <p className="font-semibold text-2xl">{stats.totalRuns}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Scheduled</p>
          <p className="font-semibold text-2xl">{stats.byTrigger.schedule}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Event-triggered</p>
          <p className="font-semibold text-2xl">{stats.byTrigger.event}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "active", "inactive"] as const).map((f) => (
          <Button
            key={f}
            onClick={() => setFilter(f)}
            size="sm"
            variant={filter === f ? "default" : "outline"}
          >
            {f === "all"
              ? `All (${playbooks.length})`
              : f === "active"
                ? `Active (${stats.active})`
                : `Inactive (${stats.total - stats.active})`}
          </Button>
        ))}
      </div>

      {/* Playbook List */}
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground text-sm">
          No playbooks found. Create playbooks via the agent chat to automate
          multi-step workflows.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((pb) => (
            <div className="rounded-lg border bg-card" key={pb.id}>
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20"
                onClick={() => setExpanded(expanded === pb.id ? null : pb.id)}
                type="button"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${pb.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                />
                <span className="font-medium text-sm">{pb.name}</span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px] ${triggerColor(pb.trigger_type)}`}
                >
                  {pb.trigger_type}
                </span>
                <Badge className="text-[9px]" variant="outline">
                  {pb.agent_slug}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {pb.steps.length} steps
                </span>
                <span className="ml-auto text-muted-foreground text-xs">
                  {pb.run_count > 0 ? `${pb.run_count} runs` : "Never run"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {expanded === pb.id ? "▼" : "▶"}
                </span>
              </button>

              {expanded === pb.id && (
                <div className="space-y-3 border-t px-4 py-3">
                  {pb.description && (
                    <p className="text-muted-foreground text-sm">
                      {pb.description}
                    </p>
                  )}

                  {/* Trigger info */}
                  <div className="text-xs">
                    <span className="font-medium">Trigger: </span>
                    <span className="text-muted-foreground">
                      {pb.trigger_type === "manual"
                        ? "Run manually or via agent"
                        : pb.trigger_type === "schedule"
                          ? `Scheduled${pb.trigger_conditions.cron ? ` (${String(pb.trigger_conditions.cron)})` : ""}`
                          : pb.trigger_type === "event"
                            ? `On event: ${String(pb.trigger_conditions.event || "any")}`
                            : `Threshold: ${JSON.stringify(pb.trigger_conditions)}`}
                    </span>
                  </div>

                  {/* Steps */}
                  <div className="space-y-1">
                    <p className="font-medium text-xs">Steps:</p>
                    {pb.steps.map((step, i) => (
                      <div
                        className="flex items-center gap-2 rounded border bg-muted/10 px-3 py-1.5 text-xs"
                        key={`${step.type}-${i}`}
                      >
                        <span className="w-6 shrink-0 font-bold font-mono text-muted-foreground">
                          {i + 1}
                        </span>
                        <Badge className="text-[9px]" variant="outline">
                          {step.type}
                        </Badge>
                        <span className="truncate text-muted-foreground">
                          {step.type === "message"
                            ? step.content || "—"
                            : step.type === "tool"
                              ? `${step.tool_name || "unknown"}(${JSON.stringify(step.args || {}).slice(0, 60)})`
                              : JSON.stringify(step).slice(0, 80)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Execution stats */}
                  <div className="flex gap-4 text-muted-foreground text-xs">
                    <span>Runs: {pb.run_count}</span>
                    {pb.avg_duration_ms !== null && (
                      <span>Avg duration: {pb.avg_duration_ms}ms</span>
                    )}
                    {pb.last_run_at && (
                      <span>Last run: {relTime(pb.last_run_at)}</span>
                    )}
                    <span>
                      Created: {new Date(pb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
