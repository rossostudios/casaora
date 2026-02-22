"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Job = {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_at?: string;
  property_name?: string;
  unit_name?: string;
  created_at?: string;
};

type JobDetail = Job & {
  items?: Array<{
    id: string;
    label: string;
    is_completed: boolean;
    sort_order: number;
  }>;
};

type Props = {
  token: string;
  vendorName: string;
  organizationId: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/v1";

async function vendorFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-vendor-token": token,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function VendorPortal({ token, vendorName }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const res = await vendorFetch<{ data?: Job[] }>("/vendor/jobs", token);
      setJobs(res.data ?? []);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const selectJob = useCallback(
    async (id: string) => {
      try {
        const detail = await vendorFetch<JobDetail>(
          `/vendor/jobs/${id}`,
          token
        );
        setSelected(detail);
      } catch (err) {
        console.error("Failed to load job detail:", err);
      }
    },
    [token]
  );

  const handleComplete = useCallback(async () => {
    if (!selected) return;
    setCompleting(true);
    try {
      await vendorFetch(`/vendor/jobs/${selected.id}/complete`, token, {
        method: "POST",
      });
      setSelected((prev) => (prev ? { ...prev, status: "done" } : null));
      setJobs((prev) =>
        prev.map((j) => (j.id === selected.id ? { ...j, status: "done" } : j))
      );
    } catch (err) {
      console.error("Failed to complete job:", err);
    } finally {
      setCompleting(false);
    }
  }, [selected, token]);

  const priorityColor = (p: string) => {
    if (p === "urgent" || p === "critical") return "destructive" as const;
    if (p === "high") return "default" as const;
    return "secondary" as const;
  };

  const statusColor = (s: string) => {
    if (s === "done") return "text-green-600";
    if (s === "in_progress") return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl">Vendor Portal</h1>
          <p className="text-muted-foreground text-sm">Welcome, {vendorName}</p>
        </div>
      </div>

      {/* Job list */}
      {loading && (
        <p className="py-8 text-center text-muted-foreground text-sm">
          Loading jobs...
        </p>
      )}

      {!(loading || selected) && (
        <div className="space-y-3">
          <h2 className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
            Assigned Jobs ({jobs.length})
          </h2>
          {jobs.length === 0 && (
            <div className="rounded-xl border p-6 text-center">
              <p className="text-muted-foreground text-sm">
                No jobs assigned at this time.
              </p>
            </div>
          )}
          {jobs.map((job) => (
            <button
              className="w-full space-y-2 rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"
              key={job.id}
              onClick={() => selectJob(job.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-sm">{job.title}</span>
                <Badge
                  className="shrink-0 text-[10px]"
                  variant={priorityColor(job.priority)}
                >
                  {job.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <span className={statusColor(job.status)}>{job.status}</span>
                {job.property_name && <span>· {job.property_name}</span>}
                {job.unit_name && <span>· {job.unit_name}</span>}
              </div>
              {job.due_at && (
                <p className="text-muted-foreground text-xs">
                  Due: {new Date(job.due_at).toLocaleDateString()}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Job detail */}
      {selected && (
        <div className="space-y-4">
          <button
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            onClick={() => setSelected(null)}
            type="button"
          >
            ← Back to jobs
          </button>

          <div className="space-y-4 rounded-xl border p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg">{selected.title}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`font-medium text-sm ${statusColor(selected.status)}`}
                  >
                    {selected.status}
                  </span>
                  <Badge
                    className="text-[10px]"
                    variant={priorityColor(selected.priority)}
                  >
                    {selected.priority}
                  </Badge>
                </div>
              </div>
              {selected.status !== "done" && (
                <Button
                  disabled={completing}
                  onClick={handleComplete}
                  size="sm"
                >
                  {completing ? "Completing..." : "Mark Complete"}
                </Button>
              )}
            </div>

            {selected.description && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {selected.description}
              </p>
            )}

            {selected.due_at && (
              <p className="text-muted-foreground text-xs">
                Due: {new Date(selected.due_at).toLocaleDateString()}
              </p>
            )}

            {/* Checklist */}
            {selected.items && selected.items.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Checklist</h3>
                {selected.items
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => (
                    <div
                      className="flex items-center gap-2 rounded-lg border px-3 py-2"
                      key={item.id}
                    >
                      <input
                        checked={item.is_completed}
                        className="rounded"
                        readOnly
                        type="checkbox"
                      />
                      <span
                        className={`text-sm ${
                          item.is_completed
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
