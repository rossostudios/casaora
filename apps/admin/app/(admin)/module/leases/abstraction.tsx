"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Abstraction = {
  id: string;
  document_id: string | null;
  lease_id: string | null;
  confidence: number;
  reviewed: boolean;
  human_verified: boolean;
  field_count: number;
  extraction_model: string | null;
  clauses: Clause[];
  deadlines: Deadline[];
  compliance_flags: ComplianceFlag[];
  extracted_terms: Record<string, unknown>;
  created_at: string;
};

type Clause = {
  type: string;
  title: string;
  text: string;
  importance?: string;
};

type Deadline = {
  type: string;
  date: string;
  description: string;
};

type ComplianceFlag = {
  rule_id: string;
  category: string;
  severity: string;
  name: string;
  description: string;
  legal_reference?: string;
  resolved: boolean;
};

type Props = {
  abstractions: Record<string, unknown>[];
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
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function confidenceColor(c: number): string {
  if (c >= 0.9) return "text-emerald-600";
  if (c >= 0.7) return "text-amber-600";
  return "text-red-600";
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

function relTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function LeaseAbstraction({ abstractions: raw }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "unverified" | "flagged">("all");

  const items: Abstraction[] = useMemo(() => {
    return raw
      .map((a) => ({
        id: str(a.id),
        document_id: str(a.document_id) || null,
        lease_id: str(a.lease_id) || null,
        confidence: num(a.confidence),
        reviewed: bool(a.reviewed),
        human_verified: bool(a.human_verified),
        field_count: num(a.field_count),
        extraction_model: str(a.extraction_model) || null,
        clauses: arr(a.clauses).map((c: unknown) => {
          const cl = c as Record<string, unknown>;
          return {
            type: str(cl.type),
            title: str(cl.title),
            text: str(cl.text),
            importance: str(cl.importance) || undefined,
          };
        }),
        deadlines: arr(a.deadlines).map((d: unknown) => {
          const dl = d as Record<string, unknown>;
          return {
            type: str(dl.type),
            date: str(dl.date),
            description: str(dl.description),
          };
        }),
        compliance_flags: arr(a.compliance_flags).map((f: unknown) => {
          const fl = f as Record<string, unknown>;
          return {
            rule_id: str(fl.rule_id),
            category: str(fl.category),
            severity: str(fl.severity),
            name: str(fl.name),
            description: str(fl.description),
            legal_reference: str(fl.legal_reference) || undefined,
            resolved: bool(fl.resolved),
          };
        }),
        extracted_terms:
          typeof a.extracted_terms === "object" && a.extracted_terms
            ? (a.extracted_terms as Record<string, unknown>)
            : {},
        created_at: str(a.created_at),
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [raw]);

  const filtered = useMemo(() => {
    if (filter === "unverified") return items.filter((a) => !a.human_verified);
    if (filter === "flagged")
      return items.filter((a) => a.compliance_flags.length > 0);
    return items;
  }, [items, filter]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const stats = useMemo(() => {
    const total = items.length;
    const verified = items.filter((a) => a.human_verified).length;
    const flagged = items.filter((a) => a.compliance_flags.length > 0).length;
    const avgConf =
      total > 0 ? items.reduce((s, a) => s + a.confidence, 0) / total : 0;
    return { total, verified, flagged, avgConf };
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Abstractions</p>
          <p className="font-semibold text-2xl">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Verified</p>
          <p className="font-semibold text-2xl text-emerald-600">
            {stats.verified}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Flagged</p>
          <p
            className={`font-semibold text-2xl ${stats.flagged > 0 ? "text-amber-600" : "text-muted-foreground"}`}
          >
            {stats.flagged}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Avg Confidence</p>
          <p
            className={`font-semibold text-2xl ${confidenceColor(stats.avgConf)}`}
          >
            {(stats.avgConf * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "unverified", "flagged"] as const).map((f) => (
          <Button
            key={f}
            onClick={() => setFilter(f)}
            size="sm"
            variant={filter === f ? "default" : "outline"}
          >
            {f === "all"
              ? "All"
              : f === "unverified"
                ? "Unverified"
                : "Flagged"}
          </Button>
        ))}
      </div>

      {/* Abstraction list */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No lease abstractions yet. Use the AI agent to abstract a lease
          document.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div className="rounded-lg border bg-card" key={a.id}>
              <button
                className="flex w-full items-center justify-between gap-3 p-3 text-left"
                onClick={() => toggle(a.id)}
                type="button"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-mono font-semibold text-sm ${confidenceColor(a.confidence)}`}
                    >
                      {(a.confidence * 100).toFixed(0)}%
                    </span>
                    {a.human_verified ? (
                      <Badge
                        className="border-emerald-200 text-[10px] text-emerald-600"
                        variant="outline"
                      >
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="text-[10px]" variant="outline">
                        Pending Review
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {a.field_count} fields
                    </span>
                    {a.compliance_flags.length > 0 ? (
                      <Badge
                        className="border-amber-200 text-[10px] text-amber-600"
                        variant="outline"
                      >
                        {a.compliance_flags.length} flag
                        {a.compliance_flags.length !== 1 ? "s" : ""}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
                    {a.lease_id ? (
                      <span className="font-mono">
                        {a.lease_id.slice(0, 8)}...
                      </span>
                    ) : null}
                    <span>{a.clauses.length} clauses</span>
                    <span>{a.deadlines.length} deadlines</span>
                    <span>{relTime(a.created_at)}</span>
                  </div>
                </div>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {expanded.has(a.id) ? "\u25B2" : "\u25BC"}
                </span>
              </button>

              {expanded.has(a.id) ? (
                <div className="space-y-3 border-t px-3 pt-2 pb-3 text-xs">
                  {/* Key terms */}
                  <div>
                    <p className="mb-1 font-medium text-muted-foreground">
                      Extracted Terms
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {Object.entries(a.extracted_terms)
                        .filter(
                          ([k]) =>
                            ![
                              "clauses",
                              "deadlines",
                              "confidence_scores",
                            ].includes(k)
                        )
                        .slice(0, 20)
                        .map(([k, v]) => (
                          <div className="flex justify-between" key={k}>
                            <span className="text-muted-foreground">
                              {k.replace(/_/g, " ")}
                            </span>
                            <span className="ml-2 truncate font-medium">
                              {typeof v === "boolean"
                                ? v
                                  ? "Yes"
                                  : "No"
                                : String(v ?? "-")}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Clauses */}
                  {a.clauses.length > 0 ? (
                    <div>
                      <p className="mb-1 font-medium text-muted-foreground">
                        Clauses
                      </p>
                      <div className="space-y-1">
                        {a.clauses.map((c) => (
                          <div
                            className="rounded border px-2 py-1"
                            key={`${c.type}-${c.title}`}
                          >
                            <div className="flex items-center gap-2">
                              <Badge className="text-[9px]" variant="outline">
                                {c.type}
                              </Badge>
                              <span className="font-medium">{c.title}</span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-muted-foreground">
                              {c.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Compliance flags */}
                  {a.compliance_flags.length > 0 ? (
                    <div>
                      <p className="mb-1 font-medium text-muted-foreground">
                        Compliance Flags
                      </p>
                      <div className="space-y-1">
                        {a.compliance_flags.map((f) => (
                          <div
                            className={`rounded border px-2 py-1 ${severityColor(f.severity)}`}
                            key={f.rule_id}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{f.name}</span>
                              {f.legal_reference ? (
                                <span className="text-[10px] opacity-70">
                                  {f.legal_reference}
                                </span>
                              ) : null}
                            </div>
                            <p className="opacity-80">{f.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Deadlines */}
                  {a.deadlines.length > 0 ? (
                    <div>
                      <p className="mb-1 font-medium text-muted-foreground">
                        Deadlines
                      </p>
                      <div className="space-y-1">
                        {a.deadlines.map((d) => (
                          <div
                            className="flex items-center gap-3 rounded border px-2 py-1"
                            key={`${d.type}-${d.date}`}
                          >
                            <Badge className="text-[9px]" variant="outline">
                              {d.type}
                            </Badge>
                            <span className="font-mono">{d.date}</span>
                            <span className="text-muted-foreground">
                              {d.description}
                            </span>
                          </div>
                        ))}
                      </div>
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
