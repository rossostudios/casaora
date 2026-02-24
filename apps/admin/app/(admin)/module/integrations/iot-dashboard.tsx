"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Device = {
  id: string;
  device_type: string;
  device_name: string;
  status: string;
  battery_level: number | null;
  last_seen_at: string | null;
  unit_id: string | null;
  manufacturer: string | null;
  model: string | null;
  is_active: boolean;
};

type IotEvent = {
  id: string;
  device_id: string;
  event_type: string;
  severity: string;
  value: number | null;
  unit_of_measure: string | null;
  description: string | null;
  acknowledged: boolean;
  created_at: string;
};

type AccessCode = {
  id: string;
  unit_id: string | null;
  code: string;
  code_type: string;
  status: string;
  valid_from: string;
  valid_until: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  sent_via: string | null;
  used_count: number;
};

type Props = {
  devices: Record<string, unknown>[];
  events: Record<string, unknown>[];
  codes: Record<string, unknown>[];
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

function statusColor(s: string): string {
  switch (s) {
    case "online":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    case "offline":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "low_battery":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "error":
      return "bg-red-500/10 text-red-600 border-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function codeStatusColor(s: string): string {
  switch (s) {
    case "active":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    case "expired":
      return "bg-muted text-muted-foreground";
    case "revoked":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "used":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function severityColor(s: string): string {
  switch (s) {
    case "critical":
      return "text-red-600";
    case "warning":
      return "text-amber-600";
    default:
      return "text-muted-foreground";
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

export function IotDashboard({
  devices: rawDevices,
  events: rawEvents,
  codes: rawCodes,
}: Props) {
  const [tab, setTab] = useState<"devices" | "events" | "codes">("devices");

  const devices: Device[] = useMemo(() => {
    return rawDevices
      .map((d) => ({
        id: str(d.id),
        device_type: str(d.device_type) || "other",
        device_name: str(d.device_name),
        status: str(d.status) || "offline",
        battery_level: d.battery_level != null ? num(d.battery_level) : null,
        last_seen_at: str(d.last_seen_at) || null,
        unit_id: str(d.unit_id) || null,
        manufacturer: str(d.manufacturer) || null,
        model: str(d.model) || null,
        is_active: bool(d.is_active),
      }))
      .sort((a, b) => a.status.localeCompare(b.status));
  }, [rawDevices]);

  const events: IotEvent[] = useMemo(() => {
    return rawEvents
      .map((e) => ({
        id: str(e.id),
        device_id: str(e.device_id),
        event_type: str(e.event_type) || "reading",
        severity: str(e.severity) || "info",
        value: e.value != null ? num(e.value) : null,
        unit_of_measure: str(e.unit_of_measure) || null,
        description: str(e.description) || null,
        acknowledged: bool(e.acknowledged),
        created_at: str(e.created_at),
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [rawEvents]);

  const codes: AccessCode[] = useMemo(() => {
    return rawCodes
      .map((c) => ({
        id: str(c.id),
        unit_id: str(c.unit_id) || null,
        code: str(c.code),
        code_type: str(c.code_type) || "temporary",
        status: str(c.status) || "active",
        valid_from: str(c.valid_from),
        valid_until: str(c.valid_until) || null,
        guest_name: str(c.guest_name) || null,
        guest_phone: str(c.guest_phone) || null,
        sent_via: str(c.sent_via) || null,
        used_count: num(c.used_count),
      }))
      .sort(
        (a, b) =>
          new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
      );
  }, [rawCodes]);

  const stats = useMemo(
    () => ({
      totalDevices: devices.length,
      online: devices.filter((d) => d.status === "online").length,
      offline: devices.filter((d) => d.status === "offline").length,
      lowBattery: devices.filter(
        (d) => d.battery_level !== null && d.battery_level < 20
      ).length,
      activeCodes: codes.filter((c) => c.status === "active").length,
      recentAlerts: events.filter((e) => e.severity !== "info").length,
    }),
    [devices, events, codes]
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Devices</p>
          <p className="font-semibold text-2xl">{stats.totalDevices}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Online</p>
          <p className="font-semibold text-2xl text-emerald-600">
            {stats.online}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Offline</p>
          <p
            className={`font-semibold text-2xl ${stats.offline > 0 ? "text-red-600" : "text-muted-foreground"}`}
          >
            {stats.offline}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Low Battery</p>
          <p
            className={`font-semibold text-2xl ${stats.lowBattery > 0 ? "text-amber-600" : "text-muted-foreground"}`}
          >
            {stats.lowBattery}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Active Codes</p>
          <p className="font-semibold text-2xl">{stats.activeCodes}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Alerts</p>
          <p
            className={`font-semibold text-2xl ${stats.recentAlerts > 0 ? "text-amber-600" : "text-muted-foreground"}`}
          >
            {stats.recentAlerts}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["devices", "events", "codes"] as const).map((t) => (
          <Button
            key={t}
            onClick={() => setTab(t)}
            size="sm"
            variant={tab === t ? "default" : "outline"}
          >
            {t === "devices"
              ? `Devices (${devices.length})`
              : t === "events"
                ? `Events (${events.length})`
                : `Access Codes (${codes.length})`}
          </Button>
        ))}
      </div>

      {/* Devices */}
      {tab === "devices" &&
        (devices.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            No IoT devices registered.
          </p>
        ) : (
          <div className="space-y-1">
            {devices.map((d) => (
              <div
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-xs"
                key={d.id}
              >
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px] ${statusColor(d.status)}`}
                >
                  {d.status}
                </span>
                <Badge className="text-[9px]" variant="outline">
                  {d.device_type.replace("_", " ")}
                </Badge>
                <span className="font-medium">{d.device_name}</span>
                {d.manufacturer && (
                  <span className="text-muted-foreground">
                    {d.manufacturer} {d.model}
                  </span>
                )}
                {d.battery_level !== null && (
                  <span
                    className={`font-mono ${d.battery_level < 20 ? "text-amber-600" : "text-muted-foreground"}`}
                  >
                    {d.battery_level}%
                  </span>
                )}
                {d.last_seen_at && (
                  <span className="ml-auto text-muted-foreground">
                    {relTime(d.last_seen_at)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}

      {/* Events */}
      {tab === "events" &&
        (events.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            No IoT events recorded.
          </p>
        ) : (
          <div className="space-y-1">
            {events.slice(0, 50).map((e) => (
              <div
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-xs"
                key={e.id}
              >
                <span className={`font-medium ${severityColor(e.severity)}`}>
                  {e.severity}
                </span>
                <Badge className="text-[9px]" variant="outline">
                  {e.event_type.replace("_", " ")}
                </Badge>
                {e.value != null && (
                  <span className="font-mono">
                    {e.value}
                    {e.unit_of_measure ?? ""}
                  </span>
                )}
                <span className="flex-1 truncate text-muted-foreground">
                  {e.description || "—"}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {relTime(e.created_at)}
                </span>
              </div>
            ))}
          </div>
        ))}

      {/* Access Codes */}
      {tab === "codes" &&
        (codes.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            No access codes generated yet.
          </p>
        ) : (
          <div className="space-y-1">
            {codes.map((c) => (
              <div
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-xs"
                key={c.id}
              >
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px] ${codeStatusColor(c.status)}`}
                >
                  {c.status}
                </span>
                <span className="font-bold font-mono tracking-widest">
                  {c.code}
                </span>
                <Badge className="text-[9px]" variant="outline">
                  {c.code_type}
                </Badge>
                {c.guest_name && <span>{c.guest_name}</span>}
                {c.guest_phone && (
                  <span className="font-mono text-muted-foreground">
                    {c.guest_phone}
                  </span>
                )}
                {c.sent_via && (
                  <Badge className="text-[9px]" variant="outline">
                    via {c.sent_via}
                  </Badge>
                )}
                <span className="ml-auto text-muted-foreground">
                  {c.valid_until
                    ? `until ${c.valid_until.slice(0, 10)}`
                    : "permanent"}
                </span>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
