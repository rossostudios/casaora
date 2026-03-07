"use client";

import {
  AlertDiamondIcon,
  CheckmarkCircle02Icon,
  InboxIcon,
  MailReply01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { ActionRail } from "@/components/ui/action-rail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { buildAgentContextHref } from "@/lib/ai-context";
import { useVisibilityPollingInterval } from "@/lib/hooks/use-visibility-polling";
import type { Locale } from "@/lib/i18n";
import type {
  ActionCenterItem,
  ActionCenterPriority,
  ActionCenterSource,
} from "@/lib/workspace-types";
import { ActionCenterList } from "./action-center-list";

type SourceFilter = ActionCenterSource | "all";
type PriorityFilter = ActionCenterPriority | "all";

type ActionCenterResponse = {
  items: ActionCenterItem[];
  count: number;
};

function toActionCenterResponse(payload: unknown): ActionCenterResponse {
  if (!payload || typeof payload !== "object") {
    return { items: [], count: 0 };
  }

  const row = payload as { items?: unknown; count?: unknown };
  return {
    items: Array.isArray(row.items) ? (row.items as ActionCenterItem[]) : [],
    count: typeof row.count === "number" ? row.count : 0,
  };
}

const SOURCE_OPTIONS: Array<{
  value: SourceFilter;
  label: { "en-US": string; "es-PY": string };
}> = [
  {
    value: "all",
    label: { "en-US": "All work", "es-PY": "Todo el trabajo" },
  },
  {
    value: "approval",
    label: { "en-US": "Approvals", "es-PY": "Aprobaciones" },
  },
  {
    value: "message",
    label: { "en-US": "Replies", "es-PY": "Respuestas" },
  },
  {
    value: "notification",
    label: { "en-US": "Notifications", "es-PY": "Notificaciones" },
  },
  {
    value: "anomaly",
    label: { "en-US": "Anomalies", "es-PY": "Anomalías" },
  },
];

const PRIORITY_OPTIONS: Array<{
  value: PriorityFilter;
  label: { "en-US": string; "es-PY": string };
}> = [
  { value: "all", label: { "en-US": "All priorities", "es-PY": "Todas" } },
  { value: "critical", label: { "en-US": "Critical", "es-PY": "Crítica" } },
  { value: "high", label: { "en-US": "High", "es-PY": "Alta" } },
  { value: "medium", label: { "en-US": "Medium", "es-PY": "Media" } },
  { value: "low", label: { "en-US": "Low", "es-PY": "Baja" } },
];

function normalizeSourceFilter(value: string | null | undefined): SourceFilter {
  if (
    value === "approval" ||
    value === "message" ||
    value === "notification" ||
    value === "anomaly"
  ) {
    return value;
  }
  return "all";
}

function normalizePriorityFilter(
  value: string | null | undefined
): PriorityFilter {
  if (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low"
  ) {
    return value;
  }
  return "all";
}

async function fetchActionCenter(orgId: string): Promise<ActionCenterResponse> {
  const response = await fetch(
    `/api/workspace/action-center?org_id=${encodeURIComponent(orgId)}`,
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
    }
  );
  const payload = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    const errorMessage =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Could not load action center.";
    throw new Error(
      errorMessage
    );
  }

  return toActionCenterResponse(payload);
}

function buildReturnPath(
  source: SourceFilter,
  priority: PriorityFilter,
  query: string
): string {
  const params = new URLSearchParams();
  if (source !== "all") params.set("source", source);
  if (priority !== "all") params.set("priority", priority);
  if (query.trim()) params.set("q", query.trim());
  const suffix = params.toString();
  return suffix ? `/module/action-center?${suffix}` : "/module/action-center";
}

function countBySource(items: ActionCenterItem[], source: ActionCenterSource): number {
  return items.filter((item) => item.source === source).length;
}

