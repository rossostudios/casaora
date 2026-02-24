"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";

type VoiceInteraction = {
  id: string;
  caller_phone: string | null;
  caller_name: string | null;
  direction: string;
  status: string;
  duration_seconds: number;
  language: string;
  summary: string | null;
  actions_taken: string[];
  started_at: string;
  ended_at: string | null;
};

type VoiceConfig = {
  is_enabled: boolean;
  phone_number: string | null;
  greeting_message: string | null;
  voice_id: string | null;
  language: string;
  max_call_duration_seconds: number;
  transfer_on_escalation: boolean;
  transfer_number: string | null;
};

type Props = {
  interactions: Record<string, unknown>[];
  config: Record<string, unknown>[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

function arr(v: unknown): string[] {
  if (Array.isArray(v))
    return v.map((x) => (typeof x === "string" ? x : String(x)));
  return [];
}

function statusColor(s: string): string {
  switch (s) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    case "in_progress":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "missed":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "failed":
      return "bg-red-500/10 text-red-600 border-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function relTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function VoiceInteractions({
  interactions: raw,
  config: rawConfig,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const cfg: VoiceConfig | null = useMemo(() => {
    if (rawConfig.length === 0) return null;
    const c = rawConfig[0];
    return {
      is_enabled: c.is_enabled === true,
      phone_number: str(c.phone_number) || null,
      greeting_message: str(c.greeting_message) || null,
      voice_id: str(c.voice_id) || null,
      language: str(c.language) || "es",
      max_call_duration_seconds: num(c.max_call_duration_seconds) || 300,
      transfer_on_escalation: c.transfer_on_escalation !== false,
      transfer_number: str(c.transfer_number) || null,
    };
  }, [rawConfig]);

  const interactions: VoiceInteraction[] = useMemo(() => {
    return raw
      .map((i) => ({
        id: str(i.id),
        caller_phone: str(i.caller_phone) || null,
        caller_name: str(i.caller_name) || null,
        direction: str(i.direction) || "inbound",
        status: str(i.status) || "completed",
        duration_seconds: num(i.duration_seconds),
        language: str(i.language) || "es",
        summary: str(i.summary) || null,
        actions_taken: arr(i.actions_taken),
        started_at: str(i.started_at),
        ended_at: str(i.ended_at) || null,
      }))
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
  }, [raw]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const stats = useMemo(() => {
    const total = interactions.length;
    const completed = interactions.filter(
      (i) => i.status === "completed"
    ).length;
    const missed = interactions.filter((i) => i.status === "missed").length;
    const avgDuration =
      completed > 0
        ? Math.round(
            interactions
              .filter((i) => i.status === "completed")
              .reduce((s, i) => s + i.duration_seconds, 0) / completed
          )
        : 0;
    return { total, completed, missed, avgDuration };
  }, [interactions]);

  return (
    <div className="space-y-4">
      {/* Config status */}
      {cfg ? (
        <div className="space-y-1 rounded-lg border bg-muted/20 p-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${cfg.is_enabled ? "bg-emerald-500" : "bg-muted-foreground"}`}
            />
            <span className="font-medium">
              {cfg.is_enabled ? "Voice Agent Active" : "Voice Agent Disabled"}
            </span>
            {cfg.phone_number ? (
              <span className="font-mono text-muted-foreground">
                {cfg.phone_number}
              </span>
            ) : null}
            <Badge className="text-[10px]" variant="outline">
              {cfg.language.toUpperCase()}
            </Badge>
          </div>
          {cfg.greeting_message ? (
            <p className="text-muted-foreground italic">
              &quot;{cfg.greeting_message}&quot;
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/20 p-3 text-muted-foreground text-xs">
          No voice agent configuration found. Configure via the data table.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Total Calls</p>
          <p className="font-semibold text-2xl">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Completed</p>
          <p className="font-semibold text-2xl text-emerald-600">
            {stats.completed}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Missed</p>
          <p
            className={`font-semibold text-2xl ${stats.missed > 0 ? "text-amber-600" : "text-muted-foreground"}`}
          >
            {stats.missed}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Avg Duration</p>
          <p className="font-semibold text-2xl">
            {formatDuration(stats.avgDuration)}
          </p>
        </div>
      </div>

      {/* Interaction list */}
      {interactions.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No voice interactions yet.
        </p>
      ) : (
        <div className="space-y-2">
          {interactions.map((i) => (
            <div className="rounded-lg border bg-card" key={i.id}>
              <button
                className="flex w-full items-center justify-between gap-3 p-3 text-left"
                onClick={() => toggle(i.id)}
                type="button"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px] ${statusColor(i.status)}`}
                    >
                      {i.status}
                    </span>
                    <Badge className="text-[10px]" variant="outline">
                      {i.direction === "inbound" ? "\u2199 In" : "\u2197 Out"}
                    </Badge>
                    <span className="font-mono text-sm">
                      {i.caller_phone ?? "Unknown"}
                    </span>
                    {i.caller_name ? (
                      <span className="text-muted-foreground text-xs">
                        ({i.caller_name})
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
                    <span>{formatDuration(i.duration_seconds)}</span>
                    <span>{i.language.toUpperCase()}</span>
                    <span>{relTime(i.started_at)}</span>
                  </div>
                </div>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {expanded.has(i.id) ? "\u25B2" : "\u25BC"}
                </span>
              </button>

              {expanded.has(i.id) ? (
                <div className="space-y-2 border-t px-3 pt-2 pb-3 text-xs">
                  {i.summary ? (
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Summary
                      </p>
                      <p>{i.summary}</p>
                    </div>
                  ) : null}
                  {i.actions_taken.length > 0 ? (
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Actions Taken
                      </p>
                      <ul className="list-disc space-y-0.5 pl-4">
                        {i.actions_taken.map((a) => (
                          <li key={a}>{a}</li>
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
