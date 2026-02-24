"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { authedFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type LeasingConversation = {
  id: string;
  application_id?: string | null;
  channel: string;
  status: string;
  funnel_stage: string;
  lead_score?: number | null;
  message_count: number;
  last_message_at?: string | null;
  last_message_role?: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  applicant_name?: string | null;
  applicant_phone?: string | null;
  unit_name?: string | null;
  property_name?: string | null;
};

type Props = {
  orgId: string;
  initialConversations: LeasingConversation[];
  locale: string;
};

const FUNNEL_STAGES = [
  {
    key: "inquiry",
    labelEn: "Inquiry",
    labelEs: "Consulta",
    color: "bg-slate-100 dark:bg-slate-800",
  },
  {
    key: "qualification",
    labelEn: "Qualification",
    labelEs: "Calificación",
    color: "bg-blue-50 dark:bg-blue-950",
  },
  {
    key: "screening",
    labelEn: "Screening",
    labelEs: "Evaluación",
    color: "bg-indigo-50 dark:bg-indigo-950",
  },
  {
    key: "tour_scheduled",
    labelEn: "Tour Scheduled",
    labelEs: "Tour Agendado",
    color: "bg-violet-50 dark:bg-violet-950",
  },
  {
    key: "offer_sent",
    labelEn: "Offer Sent",
    labelEs: "Oferta Enviada",
    color: "bg-amber-50 dark:bg-amber-950",
  },
  {
    key: "negotiation",
    labelEn: "Negotiation",
    labelEs: "Negociación",
    color: "bg-orange-50 dark:bg-orange-950",
  },
  {
    key: "signed",
    labelEn: "Signed",
    labelEs: "Firmado",
    color: "bg-emerald-50 dark:bg-emerald-950",
  },
  {
    key: "lost",
    labelEn: "Lost",
    labelEs: "Perdido",
    color: "bg-red-50 dark:bg-red-950",
  },
] as const;

const CHANNEL_ICONS: Record<string, string> = {
  web: "🌐",
  whatsapp: "💬",
  sms: "📱",
  email: "📧",
  phone: "📞",
};

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function leadScoreColor(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground";
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function LeasingPipeline({
  orgId,
  initialConversations,
  locale,
}: Props) {
  const isEn = locale === "en-US";
  const [conversations, setConversations] = useState(initialConversations);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch<{ data: LeasingConversation[] }>(
        `/leasing-conversations?org_id=${orgId}&limit=200`
      );
      setConversations(res.data ?? []);
    } catch {
      // keep existing
    }
  }, [orgId]);

  const conversationsByStage = FUNNEL_STAGES.map((stage) => ({
    stage,
    items: conversations.filter((c) => c.funnel_stage === stage.key),
  }));

  const handleAdvanceStage = useCallback(
    async (conversationId: string, newStage: string) => {
      try {
        await authedFetch(`/leasing-conversations/${conversationId}`, {
          method: "PATCH",
          body: JSON.stringify({
            org_id: orgId,
            funnel_stage: newStage,
          }),
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, funnel_stage: newStage } : c
          )
        );
        toast.success(isEn ? "Stage updated" : "Etapa actualizada");
      } catch {
        toast.error(
          isEn ? "Failed to update stage" : "Error al actualizar etapa"
        );
      }
    },
    [orgId, isEn]
  );

  // Stats
  const totalLeads = conversations.length;
  const qualifiedLeads = conversations.filter(
    (c) => !["inquiry", "lost"].includes(c.funnel_stage)
  ).length;
  const signedLeads = conversations.filter(
    (c) => c.funnel_stage === "signed"
  ).length;
  const conversionRate =
    totalLeads > 0 ? ((signedLeads / totalLeads) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Pipeline stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border/50 px-4 py-3">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            {isEn ? "Total Leads" : "Total Prospectos"}
          </p>
          <p className="mt-1 font-bold text-2xl tabular-nums">{totalLeads}</p>
        </div>
        <div className="rounded-lg border border-border/50 px-4 py-3">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            {isEn ? "Qualified" : "Calificados"}
          </p>
          <p className="mt-1 font-bold text-2xl tabular-nums">
            {qualifiedLeads}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 px-4 py-3">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            {isEn ? "Signed" : "Firmados"}
          </p>
          <p className="mt-1 font-bold text-2xl text-emerald-600 tabular-nums">
            {signedLeads}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 px-4 py-3">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            {isEn ? "Conversion Rate" : "Tasa de Conversión"}
          </p>
          <p className="mt-1 font-bold text-2xl tabular-nums">
            {conversionRate}%
          </p>
        </div>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <Button onClick={refresh} size="sm" variant="outline">
          {isEn ? "Refresh" : "Actualizar"}
        </Button>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {conversationsByStage.map(({ stage, items }) => (
          <div
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-2xl border border-border/80 p-3",
              stage.color
            )}
            key={stage.key}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-sm">
                {isEn ? stage.labelEn : stage.labelEs}
              </p>
              <StatusBadge
                label={String(items.length)}
                tone="neutral"
                value={stage.key}
              />
            </div>

            <div className="max-h-[32rem] space-y-2 overflow-y-auto">
              {items.length === 0 ? (
                <p className="rounded-xl border border-border/80 border-dashed px-3 py-2 text-center text-muted-foreground text-xs">
                  {isEn ? "No leads" : "Sin prospectos"}
                </p>
              ) : (
                items.map((conv) => (
                  <div
                    className="rounded-xl border border-border/80 bg-background/90 p-3 shadow-sm transition-shadow hover:shadow-md"
                    key={conv.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">
                          {conv.applicant_name ||
                            (isEn ? "Unknown Lead" : "Prospecto Desconocido")}
                        </p>
                        {conv.property_name && (
                          <p className="truncate text-muted-foreground text-xs">
                            {conv.property_name}
                            {conv.unit_name ? ` · ${conv.unit_name}` : ""}
                          </p>
                        )}
                      </div>
                      <span className="text-sm" title={conv.channel}>
                        {CHANNEL_ICONS[conv.channel] ?? "💬"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {conv.lead_score != null && (
                        <span
                          className={cn(
                            "font-medium text-[11px] tabular-nums",
                            leadScoreColor(conv.lead_score)
                          )}
                        >
                          {conv.lead_score}pts
                        </span>
                      )}
                      <Badge className="text-[10px]" variant="outline">
                        {conv.message_count} {isEn ? "msgs" : "msgs"}
                      </Badge>
                      {conv.last_message_at && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {relativeTime(conv.last_message_at)}
                        </span>
                      )}
                    </div>

                    {/* Quick stage advance */}
                    {stage.key !== "signed" && stage.key !== "lost" && (
                      <div className="mt-2 flex gap-1">
                        {FUNNEL_STAGES.filter(
                          (s) =>
                            FUNNEL_STAGES.findIndex((f) => f.key === s.key) >
                            FUNNEL_STAGES.findIndex((f) => f.key === stage.key)
                        )
                          .slice(0, 2)
                          .map((nextStage) => (
                            <button
                              className="rounded border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] transition-colors hover:bg-muted"
                              key={nextStage.key}
                              onClick={() =>
                                handleAdvanceStage(conv.id, nextStage.key)
                              }
                              type="button"
                            >
                              → {isEn ? nextStage.labelEn : nextStage.labelEs}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
