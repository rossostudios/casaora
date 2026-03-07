"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  agentRunStatusTone,
  extractAgentRunReplyPreview,
  summarizeAgentRunEvent,
} from "@/components/agent/run-utils";
import type { AgentRun, AgentRunEvent } from "@/lib/api";
import { formatCurrency, humanizeKey, toRelativeTimeIntl } from "@/lib/format";
import { useVisibilityPollingInterval } from "@/lib/hooks/use-visibility-polling";
import type { Locale } from "@/lib/i18n";

type AgentRunsProps = {
  orgId: string;
  locale: Locale;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload as T;
}

export function AgentRuns({ orgId, locale }: AgentRunsProps) {
  const isEn = locale === "en-US";
  const queryClient = useQueryClient();
  const pollInterval = useVisibilityPollingInterval({
    enabled: !!orgId,
    foregroundMs: 15_000,
    backgroundMs: 60_000,
  });
  const [task, setTask] = useState("");
  const [allowMutations, setAllowMutations] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const runsQuery = useQuery({
    queryKey: ["agent-runs", orgId, "recent"],
    queryFn: async () => {
      const response = await fetch(
        `/api/agent/runs?org_id=${encodeURIComponent(orgId)}&limit=20`,
        { cache: "no-store", headers: { Accept: "application/json" } }
      );
      const payload = await readJson<{
        organization_id?: string;
        data?: AgentRun[];
      }>(response);
      return payload.data ?? [];
    },
    enabled: !!orgId,
    refetchInterval: pollInterval,
    refetchOnWindowFocus: true,
  });

  const eventsQuery = useQuery({
    queryKey: ["agent-run-events", orgId, expandedRunId],
    queryFn: async () => {
      if (!expandedRunId) return [];
      const response = await fetch(
        `/api/agent/runs/${encodeURIComponent(expandedRunId)}/events?org_id=${encodeURIComponent(orgId)}`,
        { cache: "no-store", headers: { Accept: "application/json" } }
      );
      const payload = await readJson<{
        organization_id?: string;
        run_id?: string;
        data?: AgentRunEvent[];
      }>(response);
      return payload.data ?? [];
    },
    enabled: !!orgId && !!expandedRunId,
    refetchInterval: expandedRunId ? pollInterval : false,
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/agent/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          org_id: orgId,
          mode: "autonomous",
          agent_slug: "supervisor",
          task: task.trim(),
          allow_mutations: allowMutations,
        context: {
          source: "operations",
          entityIds: [],
          filters: {},
          summary: "Manual autonomous run from AI Command Center",
          returnPath: "/module/agent-dashboard",
          permissions: {
            maySuggest: true,
            mayExecuteLowRisk: allowMutations,
            mayExecuteHighRisk: false,
          },
        },
        }),
      });
      return readJson<AgentRun>(response);
    },
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs", orgId] });
      setExpandedRunId(run.id);
      setTask("");
      toast.success(
        isEn ? "Autonomous run started." : "Ejecucion autonoma iniciada."
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (runId: string) => {
      const response = await fetch(
        `/api/agent/runs/${encodeURIComponent(runId)}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ org_id: orgId }),
        }
      );
      return readJson<AgentRun>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs", orgId] });
      queryClient.invalidateQueries({ queryKey: ["agent-run-events", orgId] });
      toast.success(
        isEn ? "Pending actions approved." : "Acciones pendientes aprobadas."
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (runId: string) => {
      const response = await fetch(
        `/api/agent/runs/${encodeURIComponent(runId)}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ org_id: orgId }),
        }
      );
      return readJson<AgentRun>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs", orgId] });
      queryClient.invalidateQueries({ queryKey: ["agent-run-events", orgId] });
      toast.success(isEn ? "Run cancelled." : "Ejecucion cancelada.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const runs = runsQuery.data ?? [];
  const expandedEvents = useMemo(
    () => (expandedRunId ? eventsQuery.data ?? [] : []),
    [eventsQuery.data, expandedRunId]
  );

  const activeMutationRunId =
    approveMutation.variables ?? cancelMutation.variables ?? null;

  return (
    <Card data-testid="agent-run-inbox">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>
            {isEn ? "Autonomous runs" : "Ejecuciones autonomas"}
          </CardTitle>
          <StatusBadge
            label={`${runs.filter((run) => run.status === "waiting_for_approval").length} ${
              isEn ? "need approval" : "requieren aprobacion"
            }`}
            tone="warning"
          />
        </div>
        <CardDescription>
          {isEn
            ? "Launch low-risk autonomous work, review pending approvals, and inspect run events in one queue."
            : "Lanza trabajo autonomo de bajo riesgo, revisa aprobaciones pendientes e inspecciona eventos en una sola cola."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
          <label
            className="mb-2 block font-medium text-sm"
            htmlFor="agent-run-task"
          >
            {isEn ? "Run task" : "Tarea a ejecutar"}
          </label>
          <Textarea
            id="agent-run-task"
            onChange={(event) => setTask(event.target.value)}
            placeholder={
              isEn
                ? "Example: Send rent reminders for leases due this week and stop if any reminder needs approval."
                : "Ejemplo: Envia recordatorios de renta para leases venciendo esta semana y detente si alguna accion requiere aprobacion."
            }
            rows={3}
            value={task}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={allowMutations}
                onCheckedChange={(checked) => setAllowMutations(Boolean(checked))}
              />
              <span>
                {isEn
                  ? "Allow low-risk mutations"
                  : "Permitir mutaciones de bajo riesgo"}
              </span>
            </label>
            <Button
              disabled={!task.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending
                ? isEn
                  ? "Running..."
                  : "Ejecutando..."
                : isEn
                  ? "Start autonomous run"
                  : "Iniciar ejecucion autonoma"}
            </Button>
          </div>
        </div>

        {runsQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>{isEn ? "Request failed" : "Solicitud fallida"}</AlertTitle>
            <AlertDescription>
              {runsQuery.error instanceof Error
                ? runsQuery.error.message
                : isEn
                  ? "Could not load runs."
                  : "No se pudieron cargar las ejecuciones."}
            </AlertDescription>
          </Alert>
        ) : null}

        {runsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : runs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center">
            <p className="font-medium text-sm">
              {isEn ? "No autonomous runs yet." : "Todavia no hay ejecuciones autonomas."}
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              {isEn
                ? "Launch a supervised task above to create the first run."
                : "Lanza una tarea supervisada arriba para crear la primera ejecucion."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => {
              const busy =
                activeMutationRunId === run.id &&
                (approveMutation.isPending || cancelMutation.isPending);
              const replyPreview = extractAgentRunReplyPreview(run);
              const canApprove = run.status === "waiting_for_approval";
              const canCancel =
                run.status === "queued" ||
                run.status === "running" ||
                run.status === "waiting_for_approval";
              const isExpanded = expandedRunId === run.id;

              return (
                <div
                  className="rounded-2xl border border-border/60 bg-background/70 p-4"
                  key={run.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          tone={agentRunStatusTone(run.status)}
                          value={run.status}
                        />
                        <span className="font-medium text-sm">
                          {humanizeKey(run.agent_slug || "supervisor")}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {toRelativeTimeIntl(run.created_at, locale)}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{run.task}</p>
                      <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
                        <span>
                          {run.provider && run.model
                            ? `${run.provider}:${run.model}`
                            : run.preferred_model || (isEn ? "Default model" : "Modelo por defecto")}
                        </span>
                        {typeof run.pending_approvals === "number" &&
                        run.pending_approvals > 0 ? (
                          <span>
                            {run.pending_approvals}{" "}
                            {isEn ? "pending approvals" : "aprobaciones pendientes"}
                          </span>
                        ) : null}
                        {run.cost_estimate_usd !== null &&
                        run.cost_estimate_usd !== undefined ? (
                          <span>
                            {formatCurrency(run.cost_estimate_usd, "USD", "en-US")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {run.chat_id ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/app/chats/${run.chat_id}`}>
                            {isEn ? "Open chat" : "Abrir chat"}
                          </Link>
                        </Button>
                      ) : null}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/module/agent-dashboard/runs/${run.id}`}>
                          {isEn ? "Open run" : "Abrir ejecucion"}
                        </Link>
                      </Button>
                      <Button
                        onClick={() =>
                          setExpandedRunId((current) =>
                            current === run.id ? null : run.id
                          )
                        }
                        size="sm"
                        variant="outline"
                      >
                        {isExpanded
                          ? isEn
                            ? "Hide events"
                            : "Ocultar eventos"
                          : isEn
                            ? "View events"
                            : "Ver eventos"}
                      </Button>
                      {canApprove ? (
                        <Button
                          disabled={busy}
                          onClick={() => approveMutation.mutate(run.id)}
                          size="sm"
                        >
                          {isEn ? "Approve" : "Aprobar"}
                        </Button>
                      ) : null}
                      {canCancel ? (
                        <Button
                          disabled={busy}
                          onClick={() => cancelMutation.mutate(run.id)}
                          size="sm"
                          variant="outline"
                        >
                          {isEn ? "Cancel" : "Cancelar"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {replyPreview ? (
                    <p className="mt-3 line-clamp-3 text-muted-foreground text-sm">
                      {replyPreview}
                    </p>
                  ) : null}

                  {run.error_message ? (
                    <p className="mt-3 text-red-600 text-sm">{run.error_message}</p>
                  ) : null}

                  {isExpanded ? (
                    <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-3">
                      {eventsQuery.isLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : expandedEvents.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          {isEn
                            ? "No run events recorded yet."
                            : "Todavia no hay eventos registrados para esta ejecucion."}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {expandedEvents.map((event) => {
                            const summary = summarizeAgentRunEvent(event, locale);
                            return (
                              <div
                                className="rounded-xl border border-border/40 bg-background/80 p-3"
                                key={event.id}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-medium text-sm">
                                    {summary.title}
                                  </p>
                                  <span className="text-muted-foreground text-xs">
                                    {toRelativeTimeIntl(event.created_at, locale)}
                                  </span>
                                </div>
                                <p className="mt-1 text-muted-foreground text-sm">
                                  {summary.body}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
