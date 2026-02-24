"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Evaluation = {
  id: string;
  agent_slug: string;
  outcome_type: string;
  rating: number;
  accuracy_score: number | null;
  helpfulness_score: number | null;
  safety_score: number | null;
  latency_ms: number | null;
  cost_estimate: number | null;
  model_used: string | null;
  created_at: string;
};

type HealthMetric = {
  id: string;
  agent_slug: string;
  metric_date: string;
  total_chats: number;
  total_tool_calls: number;
  avg_latency_ms: number | null;
  error_rate: number;
  total_cost: number;
};

type Props = {
  evaluations: Record<string, unknown>[];
  healthMetrics: Record<string, unknown>[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

function outcomeColor(o: string): string {
  switch (o) {
    case "success":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    case "safety_concern":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "needs_improvement":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function ratingStars(rating: number): string {
  return "★".repeat(Math.min(rating, 5)) + "☆".repeat(Math.max(5 - rating, 0));
}

export function AgentHealth({
  evaluations: rawEvals,
  healthMetrics: rawMetrics,
}: Props) {
  const [tab, setTab] = useState<"summary" | "evaluations" | "daily">(
    "summary"
  );

  const evaluations: Evaluation[] = useMemo(() => {
    return rawEvals
      .map((e) => ({
        id: str(e.id),
        agent_slug: str(e.agent_slug) || "unknown",
        outcome_type: str(e.outcome_type) || "success",
        rating: num(e.rating),
        accuracy_score: e.accuracy_score != null ? num(e.accuracy_score) : null,
        helpfulness_score:
          e.helpfulness_score != null ? num(e.helpfulness_score) : null,
        safety_score: e.safety_score != null ? num(e.safety_score) : null,
        latency_ms: e.latency_ms != null ? num(e.latency_ms) : null,
        cost_estimate: e.cost_estimate != null ? num(e.cost_estimate) : null,
        model_used: str(e.model_used) || null,
        created_at: str(e.created_at),
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [rawEvals]);

  const healthMetrics: HealthMetric[] = useMemo(() => {
    return rawMetrics
      .map((m) => ({
        id: str(m.id),
        agent_slug: str(m.agent_slug),
        metric_date: str(m.metric_date),
        total_chats: num(m.total_chats),
        total_tool_calls: num(m.total_tool_calls),
        avg_latency_ms: m.avg_latency_ms != null ? num(m.avg_latency_ms) : null,
        error_rate: num(m.error_rate),
        total_cost: num(m.total_cost),
      }))
      .sort((a, b) => b.metric_date.localeCompare(a.metric_date));
  }, [rawMetrics]);

  // Per-agent summary
  const agentSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        success: number;
        avgAccuracy: number;
        avgHelpfulness: number;
        avgSafety: number;
        avgLatency: number;
        totalCost: number;
        avgRating: number;
      }
    >();
    for (const ev of evaluations) {
      const entry = map.get(ev.agent_slug) ?? {
        total: 0,
        success: 0,
        avgAccuracy: 0,
        avgHelpfulness: 0,
        avgSafety: 0,
        avgLatency: 0,
        totalCost: 0,
        avgRating: 0,
      };
      entry.total += 1;
      if (ev.outcome_type === "success") entry.success += 1;
      entry.avgAccuracy += ev.accuracy_score ?? 0;
      entry.avgHelpfulness += ev.helpfulness_score ?? 0;
      entry.avgSafety += ev.safety_score ?? 0;
      entry.avgLatency += ev.latency_ms ?? 0;
      entry.totalCost += ev.cost_estimate ?? 0;
      entry.avgRating += ev.rating;
      map.set(ev.agent_slug, entry);
    }
    return Array.from(map.entries())
      .map(([slug, s]) => ({
        slug,
        total: s.total,
        successRate: s.total > 0 ? (s.success / s.total) * 100 : 0,
        avgAccuracy: s.total > 0 ? (s.avgAccuracy / s.total) * 100 : 0,
        avgHelpfulness: s.total > 0 ? (s.avgHelpfulness / s.total) * 100 : 0,
        avgSafety: s.total > 0 ? (s.avgSafety / s.total) * 100 : 0,
        avgLatency: s.total > 0 ? Math.round(s.avgLatency / s.total) : 0,
        totalCost: s.totalCost,
        avgRating: s.total > 0 ? s.avgRating / s.total : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [evaluations]);

  const totalEvals = evaluations.length;
  const totalSuccess = evaluations.filter(
    (e) => e.outcome_type === "success"
  ).length;
  const totalCost = evaluations.reduce((s, e) => s + (e.cost_estimate ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Evaluations</p>
          <p className="font-semibold text-2xl">{totalEvals}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Success Rate</p>
          <p className="font-semibold text-2xl text-emerald-600">
            {totalEvals > 0
              ? `${((totalSuccess / totalEvals) * 100).toFixed(0)}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Agents</p>
          <p className="font-semibold text-2xl">{agentSummary.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Daily Metrics</p>
          <p className="font-semibold text-2xl">{healthMetrics.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Total Cost</p>
          <p className="font-mono font-semibold text-2xl">
            ${totalCost.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["summary", "evaluations", "daily"] as const).map((t) => (
          <Button
            key={t}
            onClick={() => setTab(t)}
            size="sm"
            variant={tab === t ? "default" : "outline"}
          >
            {t === "summary"
              ? "Agent Summary"
              : t === "evaluations"
                ? `Evaluations (${evaluations.length})`
                : `Daily (${healthMetrics.length})`}
          </Button>
        ))}
      </div>

      {/* Agent Summary */}
      {tab === "summary" &&
        (agentSummary.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            No agent evaluations recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {agentSummary.map((a) => (
              <div
                className="space-y-2 rounded-lg border bg-card p-4"
                key={a.slug}
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{a.slug}</Badge>
                  <span className="font-medium text-sm">
                    {a.total} evaluations
                  </span>
                  <span className="text-amber-600 text-xs">
                    {ratingStars(Math.round(a.avgRating))}
                  </span>
                  <span
                    className={`ml-auto font-medium text-sm ${a.successRate >= 80 ? "text-emerald-600" : a.successRate >= 60 ? "text-amber-600" : "text-red-600"}`}
                  >
                    {a.successRate.toFixed(0)}% success
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                  <div>
                    <span className="text-muted-foreground">Accuracy</span>
                    <p className="font-medium">{a.avgAccuracy.toFixed(0)}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Helpfulness</span>
                    <p className="font-medium">
                      {a.avgHelpfulness.toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Safety</span>
                    <p className="font-medium">{a.avgSafety.toFixed(0)}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Latency</span>
                    <p className="font-mono">{a.avgLatency}ms</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Cost</span>
                    <p className="font-mono">${a.totalCost.toFixed(4)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* Evaluations */}
      {tab === "evaluations" &&
        (evaluations.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            No evaluations recorded.
          </p>
        ) : (
          <div className="space-y-1">
            {evaluations.slice(0, 50).map((ev) => (
              <div
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-xs"
                key={ev.id}
              >
                <Badge className="text-[9px]" variant="outline">
                  {ev.agent_slug}
                </Badge>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px] ${outcomeColor(ev.outcome_type)}`}
                >
                  {ev.outcome_type}
                </span>
                <span className="text-amber-600">{ratingStars(ev.rating)}</span>
                {ev.accuracy_score !== null && (
                  <span className="text-muted-foreground">
                    acc:{(ev.accuracy_score * 100).toFixed(0)}%
                  </span>
                )}
                {ev.latency_ms !== null && (
                  <span className="font-mono text-muted-foreground">
                    {ev.latency_ms}ms
                  </span>
                )}
                {ev.cost_estimate !== null && (
                  <span className="font-mono text-muted-foreground">
                    ${ev.cost_estimate.toFixed(4)}
                  </span>
                )}
                <span className="ml-auto text-muted-foreground">
                  {new Date(ev.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ))}

      {/* Daily Metrics */}
      {tab === "daily" &&
        (healthMetrics.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            No daily metrics collected yet. Metrics are aggregated daily at
            11:30 UTC.
          </p>
        ) : (
          <div className="space-y-1">
            {healthMetrics.slice(0, 30).map((m) => (
              <div
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-xs"
                key={m.id}
              >
                <span className="w-24 shrink-0 font-medium font-mono">
                  {m.metric_date}
                </span>
                <Badge className="text-[9px]" variant="outline">
                  {m.agent_slug}
                </Badge>
                <span className="text-muted-foreground">
                  {m.total_chats} chats
                </span>
                <span className="text-muted-foreground">
                  {m.total_tool_calls} tools
                </span>
                {m.avg_latency_ms !== null && (
                  <span className="font-mono text-muted-foreground">
                    {m.avg_latency_ms}ms
                  </span>
                )}
                <span
                  className={`${m.error_rate > 0.1 ? "text-red-600" : "text-muted-foreground"}`}
                >
                  err:{(m.error_rate * 100).toFixed(1)}%
                </span>
                <span className="ml-auto font-mono text-muted-foreground">
                  ${m.total_cost.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
