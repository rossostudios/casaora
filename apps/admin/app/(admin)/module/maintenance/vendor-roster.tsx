"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";

type Vendor = {
  id: string;
  name: string;
  specialties: string[];
  contact_phone: string | null;
  contact_email: string | null;
  avg_rating: number;
  total_jobs: number;
  completion_rate: number;
  current_active_jobs: number;
  max_concurrent_jobs: number;
  service_area: string | null;
  hourly_rate: number | null;
  is_active: boolean;
};

type Props = {
  vendors: Record<string, unknown>[];
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

function ratingStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  return (
    "\u2605".repeat(full) +
    (half ? "\u00BD" : "") +
    "\u2606".repeat(5 - full - half)
  );
}

export function VendorRoster({ vendors: raw }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const vendors: Vendor[] = useMemo(() => {
    return raw
      .map((v) => ({
        id: str(v.id),
        name: str(v.name),
        specialties: arr(v.specialties),
        contact_phone: str(v.contact_phone) || null,
        contact_email: str(v.contact_email) || null,
        avg_rating: num(v.avg_rating),
        total_jobs: num(v.total_jobs),
        completion_rate: num(v.completion_rate),
        current_active_jobs: num(v.current_active_jobs),
        max_concurrent_jobs: num(v.max_concurrent_jobs) || 5,
        service_area: str(v.service_area) || null,
        hourly_rate: typeof v.hourly_rate === "number" ? v.hourly_rate : null,
        is_active: v.is_active !== false,
      }))
      .sort((a, b) => b.avg_rating - a.avg_rating);
  }, [raw]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const active = vendors.filter((v) => v.is_active);
  const inactive = vendors.filter((v) => !v.is_active);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {active.length} active vendor{active.length !== 1 ? "s" : ""}
          {inactive.length > 0 ? `, ${inactive.length} inactive` : ""}
        </p>
      </div>

      {vendors.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No vendors in roster. Add vendors via the data table.
        </p>
      ) : (
        <div className="space-y-2">
          {vendors.map((v) => (
            <div
              className={`rounded-lg border bg-card ${v.is_active ? "" : "opacity-50"}`}
              key={v.id}
            >
              <button
                className="flex w-full items-center justify-between gap-3 p-3 text-left"
                onClick={() => toggle(v.id)}
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{v.name}</span>
                    {v.is_active ? null : (
                      <Badge className="text-[10px]" variant="outline">
                        Inactive
                      </Badge>
                    )}
                    {v.specialties.map((s) => (
                      <Badge
                        className="text-[10px]"
                        key={s}
                        variant="secondary"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
                    <span className="text-amber-500">
                      {ratingStars(v.avg_rating)}
                    </span>
                    <span>{v.avg_rating.toFixed(1)}</span>
                    <span>{v.total_jobs} jobs</span>
                    <span>
                      {(v.completion_rate * 100).toFixed(0)}% completion
                    </span>
                    <span>
                      {v.current_active_jobs}/{v.max_concurrent_jobs} active
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {expanded.has(v.id) ? "\u25B2" : "\u25BC"}
                </span>
              </button>

              {expanded.has(v.id) ? (
                <div className="space-y-2 border-t px-3 pt-2 pb-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <span className="text-muted-foreground">Phone</span>
                      <p className="font-mono">{v.contact_phone ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email</span>
                      <p className="font-mono">{v.contact_email ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Service Area
                      </span>
                      <p>{v.service_area ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hourly Rate</span>
                      <p>
                        {v.hourly_rate != null ? `$${v.hourly_rate}/hr` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  <div>
                    <span className="text-muted-foreground">Capacity</span>
                    <div className="mt-1 h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          v.current_active_jobs >= v.max_concurrent_jobs
                            ? "bg-red-500"
                            : v.current_active_jobs >=
                                v.max_concurrent_jobs * 0.8
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (v.current_active_jobs / v.max_concurrent_jobs) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-muted-foreground">
                      {v.current_active_jobs} / {v.max_concurrent_jobs} slots
                      used
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
