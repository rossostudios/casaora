"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type WorkOrder = {
  id: string;
  maintenance_request_id: string | null;
  vendor_id: string;
  vendor_name?: string;
  status: string;
  priority: string | null;
  description: string;
  estimated_cost: number | null;
  actual_cost: number | null;
  scheduled_date: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

type MaintenanceRequest = {
  id: string;
  title: string | null;
  status: string;
  ai_urgency: string | null;
  ai_category: string | null;
  sla_response_deadline: string | null;
  sla_resolution_deadline: string | null;
  sla_breached: boolean;
  created_at: string | null;
};

type Props = {
  workOrders: Record<string, unknown>[];
  requests: Record<string, unknown>[];
  vendors: Record<string, unknown>[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function bool(v: unknown): boolean {
  return v === true;
}

function priorityColor(p: string | null): string {
  switch (p) {
    case "critical":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "high":
      return "bg-orange-500/10 text-orange-600 border-orange-200";
    case "medium":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
    case "low":
      return "bg-green-500/10 text-green-600 border-green-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusColor(s: string): string {
  switch (s) {
    case "pending":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "accepted":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "in_progress":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "completed":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    case "verified":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "rejected":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "cancelled":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function slaTimeRemaining(deadline: string | null): {
  label: string;
  urgent: boolean;
} {
  if (!deadline) return { label: "No SLA", urgent: false };
  const now = Date.now();
  const target = new Date(deadline).getTime();
  const diff = target - now;
  if (diff < 0) return { label: "BREACHED", urgent: true };
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 24)
    return {
      label: `${Math.floor(hours / 24)}d ${hours % 24}h`,
      urgent: false,
    };
  if (hours > 0) return { label: `${hours}h ${mins}m`, urgent: hours < 2 };
  return { label: `${mins}m`, urgent: true };
}

function relTime(date: string | null): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type StatusFilter = "all" | "active" | "completed" | "breached";

export function DispatchDashboard({ workOrders, requests, vendors }: Props) {
  const [filter, setFilter] = useState<StatusFilter>("active");

  const vendorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vendors) {
      m.set(str(v.id), str(v.name));
    }
    return m;
  }, [vendors]);

  const requestMap = useMemo(() => {
    const m = new Map<string, MaintenanceRequest>();
    for (const r of requests) {
      m.set(str(r.id), {
        id: str(r.id),
        title: str(r.title) || null,
        status: str(r.status),
        ai_urgency: str(r.ai_urgency) || null,
        ai_category: str(r.ai_category) || null,
        sla_response_deadline: str(r.sla_response_deadline) || null,
        sla_resolution_deadline: str(r.sla_resolution_deadline) || null,
        sla_breached: bool(r.sla_breached),
        created_at: str(r.created_at) || null,
      });
    }
    return m;
  }, [requests]);

  const orders: WorkOrder[] = useMemo(() => {
    return workOrders.map((wo) => ({
      id: str(wo.id),
      maintenance_request_id: str(wo.maintenance_request_id) || null,
      vendor_id: str(wo.vendor_id),
      vendor_name: vendorMap.get(str(wo.vendor_id)) ?? str(wo.vendor_name),
      status: str(wo.status),
      priority: str(wo.priority) || null,
      description: str(wo.description),
      estimated_cost: num(wo.estimated_cost),
      actual_cost: num(wo.actual_cost),
      scheduled_date: str(wo.scheduled_date) || null,
      accepted_at: str(wo.accepted_at) || null,
      started_at: str(wo.started_at) || null,
      completed_at: str(wo.completed_at) || null,
      verified_at: str(wo.verified_at) || null,
      created_at: str(wo.created_at),
      updated_at: str(wo.updated_at),
    }));
  }, [workOrders, vendorMap]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return orders.filter((o) =>
          ["pending", "accepted", "in_progress"].includes(o.status)
        );
      case "completed":
        return orders.filter((o) =>
          ["completed", "verified"].includes(o.status)
        );
      case "breached": {
        const breachedIds = new Set<string>();
        for (const [, req] of requestMap) {
          if (req.sla_breached) breachedIds.add(req.id);
        }
        return orders.filter(
          (o) =>
            o.maintenance_request_id &&
            breachedIds.has(o.maintenance_request_id)
        );
      }
      default:
        return orders;
    }
  }, [orders, filter, requestMap]);

  // Stats
  const stats = useMemo(() => {
    const active = orders.filter((o) =>
      ["pending", "accepted", "in_progress"].includes(o.status)
    ).length;
    const completed = orders.filter((o) =>
      ["completed", "verified"].includes(o.status)
    ).length;
    let breached = 0;
    for (const [, req] of requestMap) {
      if (req.sla_breached) breached++;
    }
    return { total: orders.length, active, completed, breached };
  }, [orders, requestMap]);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Total Orders</p>
          <p className="font-semibold text-2xl">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Active</p>
          <p className="font-semibold text-2xl text-amber-600">
            {stats.active}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Completed</p>
          <p className="font-semibold text-2xl text-emerald-600">
            {stats.completed}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">SLA Breached</p>
          <p
            className={`font-semibold text-2xl ${stats.breached > 0 ? "text-red-600" : "text-muted-foreground"}`}
          >
            {stats.breached}
          </p>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex w-fit items-center gap-1 rounded-md border bg-muted/20 p-1">
        {(["all", "active", "completed", "breached"] as const).map((f) => (
          <Button
            key={f}
            onClick={() => setFilter(f)}
            size="sm"
            variant={filter === f ? "secondary" : "ghost"}
          >
            {f === "all"
              ? "All"
              : f === "active"
                ? "Active"
                : f === "completed"
                  ? "Completed"
                  : "Breached"}
          </Button>
        ))}
      </div>

      {/* Work order cards */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No work orders match this filter.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((wo) => {
            const req = wo.maintenance_request_id
              ? requestMap.get(wo.maintenance_request_id)
              : undefined;
            const sla = slaTimeRemaining(req?.sla_resolution_deadline ?? null);

            return (
              <div
                className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                key={wo.id}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px] ${statusColor(wo.status)}`}
                    >
                      {wo.status.replace("_", " ")}
                    </span>
                    {wo.priority ? (
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px] ${priorityColor(wo.priority)}`}
                      >
                        {wo.priority}
                      </span>
                    ) : null}
                    {req?.ai_category ? (
                      <Badge className="text-[10px]" variant="outline">
                        {req.ai_category}
                      </Badge>
                    ) : null}
                    <span
                      className={`font-mono text-[11px] ${sla.urgent ? "font-semibold text-red-600" : "text-muted-foreground"}`}
                    >
                      SLA: {sla.label}
                    </span>
                  </div>
                  <p className="truncate text-sm">
                    {wo.description || req?.title || "Work order"}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
                    <span>
                      Vendor: <strong>{wo.vendor_name || "Unassigned"}</strong>
                    </span>
                    {wo.estimated_cost != null ? (
                      <span>Est: ${wo.estimated_cost.toLocaleString()}</span>
                    ) : null}
                    <span>{relTime(wo.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
