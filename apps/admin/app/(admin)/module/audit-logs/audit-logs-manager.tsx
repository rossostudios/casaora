"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useActiveLocale } from "@/lib/i18n/client";

function asString(v: unknown): string {
  return typeof v === "string" ? v : v ? String(v) : "";
}

type AuditLogRow = {
  id: number;
  action: string;
  entity_name: string;
  entity_id: string;
  actor_user_id: string;
  created_at: string;
};

function parseLog(raw: Record<string, unknown>): AuditLogRow {
  return {
    id: typeof raw.id === "number" ? raw.id : Number(raw.id) || 0,
    action: asString(raw.action),
    entity_name: asString(raw.entity_name),
    entity_id: asString(raw.entity_id),
    actor_user_id: asString(raw.actor_user_id),
    created_at: asString(raw.created_at),
  };
}

function formatTimestamp(ts: string): string {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function actionTone(
  action: string
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (action === "create") return "success";
  if (action === "update") return "info";
  if (action === "delete") return "danger";
  return "neutral";
}

export function AuditLogsManager({
  logs: rawLogs,
}: {
  logs: Record<string, unknown>[];
}) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  const allLogs = useMemo(() => rawLogs.map(parseLog), [rawLogs]);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const uniqueActions = useMemo(
    () => [...new Set(allLogs.map((l) => l.action))].sort(),
    [allLogs]
  );
  const uniqueEntities = useMemo(
    () => [...new Set(allLogs.map((l) => l.entity_name))].sort(),
    [allLogs]
  );

  const filtered = useMemo(() => {
    let items = allLogs;
    if (actionFilter) {
      items = items.filter((l) => l.action === actionFilter);
    }
    if (entityFilter) {
      items = items.filter((l) => l.entity_name === entityFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.entity_name.toLowerCase().includes(q) ||
          l.entity_id.toLowerCase().includes(q) ||
          l.actor_user_id.toLowerCase().includes(q)
      );
    }
    return items;
  }, [allLogs, actionFilter, entityFilter, search]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isEn ? "Search..." : "Buscar..."}
          value={search}
        />
        <Select
          className="w-40"
          onChange={(e) => setActionFilter(e.target.value)}
          value={actionFilter}
        >
          <option value="">{isEn ? "All actions" : "Todas las acciones"}</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select
          className="w-48"
          onChange={(e) => setEntityFilter(e.target.value)}
          value={entityFilter}
        >
          <option value="">
            {isEn ? "All entities" : "Todas las entidades"}
          </option>
          {uniqueEntities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
        <span className="text-muted-foreground text-sm">
          {filtered.length} {isEn ? "entries" : "registros"}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium">
                {isEn ? "Timestamp" : "Fecha"}
              </th>
              <th className="px-3 py-2 font-medium">
                {isEn ? "Action" : "Acción"}
              </th>
              <th className="px-3 py-2 font-medium">
                {isEn ? "Entity" : "Entidad"}
              </th>
              <th className="px-3 py-2 font-medium">
                {isEn ? "Entity ID" : "ID Entidad"}
              </th>
              <th className="px-3 py-2 font-medium">
                {isEn ? "Actor" : "Actor"}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-8 text-center text-muted-foreground"
                  colSpan={5}
                >
                  {isEn ? "No audit logs found." : "No se encontraron registros."}
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr
                  className="border-b last:border-b-0 hover:bg-muted/30"
                  key={log.id}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {formatTimestamp(log.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      label={log.action}
                      tone={actionTone(log.action)}
                      value={log.action}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{log.entity_name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {log.entity_id
                      ? `${log.entity_id.slice(0, 8)}...`
                      : "-"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {log.actor_user_id
                      ? `${log.actor_user_id.slice(0, 8)}...`
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