function buildQueueSummary(items: ActionCenterItem[], isEn: boolean): string {
  const approvals = countBySource(items, "approval");
  const replies = countBySource(items, "message");
  const notifications = countBySource(items, "notification");
  const anomalies = countBySource(items, "anomaly");

  return isEn
    ? `${approvals} approvals, ${replies} replies, ${notifications} notifications, and ${anomalies} anomalies are currently in view.`
    : `${approvals} aprobaciones, ${replies} respuestas, ${notifications} notificaciones y ${anomalies} anomalías están actualmente en vista.`;
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof InboxIcon;
  tone?: "default" | "warning" | "critical";
}) {
  return (
    <Card className="border border-border/60 bg-card/80">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
              {label}
            </p>
            <p
              className={
                tone === "critical"
                  ? "font-semibold text-3xl tracking-tight text-red-600 dark:text-red-400"
                  : tone === "warning"
                    ? "font-semibold text-3xl tracking-tight text-amber-600 dark:text-amber-400"
                    : "font-semibold text-3xl tracking-tight"
              }
            >
              {value}
            </p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon icon={icon} size={18} />
          </span>
        </div>
        <p className="text-muted-foreground text-sm">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function ActionCenterModule({
  initialData,
  initialPriority,
  initialQuery,
  initialSource,
  locale,
  orgId,
}: {
  initialData: ActionCenterResponse;
  initialPriority?: string;
  initialQuery?: string;
  initialSource?: string;
  locale: Locale;
  orgId: string;
}) {
  const isEn = locale === "en-US";
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(() =>
    normalizeSourceFilter(initialSource)
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(() =>
    normalizePriorityFilter(initialPriority)
  );
  const [searchQuery, setSearchQuery] = useState(() => initialQuery?.trim() ?? "");
  const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const pollInterval = useVisibilityPollingInterval({
    enabled: Boolean(orgId),
    foregroundMs: 60_000,
    backgroundMs: 120_000,
  });

  useEffect(() => {
    setSourceFilter(normalizeSourceFilter(initialSource));
  }, [initialSource]);

  useEffect(() => {
    setPriorityFilter(normalizePriorityFilter(initialPriority));
  }, [initialPriority]);

  useEffect(() => {
    setSearchQuery(initialQuery?.trim() ?? "");
  }, [initialQuery]);

  const actionCenterQuery = useQuery({
    queryKey: ["workspace-action-center", orgId],
    queryFn: () => fetchActionCenter(orgId),
    initialData,
    refetchInterval: pollInterval,
    refetchOnWindowFocus: true,
  });

  const data = actionCenterQuery.data ?? initialData;
  const sourceCounts = {
    approval: countBySource(data.items, "approval"),
    message: countBySource(data.items, "message"),
    notification: countBySource(data.items, "notification"),
    anomaly: countBySource(data.items, "anomaly"),
  };
  const urgentCount = data.items.filter(
    (item) => item.priority === "critical" || item.priority === "high"
  ).length;

  const filteredItems = data.items.filter((item) => {
    if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
    if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
    if (!deferredQuery) return true;

    const haystack = [
      item.title,
      item.subtitle,
      item.entityLabel ?? "",
      item.source,
      item.priority,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(deferredQuery);
  });

  const hasFilters =
    sourceFilter !== "all" ||
    priorityFilter !== "all" ||
    searchQuery.trim().length > 0;
  const queueItems = filteredItems.length > 0 ? filteredItems : data.items;
  const queueSummary = buildQueueSummary(queueItems, isEn);
  const returnPath = buildReturnPath(
    sourceFilter,
    priorityFilter,
    searchQuery.trim()
  );
  const aiSummaryHref = buildAgentContextHref({
    prompt: isEn
      ? "Summarize the most important items in my action center."
      : "Resume los items más importantes de mi centro de acción.",
    context: {
      source: "operations",
      entityIds: queueItems.map((item) => item.id),
      filters: {
        workspace: "action-center",
        source: sourceFilter,
        priority: priorityFilter,
        q: searchQuery.trim(),
      },
      summary: queueSummary,
      returnPath,
    },
  });
  const aiPlanHref = buildAgentContextHref({
    prompt: isEn
      ? "Turn this action center queue into a focused next-step plan."
      : "Convierte esta cola del centro de acción en un plan de próximos pasos.",
    context: {
      source: "operations",
      entityIds: queueItems.map((item) => item.id),
      filters: {
        workspace: "action-center",
        source: sourceFilter,
        priority: priorityFilter,
        q: searchQuery.trim(),
      },
      summary: queueSummary,
      returnPath,
    },
  });

  return (
    <PageScaffold
      eyebrow={isEn ? "Conversations" : "Conversaciones"}
      title={isEn ? "Action Center" : "Centro de acción"}
      description={
        isEn
          ? "One clear queue for approvals, reply-needed conversations, notifications, and agent issues."
          : "Una sola cola clara para aprobaciones, conversaciones con respuesta pendiente, notificaciones e incidencias del agente."
      }
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href="/module/messaging?status=awaiting">
              {isEn ? "Messaging inbox" : "Bandeja de mensajes"}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={aiSummaryHref}>
              {isEn ? "Ask AI" : "Preguntar a IA"}
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard
          detail={
            isEn
              ? "Everything currently waiting for human attention."
              : "Todo lo que espera atención humana."
          }
          icon={InboxIcon}
          label={isEn ? "Open work" : "Trabajo abierto"}
          value={data.count}
        />
        <SummaryCard
          detail={
            isEn
              ? "Approvals and human gates that are blocking execution."
              : "Aprobaciones y bloqueos humanos que frenan la ejecución."
          }
          icon={CheckmarkCircle02Icon}
          label={isEn ? "Approvals" : "Aprobaciones"}
          tone={sourceCounts.approval > 0 ? "warning" : "default"}
          value={sourceCounts.approval}
        />
        <SummaryCard
          detail={
            isEn
              ? "Guests or tenants still waiting on a reply."
              : "Huéspedes o inquilinos que aún esperan respuesta."
          }
          icon={MailReply01Icon}
          label={isEn ? "Replies waiting" : "Respuestas pendientes"}
          tone={sourceCounts.message > 0 ? "warning" : "default"}
          value={sourceCounts.message}
        />
        <SummaryCard
          detail={
            isEn
              ? "Critical and high-priority issues across the queue."
              : "Incidencias críticas y de alta prioridad en la cola."
          }
          icon={AlertDiamondIcon}
          label={isEn ? "Urgent items" : "Items urgentes"}
          tone={urgentCount > 0 ? "critical" : "default"}
          value={urgentCount}
        />
      </div>

      <ListDetailLayout
        aside={
          <ActionRail
            description={
              isEn
                ? "Use the queue as the control surface, then drill into the specialist tool only when needed."
                : "Usa la cola como superficie de control y entra a la herramienta especialista solo cuando haga falta."
            }
            title={isEn ? "Next moves" : "Próximos pasos"}
          >
            <Link
              className="rounded-2xl border border-border/60 bg-background/70 p-4 transition-colors hover:border-foreground/15 hover:bg-background"
              href={aiSummaryHref}
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon icon={SparklesIcon} size={16} />
                </span>
                <div>
                  <p className="font-semibold text-sm">
                    {isEn ? "Summarize the queue" : "Resumir la cola"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {queueSummary}
                  </p>
                </div>
              </div>
            </Link>

            <Link
              className="rounded-2xl border border-border/60 bg-background/70 p-4 transition-colors hover:border-foreground/15 hover:bg-background"
              href={aiPlanHref}
            >
              <p className="font-semibold text-sm">
                {isEn ? "Build a next-step plan" : "Crear plan de próximos pasos"}
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                {isEn
                  ? "Keep the assistant anchored to the current queue and return path."
                  : "Mantén a la asistente anclada a la cola actual y a la ruta de regreso."}
              </p>
            </Link>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-sm">
                  {isEn ? "Specialist views" : "Vistas especialistas"}
                </p>
                <Badge variant="outline">{filteredItems.length}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/module/messaging?status=awaiting">
                    {isEn ? "Messaging" : "Mensajería"}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/module/governance">
                    {isEn ? "Approvals" : "Aprobaciones"}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/module/notifications">
                    {isEn ? "Notifications" : "Notificaciones"}
                  </Link>
                </Button>
              </div>
            </div>

            {hasFilters ? (
              <Button
                onClick={() => {
                  setPriorityFilter("all");
                  setSearchQuery("");
                  setSourceFilter("all");
                }}
                size="sm"
                variant="outline"
              >
                {isEn ? "Clear filters" : "Limpiar filtros"}
              </Button>
            ) : null}
          </ActionRail>
        }
        primary={
          <div className="space-y-4">
            <Card className="sticky top-20 z-10 border border-border/60 bg-background">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg tracking-tight">
                      {isEn ? "Work queue" : "Cola de trabajo"}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {isEn
                        ? `Showing ${filteredItems.length} of ${data.count} open items.`
                        : `Mostrando ${filteredItems.length} de ${data.count} items abiertos.`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {actionCenterQuery.isFetching
                        ? isEn
                          ? "Refreshing"
                          : "Actualizando"
                        : isEn
                          ? "Live"
                          : "En vivo"}
                    </Badge>
                    <Badge variant="outline">
                      {sourceCounts.notification + sourceCounts.anomaly}{" "}
                      {isEn ? "system items" : "items del sistema"}
                    </Badge>
                  </div>
                </div>

                <FieldGroup className="xl:grid-cols-3">
                  <Field
                    htmlFor="action-center-search"
                    label={isEn ? "Search queue" : "Buscar en la cola"}
                  >
                    <Input
                      id="action-center-search"
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={
                        isEn
                          ? "Search by title, detail, or source"
                          : "Buscar por título, detalle o fuente"
                      }
                      value={searchQuery}
                    />
                  </Field>

                  <Field
                    htmlFor="action-center-source"
                    label={isEn ? "Source" : "Fuente"}
                  >
                    <Select
                      id="action-center-source"
                      onChange={(event) =>
                        setSourceFilter(
                          normalizeSourceFilter(event.target.value)
                        )
                      }
                      value={sourceFilter}
                    >
                      {SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label[locale]}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    htmlFor="action-center-priority"
                    label={isEn ? "Priority" : "Prioridad"}
                  >
                    <Select
                      id="action-center-priority"
                      onChange={(event) =>
                        setPriorityFilter(
                          normalizePriorityFilter(event.target.value)
                        )
                      }
                      value={priorityFilter}
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label[locale]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            {actionCenterQuery.isLoading && data.items.length === 0 ? (
              <div className="space-y-3">
                <Skeleton className="h-28 rounded-[24px]" />
                <Skeleton className="h-28 rounded-[24px]" />
                <Skeleton className="h-28 rounded-[24px]" />
              </div>
            ) : actionCenterQuery.error && data.items.length === 0 ? (
              <Card className="border border-border/60 bg-card/70">
                <CardContent className="p-5 text-muted-foreground text-sm">
                  {actionCenterQuery.error.message}
                </CardContent>
              </Card>
            ) : (
              <ActionCenterList
                emptyAction={
                  hasFilters ? (
                    <Button
                      onClick={() => {
                        setPriorityFilter("all");
                        setSearchQuery("");
                        setSourceFilter("all");
                      }}
                      size="sm"
                      variant="outline"
                    >
                      {isEn ? "Reset filters" : "Restablecer filtros"}
                    </Button>
                  ) : undefined
                }
                emptyDescription={
                  hasFilters
                    ? isEn
                      ? "Try removing one of the active filters to see more work."
                      : "Prueba quitar uno de los filtros activos para ver más trabajo."
                    : isEn
                      ? "Everything is clear right now."
                      : "Todo está despejado por ahora."
                }
                emptyTitle={
                  hasFilters
                    ? isEn
                      ? "No items match the current filters"
                      : "No hay items que coincidan con los filtros actuales"
                    : isEn
                      ? "Queue is clear"
                      : "La cola está despejada"
                }
                items={filteredItems}
                locale={locale}
              />
            )}
          </div>
        }
      />
    </PageScaffold>
  );
}
