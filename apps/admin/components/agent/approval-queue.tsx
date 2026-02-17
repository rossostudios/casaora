"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Approval = {
  id: string;
  agent_slug: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
  status: string;
  created_at: string;
};

type ApprovalQueueProps = {
  orgId: string;
  locale: Locale;
};

export function ApprovalQueue({ orgId, locale }: ApprovalQueueProps) {
  const isEn = locale === "en-US";
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const fetchApprovals = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/agent/approvals?org_id=${encodeURIComponent(orgId)}`,
        { cache: "no-store", headers: { Accept: "application/json" } }
      );
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: Approval[] };
      setApprovals(payload.data ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchApprovals().catch(() => undefined);
    const interval = setInterval(() => {
      fetchApprovals().catch(() => undefined);
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  const handleReview = async (id: string, action: "approve" | "reject") => {
    setBusy((prev) => ({ ...prev, [id]: true }));
    try {
      await fetch(
        `/api/agent/approvals/${id}/${action}?org_id=${encodeURIComponent(orgId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ note: reviewNotes[id] || null }),
        }
      );
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silently fail
    } finally {
      setBusy((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (approvals.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">
            {isEn ? "Pending approvals" : "Aprobaciones pendientes"}
          </CardTitle>
          <Badge variant="secondary" className="font-mono">
            {approvals.length}
          </Badge>
        </div>
        <CardDescription>
          {isEn
            ? "AI agent actions awaiting human review"
            : "Acciones de agentes IA esperando revisión humana"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {approvals.map((approval) => (
          <div
            className="rounded-xl border border-border/60 bg-card p-3 space-y-2"
            key={approval.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">
                {approval.agent_slug}
              </Badge>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {approval.tool_name}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {new Date(approval.created_at).toLocaleString(locale)}
              </span>
            </div>

            <pre className="overflow-x-auto rounded-lg bg-muted/30 p-2 text-[11px]">
              {JSON.stringify(approval.tool_args, null, 2)}
            </pre>

            <Textarea
              className="text-[12px]"
              maxLength={500}
              onChange={(e) =>
                setReviewNotes((prev) => ({
                  ...prev,
                  [approval.id]: e.target.value,
                }))
              }
              placeholder={
                isEn
                  ? "Optional review note..."
                  : "Nota de revisión opcional..."
              }
              rows={2}
              value={reviewNotes[approval.id] ?? ""}
            />

            <div className="flex items-center gap-2">
              <Button
                disabled={busy[approval.id]}
                onClick={() => {
                  handleReview(approval.id, "approve").catch(() => undefined);
                }}
                size="sm"
              >
                {isEn ? "Approve & execute" : "Aprobar y ejecutar"}
              </Button>
              <Button
                disabled={busy[approval.id]}
                onClick={() => {
                  handleReview(approval.id, "reject").catch(() => undefined);
                }}
                size="sm"
                variant="outline"
              >
                {isEn ? "Reject" : "Rechazar"}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
