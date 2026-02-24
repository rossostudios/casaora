"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DeadlineAlert = {
  id: string;
  lease_id: string | null;
  deadline_type: string;
  deadline_date: string;
  description: string;
  status: string;
  last_notified_at: string | null;
};

type ComplianceRule = {
  id: string;
  rule_type: string;
  category: string;
  name: string;
  description: string;
  severity: string;
  is_active: boolean;
  legal_reference: string | null;
};

type Props = {
  deadlines: Record<string, unknown>[];
  rules: Record<string, unknown>[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function bool(v: unknown): boolean {
  return v === true;
}

function severityColor(s: string): string {
  switch (s) {
    case "critical":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "warning":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "info":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusColor(s: string): string {
  switch (s) {
    case "pending":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "notified":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "acknowledged":
      return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "resolved":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

function urgencyLabel(days: number): { text: string; color: string } {
  if (days < 0)
    return { text: `${Math.abs(days)}d overdue`, color: "text-red-600" };
  if (days <= 7) return { text: `${days}d`, color: "text-red-600" };
  if (days <= 30) return { text: `${days}d`, color: "text-amber-600" };
  if (days <= 60) return { text: `${days}d`, color: "text-blue-600" };
  return { text: `${days}d`, color: "text-muted-foreground" };
}

export function ComplianceDashboard({
  deadlines: rawDeadlines,
  rules: rawRules,
}: Props) {
  const [dlFilter, setDlFilter] = useState<"all" | "pending" | "overdue">(
    "all"
  );
  const [showRules, setShowRules] = useState(false);

  const alerts: DeadlineAlert[] = useMemo(() => {
    return rawDeadlines
      .map((d) => ({
        id: str(d.id),
        lease_id: str(d.lease_id) || null,
        deadline_type: str(d.deadline_type) || "custom",
        deadline_date: str(d.deadline_date),
        description: str(d.description),
        status: str(d.status) || "pending",
        last_notified_at: str(d.last_notified_at) || null,
      }))
      .sort(
        (a, b) =>
          new Date(a.deadline_date).getTime() -
          new Date(b.deadline_date).getTime()
      );
  }, [rawDeadlines]);

  const rules: ComplianceRule[] = useMemo(() => {
    return rawRules.map((r) => ({
      id: str(r.id),
      rule_type: str(r.rule_type) || "custom",
      category: str(r.category) || "general",
      name: str(r.name),
      description: str(r.description),
      severity: str(r.severity) || "info",
      is_active: bool(r.is_active),
      legal_reference: str(r.legal_reference) || null,
    }));
  }, [rawRules]);

  const filteredAlerts = useMemo(() => {
    if (dlFilter === "pending")
      return alerts.filter(
        (a) => a.status === "pending" || a.status === "notified"
      );
    if (dlFilter === "overdue")
      return alerts.filter((a) => daysUntil(a.deadline_date) < 0);
    return alerts;
  }, [alerts, dlFilter]);

  const stats = useMemo(() => {
    const total = alerts.length;
    const overdue = alerts.filter(
      (a) => daysUntil(a.deadline_date) < 0 && a.status !== "resolved"
    ).length;
    const upcoming30 = alerts.filter((a) => {
      const d = daysUntil(a.deadline_date);
      return d >= 0 && d <= 30 && a.status !== "resolved";
    }).length;
    const resolved = alerts.filter((a) => a.status === "resolved").length;
    return { total, overdue, upcoming30, resolved };
  }, [alerts]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Total Deadlines</p>
          <p className="font-semibold text-2xl">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Overdue</p>
          <p
            className={`font-semibold text-2xl ${stats.overdue > 0 ? "text-red-600" : "text-muted-foreground"}`}
          >
            {stats.overdue}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Next 30 Days</p>
          <p
            className={`font-semibold text-2xl ${stats.upcoming30 > 0 ? "text-amber-600" : "text-muted-foreground"}`}
          >
            {stats.upcoming30}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Resolved</p>
          <p className="font-semibold text-2xl text-emerald-600">
            {stats.resolved}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(["all", "pending", "overdue"] as const).map((f) => (
          <Button
            key={f}
            onClick={() => setDlFilter(f)}
            size="sm"
            variant={dlFilter === f ? "default" : "outline"}
          >
            {f === "all" ? "All" : f === "pending" ? "Active" : "Overdue"}
          </Button>
        ))}
        <div className="flex-1" />
        <Button
          onClick={() => setShowRules(!showRules)}
          size="sm"
          variant="outline"
        >
          {showRules ? "Hide Rules" : `Rules (${rules.length})`}
        </Button>
      </div>

      {/* Compliance Rules */}
      {showRules ? (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <p className="font-medium text-muted-foreground text-xs">
            Active Compliance Rules
          </p>
          {rules.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No compliance rules configured.
            </p>
          ) : (
            <div className="space-y-1">
              {rules.map((r) => (
                <div
                  className={`rounded border px-2 py-1.5 text-xs ${severityColor(r.severity)}`}
                  key={r.id}
                >
                  <div className="flex items-center gap-2">
                    <Badge className="text-[9px]" variant="outline">
                      {r.rule_type.replace("_", " ")}
                    </Badge>
                    <Badge className="text-[9px]" variant="outline">
                      {r.category}
                    </Badge>
                    <span className="font-medium">{r.name}</span>
                    {r.legal_reference ? (
                      <span className="ml-auto text-[10px] opacity-70">
                        {r.legal_reference}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 opacity-80">{r.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Deadline alerts */}
      {filteredAlerts.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No deadline alerts. Use the AI agent to track lease deadlines.
        </p>
      ) : (
        <div className="space-y-1">
          {filteredAlerts.map((a) => {
            const days = daysUntil(a.deadline_date);
            const urgency = urgencyLabel(days);
            return (
              <div
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-xs"
                key={a.id}
              >
                <span
                  className={`min-w-[60px] font-mono font-semibold ${urgency.color}`}
                >
                  {urgency.text}
                </span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px] ${statusColor(a.status)}`}
                >
                  {a.status}
                </span>
                <Badge className="text-[9px]" variant="outline">
                  {a.deadline_type.replace("_", " ")}
                </Badge>
                <span className="font-mono text-muted-foreground">
                  {a.deadline_date}
                </span>
                <span className="flex-1 truncate">{a.description}</span>
                {a.lease_id ? (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {a.lease_id.slice(0, 8)}...
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
