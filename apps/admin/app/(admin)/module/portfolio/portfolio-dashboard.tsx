"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Snapshot = {
  snapshot_date: string;
  total_units: number;
  occupied_units: number;
  revenue: number;
  expenses: number;
  noi: number;
  occupancy: number;
  revpar: number;
};

type Digest = {
  id: string;
  digest_type: string;
  period_start: string;
  period_end: string;
  kpis: Record<string, number>;
  created_at: string;
};

type Benchmark = {
  id: string;
  benchmark_type: string;
  metric: string;
  value: number;
  period: string;
  property_id: string | null;
  notes: string | null;
};

type Props = {
  snapshots: Record<string, unknown>[];
  digests: Record<string, unknown>[];
  benchmarks: Record<string, unknown>[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function PortfolioDashboard({
  snapshots: rawSnaps,
  digests: rawDigests,
  benchmarks: rawBench,
}: Props) {
  const [period, setPeriod] = useState<"30d" | "90d" | "12m">("30d");

  const snapshots: Snapshot[] = useMemo(() => {
    return rawSnaps
      .map((s) => ({
        snapshot_date: str(s.snapshot_date),
        total_units: num(s.total_units),
        occupied_units: num(s.occupied_units),
        revenue: num(s.revenue),
        expenses: num(s.expenses),
        noi: num(s.noi),
        occupancy: num(s.occupancy),
        revpar: num(s.revpar),
      }))
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  }, [rawSnaps]);

  const digests: Digest[] = useMemo(() => {
    return rawDigests
      .map((d) => ({
        id: str(d.id),
        digest_type: str(d.digest_type) || "weekly",
        period_start: str(d.period_start),
        period_end: str(d.period_end),
        kpis:
          typeof d.kpis === "object" && d.kpis
            ? (d.kpis as Record<string, number>)
            : {},
        created_at: str(d.created_at),
      }))
      .sort((a, b) => b.period_start.localeCompare(a.period_start));
  }, [rawDigests]);

  const benchmarks: Benchmark[] = useMemo(() => {
    return rawBench.map((b) => ({
      id: str(b.id),
      benchmark_type: str(b.benchmark_type) || "target",
      metric: str(b.metric),
      value: num(b.value),
      period: str(b.period) || "monthly",
      property_id: str(b.property_id) || null,
      notes: str(b.notes) || null,
    }));
  }, [rawBench]);

  const filteredSnaps = useMemo(() => {
    const now = Date.now();
    const cutoff = period === "12m" ? 365 : period === "90d" ? 90 : 30;
    return snapshots.filter((s) => {
      const diff = (now - new Date(s.snapshot_date).getTime()) / 86_400_000;
      return diff <= cutoff;
    });
  }, [snapshots, period]);

  const latest =
    filteredSnaps.length > 0 ? (filteredSnaps.at(-1) ?? null) : null;
  const first = filteredSnaps.length > 1 ? filteredSnaps[0] : null;

  const revenueChange =
    latest && first && first.revenue > 0
      ? ((latest.revenue - first.revenue) / first.revenue) * 100
      : 0;

  return (
    <div className="space-y-4">
      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Revenue</p>
          <p className="font-semibold text-2xl">
            {latest ? fmt(latest.revenue) : "—"}
          </p>
          {revenueChange !== 0 && (
            <p
              className={`text-xs ${revenueChange > 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              {revenueChange > 0 ? "+" : ""}
              {revenueChange.toFixed(1)}%
            </p>
          )}
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Occupancy</p>
          <p className="font-semibold text-2xl">
            {latest ? `${(latest.occupancy * 100).toFixed(0)}%` : "—"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">NOI</p>
          <p
            className={`font-semibold text-2xl ${latest && latest.noi < 0 ? "text-red-600" : ""}`}
          >
            {latest ? fmt(latest.noi) : "—"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">RevPAR</p>
          <p className="font-semibold text-2xl">
            {latest ? fmt(latest.revpar) : "—"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Units</p>
          <p className="font-semibold text-2xl">
            {latest ? `${latest.occupied_units}/${latest.total_units}` : "—"}
          </p>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        {(["30d", "90d", "12m"] as const).map((p) => (
          <Button
            key={p}
            onClick={() => setPeriod(p)}
            size="sm"
            variant={period === p ? "default" : "outline"}
          >
            {p === "30d" ? "30 Days" : p === "90d" ? "90 Days" : "12 Months"}
          </Button>
        ))}
        <span className="ml-auto text-muted-foreground text-xs">
          {filteredSnaps.length} data points
        </span>
      </div>

      {/* Trend table */}
      {filteredSnaps.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                  Revenue
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                  Expenses
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                  NOI
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                  Occ%
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                  RevPAR
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSnaps.slice(-15).map((s) => (
                <tr className="border-b last:border-0" key={s.snapshot_date}>
                  <td className="px-3 py-1.5 font-mono">{s.snapshot_date}</td>
                  <td className="px-3 py-1.5 text-right">{fmt(s.revenue)}</td>
                  <td className="px-3 py-1.5 text-right">{fmt(s.expenses)}</td>
                  <td
                    className={`px-3 py-1.5 text-right ${s.noi < 0 ? "text-red-600" : ""}`}
                  >
                    {fmt(s.noi)}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {(s.occupancy * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-1.5 text-right">{fmt(s.revpar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-6 text-center text-muted-foreground text-sm">
          No snapshot data available. Snapshots are captured nightly.
        </p>
      )}

      {/* Benchmarks */}
      {benchmarks.length > 0 ? (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <p className="font-medium text-muted-foreground text-xs">
            Benchmarks
          </p>
          <div className="flex flex-wrap gap-2">
            {benchmarks.map((b) => (
              <div
                className="flex items-center gap-1.5 rounded border px-2 py-1 text-xs"
                key={b.id}
              >
                <Badge className="text-[9px]" variant="outline">
                  {b.benchmark_type}
                </Badge>
                <span className="font-medium">{b.metric}</span>
                <span className="font-mono">{b.value.toFixed(2)}</span>
                <span className="text-muted-foreground">({b.period})</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Recent digests */}
      {digests.length > 0 ? (
        <div className="space-y-2">
          <p className="font-medium text-muted-foreground text-xs">
            Recent Digests
          </p>
          {digests.slice(0, 5).map((d) => (
            <div
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-xs"
              key={d.id}
            >
              <Badge className="text-[9px]" variant="outline">
                {d.digest_type}
              </Badge>
              <span className="font-mono">
                {d.period_start} — {d.period_end}
              </span>
              <div className="flex flex-1 gap-3 text-muted-foreground">
                {d.kpis.revenue != null && (
                  <span>Rev: {fmt(d.kpis.revenue)}</span>
                )}
                {d.kpis.noi != null && <span>NOI: {fmt(d.kpis.noi)}</span>}
                {d.kpis.revenue_change_pct != null && (
                  <span
                    className={
                      d.kpis.revenue_change_pct >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  >
                    {d.kpis.revenue_change_pct > 0 ? "+" : ""}
                    {d.kpis.revenue_change_pct.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
