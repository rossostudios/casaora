import Link from "next/link";

import { PageScaffold } from "@/components/ui/page-scaffold";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import {
  fetchAgentApprovals,
  fetchAgentRun,
  fetchAgentRunEvents,
  type AgentApproval,
  type AgentRun,
} from "@/lib/api";
import {
  formatCurrency,
  humanizeKey,
  toRelativeTimeIntl,
} from "@/lib/format";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";
import {
  agentRunStatusTone,
  extractAgentRunReplyPreview,
  summarizeAgentRunEvent,
} from "@/components/agent/run-utils";
import { RunApprovalsPanel } from "@/components/agent/run-approvals-panel";

type PageProps = {
  params: Promise<{ runId: string }>;
};

function metricValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return String(value);
}

export default async function AgentRunDetailPage({ params }: PageProps) {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";
  const orgId = await getActiveOrgId();
  const { runId } = await params;

  if (!orgId) {
    return (
      <NoOrgCard
        isEn={isEn}
        resource={["the agent run", "la ejecucion del agente"]}
      />
    );
  }

  let run: AgentRun;
  let events: NonNullable<Awaited<ReturnType<typeof fetchAgentRunEvents>>["data"]> =
    [];
  let approvals: AgentApproval[] = [];
  let approvalsUnavailableMessage: string | null = null;
  try {
    const [runRow, eventsPayload] = await Promise.all([
      fetchAgentRun(orgId, runId),
      fetchAgentRunEvents(orgId, runId),
    ]);
    run = runRow;
    events = eventsPayload.data ?? [];
  } catch (error) {
    return (
      <ApiErrorCard
        isEn={isEn}
        message={error instanceof Error ? error.message : String(error)}
      />
    );
  }

  try {
    const approvalsPayload = await fetchAgentApprovals(orgId, {
      runId,
      status: "all",
    });
    approvals = approvalsPayload.data ?? [];
  } catch {
    approvalsUnavailableMessage = isEn
      ? "Approvals tied to this run are visible only to approvers."
      : "Las aprobaciones vinculadas a esta ejecucion solo son visibles para aprobadores.";
  }

  const replyPreview = extractAgentRunReplyPreview(run);
  const promptTokens =
    run.token_usage && typeof run.token_usage.prompt_tokens === "number"
      ? run.token_usage.prompt_tokens
      : 0;
  const completionTokens =
    run.token_usage && typeof run.token_usage.completion_tokens === "number"
      ? run.token_usage.completion_tokens
      : 0;
  const latencyMs =
    run.token_usage && typeof run.token_usage.latency_ms === "number"
      ? run.token_usage.latency_ms
      : 0;

  return (
    <PageScaffold
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href="/module/agent-dashboard">
              {isEn ? "Back to dashboard" : "Volver al dashboard"}
            </Link>
          </Button>
          {run.chat_id ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/app/chats/${run.chat_id}`}>
                {isEn ? "Open chat" : "Abrir chat"}
              </Link>
            </Button>
          ) : null}
        </>
      }
      description={
        isEn
          ? "Review the exact event timeline, approvals, and model execution details behind this assistant run."
          : "Revisa la linea de tiempo exacta, aprobaciones y detalles de ejecucion del modelo detras de esta ejecucion."
      }
      eyebrow={isEn ? "Casaora AI" : "Casaora IA"}
      title={isEn ? "Run detail" : "Detalle de ejecucion"}
    >
      <ListDetailLayout
        aside={
          <ActionRail
            description={
              isEn
                ? "This rail summarizes the run contract and related navigation."
                : "Este panel resume el contrato de ejecucion y la navegacion relacionada."
            }
            title={isEn ? "Run actions" : "Acciones de la ejecucion"}
          >
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">
                  {isEn ? "Run status" : "Estado"}
                </p>
                <div className="mt-1">
                  <StatusBadge
                    tone={agentRunStatusTone(run.status)}
                    value={run.status}
                  />
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {isEn ? "Mode" : "Modo"}
                </p>
                <p className="mt-1 font-medium">{humanizeKey(run.mode)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {isEn ? "Provider / model" : "Proveedor / modelo"}
                </p>
                <p className="mt-1 font-medium">
                  {run.provider && run.model
                    ? `${run.provider}:${run.model}`
                    : run.preferred_model || "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {isEn ? "Pending approvals" : "Aprobaciones pendientes"}
                </p>
                <p className="mt-1 font-medium">
                  {metricValue(run.pending_approvals)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {isEn ? "Trace id" : "Trace id"}
                </p>
                <p className="mt-1 break-all font-mono text-xs">
                  {run.runtime_trace_id || "-"}
                </p>
              </div>
              {run.cost_estimate_usd !== null &&
              run.cost_estimate_usd !== undefined ? (
                <div>
                  <p className="text-muted-foreground text-xs">
                    {isEn ? "Estimated cost" : "Costo estimado"}
                  </p>
                  <p className="mt-1 font-medium">
                    {formatCurrency(run.cost_estimate_usd, "USD", "en-US")}
                  </p>
                </div>
              ) : null}
            </div>
          </ActionRail>
        }
        primary={
          <div className="space-y-6" data-testid="agent-run-detail">
            <Card>
              <CardHeader>
                <CardTitle>{run.task}</CardTitle>
                <CardDescription>
                  {toRelativeTimeIntl(run.created_at, locale)}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-xs">
                    {isEn ? "Prompt tokens" : "Tokens de entrada"}
                  </p>
                  <p className="mt-1 font-semibold text-lg">
                    {metricValue(promptTokens)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {isEn ? "Completion tokens" : "Tokens de salida"}
                  </p>
                  <p className="mt-1 font-semibold text-lg">
                    {metricValue(completionTokens)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {isEn ? "Latency" : "Latencia"}
                  </p>
                  <p className="mt-1 font-semibold text-lg">
                    {latencyMs > 0 ? `${latencyMs} ms` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {isEn ? "Created by" : "Creado por"}
                  </p>
                  <p className="mt-1 font-semibold text-lg">
                    {run.created_by_user_id || "-"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {replyPreview ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {isEn ? "Assistant response" : "Respuesta del asistente"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {replyPreview}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <RunApprovalsPanel
              approvals={approvals}
              locale={locale}
              orgId={orgId}
              runId={runId}
              unavailableMessage={approvalsUnavailableMessage}
            />

            <Card data-testid="agent-run-events">
              <CardHeader>
                <CardTitle>{isEn ? "Run timeline" : "Linea de tiempo"}</CardTitle>
                <CardDescription>
                  {isEn
                    ? "All state changes, tool calls, approvals, and assistant output for this run."
                    : "Todos los cambios de estado, llamadas de herramientas, aprobaciones y salida del asistente para esta ejecucion."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {isEn
                      ? "No run events recorded yet."
                      : "Todavia no hay eventos registrados para esta ejecucion."}
                  </p>
                ) : (
                  events.map((event) => {
                    const summary = summarizeAgentRunEvent(event, locale);
                    return (
                      <div
                        className="rounded-xl border border-border/60 bg-card/60 p-4"
                        key={event.id}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-sm">
                              {summary.title}
                            </p>
                            <p className="mt-1 text-muted-foreground text-sm">
                              {summary.body}
                            </p>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {toRelativeTimeIntl(event.created_at, locale)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        }
      />
    </PageScaffold>
  );
}
