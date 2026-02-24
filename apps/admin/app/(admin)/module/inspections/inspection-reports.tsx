"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type InspectionReport = {
  id: string;
  unit_id: string;
  unit_name?: string;
  inspection_type: string;
  condition_score: number | null;
  defects: unknown[];
  rooms: unknown[];
  urgent_issues: unknown[];
  photos: unknown[];
  human_verified: boolean;
  degradation_score: number | null;
  created_at: string;
};

type Props = {
  reports: Record<string, unknown>[];
  units: Record<string, unknown>[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function scoreColor(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 4) return "text-emerald-600";
  if (score >= 3) return "text-amber-600";
  return "text-red-600";
}

function typeLabel(t: string): string {
  switch (t) {
    case "move_in":
      return "Move-In";
    case "move_out":
      return "Move-Out";
    case "routine":
      return "Routine";
    case "damage":
      return "Damage";
    default:
      return t;
  }
}

function typeColor(t: string): string {
  switch (t) {
    case "move_in":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "move_out":
      return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "routine":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "damage":
      return "bg-red-500/10 text-red-600 border-red-200";
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
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

type TypeFilter = "all" | "move_in" | "move_out" | "routine" | "damage";

export function InspectionReports({ reports: raw, units }: Props) {
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const unitMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of units) {
      m.set(
        str(u.id),
        str(u.name) || str(u.unit_number) || str(u.id).slice(0, 8)
      );
    }
    return m;
  }, [units]);

  const reports: InspectionReport[] = useMemo(() => {
    return raw
      .map((r) => ({
        id: str(r.id),
        unit_id: str(r.unit_id),
        unit_name: unitMap.get(str(r.unit_id)) ?? str(r.unit_id).slice(0, 8),
        inspection_type: str(r.inspection_type) || "routine",
        condition_score: num(r.condition_score),
        defects: arr(r.defects),
        rooms: arr(r.rooms),
        urgent_issues: arr(r.urgent_issues),
        photos: arr(r.photos),
        human_verified: r.human_verified === true,
        degradation_score: num(r.degradation_score),
        created_at: str(r.created_at),
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [raw, unitMap]);

  const filtered = useMemo(() => {
    if (filter === "all") return reports;
    return reports.filter((r) => r.inspection_type === filter);
  }, [reports, filter]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Stats
  const stats = useMemo(() => {
    const total = reports.length;
    const avgScore =
      reports
        .filter((r) => r.condition_score != null)
        .reduce((sum, r) => sum + (r.condition_score ?? 0), 0) /
      Math.max(1, reports.filter((r) => r.condition_score != null).length);
    const defectCount = reports.reduce((sum, r) => sum + r.defects.length, 0);
    const degraded = reports.filter(
      (r) => (r.degradation_score ?? 0) > 1
    ).length;
    return { total, avgScore: avgScore.toFixed(1), defectCount, degraded };
  }, [reports]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Total Inspections</p>
          <p className="font-semibold text-2xl">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Avg Score</p>
          <p
            className={`font-semibold text-2xl ${scoreColor(Number.parseFloat(stats.avgScore))}`}
          >
            {stats.avgScore}/5
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Total Defects</p>
          <p
            className={`font-semibold text-2xl ${stats.defectCount > 0 ? "text-amber-600" : "text-muted-foreground"}`}
          >
            {stats.defectCount}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Degraded Units</p>
          <p
            className={`font-semibold text-2xl ${stats.degraded > 0 ? "text-red-600" : "text-muted-foreground"}`}
          >
            {stats.degraded}
          </p>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex w-fit items-center gap-1 rounded-md border bg-muted/20 p-1">
        {(["all", "move_in", "move_out", "routine", "damage"] as const).map(
          (f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              size="sm"
              variant={filter === f ? "secondary" : "ghost"}
            >
              {f === "all" ? "All" : typeLabel(f)}
            </Button>
          )
        )}
      </div>

      {/* Report list */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No inspection reports found.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((report) => (
            <div className="rounded-lg border bg-card" key={report.id}>
              <button
                className="flex w-full items-center justify-between gap-3 p-3 text-left"
                onClick={() => toggle(report.id)}
                type="button"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px] ${typeColor(report.inspection_type)}`}
                    >
                      {typeLabel(report.inspection_type)}
                    </span>
                    <span className="font-medium text-sm">
                      Unit: {report.unit_name}
                    </span>
                    {report.condition_score != null ? (
                      <span
                        className={`font-semibold text-sm ${scoreColor(report.condition_score)}`}
                      >
                        {report.condition_score}/5
                      </span>
                    ) : null}
                    {report.human_verified ? (
                      <Badge className="text-[10px]" variant="secondary">
                        Verified
                      </Badge>
                    ) : null}
                    {report.degradation_score != null &&
                    report.degradation_score > 0.5 ? (
                      <Badge className="text-[10px]" variant="destructive">
                        Degraded (-{report.degradation_score.toFixed(1)})
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
                    <span>{report.photos.length} photos</span>
                    <span>{report.defects.length} defects</span>
                    <span>{relTime(report.created_at)}</span>
                  </div>
                </div>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {expanded.has(report.id) ? "\u25B2" : "\u25BC"}
                </span>
              </button>

              {expanded.has(report.id) ? (
                <div className="space-y-3 border-t px-3 pt-2 pb-3">
                  {/* Room scores */}
                  {report.rooms.length > 0 ? (
                    <div>
                      <p className="mb-1 font-medium text-muted-foreground text-xs">
                        Room Scores
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(report.rooms as Record<string, unknown>[]).map(
                          (room) => (
                            <div
                              className="rounded border px-2 py-1 text-xs"
                              key={str(room.room)}
                            >
                              <span className="font-medium">
                                {str(room.room)}
                              </span>
                              <span
                                className={`ml-1 font-semibold ${scoreColor(num(room.score))}`}
                              >
                                {num(room.score) ?? "?"}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Defects */}
                  {report.defects.length > 0 ? (
                    <div>
                      <p className="mb-1 font-medium text-muted-foreground text-xs">
                        Defects
                      </p>
                      <ul className="space-y-1">
                        {report.defects.map((d) => (
                          <li
                            className="rounded border bg-red-500/5 px-2 py-1 text-xs"
                            key={typeof d === "string" ? d : JSON.stringify(d)}
                          >
                            {typeof d === "string" ? d : JSON.stringify(d)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Urgent issues */}
                  {report.urgent_issues.length > 0 ? (
                    <div>
                      <p className="mb-1 font-medium text-red-600 text-xs">
                        Urgent Issues
                      </p>
                      <ul className="space-y-1">
                        {report.urgent_issues.map((issue) => (
                          <li
                            className="rounded border border-red-200 bg-red-500/10 px-2 py-1 text-red-700 text-xs"
                            key={
                              typeof issue === "string"
                                ? issue
                                : JSON.stringify(issue)
                            }
                          >
                            {typeof issue === "string"
                              ? issue
                              : JSON.stringify(issue)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
