"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildAgentContextHref } from "@/lib/ai-context";
import { createAgentRun } from "@/lib/api";
import type {
  OperationsOverviewResponse,
  OperationsWorkItem,
} from "@/lib/operations-overview";

type OperationsManagerProps = {
  orgId: string;
  locale: string;
  overview: OperationsOverviewResponse;
  properties: Record<string, unknown>[];
  units: Record<string, unknown>[];
  members: Record<string, unknown>[];
  initialFilters: {
    q: string;
    propertyId: string;
    unitId: string;
    assignedUserId: string;
    reservationId: string;
    kind: string;
    view: string;
    sort: string;
    limit: number;
    offset: number;
  };
  focusedItemId?: string;
  error?: string;
  success?: string;
};

type Option = {
  id: string;
  label: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function titleCase(value: string): string {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border border-border/60 bg-card/80 shadow-sm">
      <CardContent className="space-y-1 p-5">
        <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
          {label}
        </p>
        <p className="font-semibold text-3xl tracking-tight">{value}</p>
        <p className="text-muted-foreground text-sm">{detail}</p>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  const options: Intl.DateTimeFormatOptions = value.includes("T")
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" };
  return new Intl.DateTimeFormat(locale, options).format(parsed);
}

function buildReturnPath(pathname: string, searchParams: URLSearchParams): string {
  const suffix = searchParams.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

function kindLabel(kind: OperationsWorkItem["kind"], isEn: boolean): string {
  switch (kind) {
    case "maintenance":
      return isEn ? "Maintenance" : "Mantenimiento";
    case "turnover":
      return isEn ? "Turnover" : "Turnover";
    case "availability_conflict":
      return isEn ? "Availability conflict" : "Conflicto de disponibilidad";
    default:
      return isEn ? "Task" : "Tarea";
  }
}

function slaLabel(value: OperationsWorkItem["slaState"], isEn: boolean): string {
  switch (value) {
    case "breached":
      return isEn ? "Breached" : "Vencido";
    case "watch":
      return isEn ? "Watch" : "Seguimiento";
    default:
      return isEn ? "Clear" : "Sin riesgo";
  }
}

function selectedTone(
  focused: boolean
): "selected" | undefined {
  return focused ? "selected" : undefined;
}

function viewLabel(view: string, isEn: boolean): string {
  switch (view) {
    case "today":
      return isEn ? "Today" : "Hoy";
    case "sla_risk":
      return isEn ? "SLA risk" : "Riesgo SLA";
    case "unassigned":
      return isEn ? "Unassigned" : "Sin asignar";
    case "turnovers":
      return isEn ? "Turnovers" : "Turnovers";
    case "maintenance_emergency":
      return isEn ? "Emergency maintenance" : "Mantenimiento urgente";
    default:
      return isEn ? "All" : "Todo";
  }
}

export function OperationsManager({
  orgId,
  locale,
  overview,
  properties,
  units,
  members,
  initialFilters,
  focusedItemId,
  error,
  success,
}: OperationsManagerProps) {
  const isEn = locale === "en-US";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(initialFilters.q);
  const [runPending, setRunPending] = useState(false);
  const [runError, setRunError] = useState("");

  useEffect(() => {
    setQuery(initialFilters.q);
  }, [initialFilters.q]);

  const propertyOptions = useMemo<Option[]>(
    () =>
      properties
        .map((property) => ({
          id: asString(property.id),
          label: asString(property.name),
        }))
        .filter((property) => property.id && property.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [properties]
  );

  const propertyNameById = useMemo(
    () => new Map(propertyOptions.map((property) => [property.id, property.label] as const)),
    [propertyOptions]
  );

  const allUnitOptions = useMemo<Array<Option & { propertyId: string }>>(
    () =>
      units
        .map((unit) => {
          const id = asString(unit.id);
          const propertyId = asString(unit.property_id);
          const unitName = asString(unit.name) || asString(unit.code);
          const propertyName = propertyNameById.get(propertyId);
          return {
            id,
            label: propertyName ? `${propertyName} · ${unitName}` : unitName,
            propertyId,
          };
        })
        .filter((unit) => unit.id && unit.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [propertyNameById, units]
  );

  const unitOptions = useMemo(
    () =>
      initialFilters.propertyId
        ? allUnitOptions.filter((unit) => unit.propertyId === initialFilters.propertyId)
        : allUnitOptions,
    [allUnitOptions, initialFilters.propertyId]
  );

  const memberOptions = useMemo<Option[]>(
    () =>
      members
        .map((member) => {
          const id = asString(member.user_id) || asString(member.id);
          const label =
            asString(member.full_name) || asString(member.name) || asString(member.email);
          return { id, label };
        })
        .filter((member) => member.id && member.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [members]
  );

  function updateParams(
    updates: Record<string, string | null | undefined>,
    options?: { replace?: boolean }
  ) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("tab");
    if (!("offset" in updates)) params.delete("offset");
    const next = params.toString();
    startTransition(() => {
      const href = next ? `${pathname}?${next}` : pathname;
      if (options?.replace) router.replace(href);
      else router.push(href);
    });
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (query !== initialFilters.q) {
        updateParams({ q: query || null }, { replace: true });
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [initialFilters.q, query]);

  const currentFilters = useMemo(
    () =>
      Object.fromEntries(
        [
          ["q", initialFilters.q],
          ["property_id", initialFilters.propertyId],
          ["unit_id", initialFilters.unitId],
          ["assigned_user_id", initialFilters.assignedUserId],
          ["reservation_id", initialFilters.reservationId],
          ["kind", initialFilters.kind],
          ["view", initialFilters.view],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]))
      ),
    [
      initialFilters.assignedUserId,
      initialFilters.kind,
      initialFilters.propertyId,
      initialFilters.q,
      initialFilters.reservationId,
      initialFilters.unitId,
      initialFilters.view,
    ]
  );

  const returnPath = useMemo(
    () => buildReturnPath(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams]
  );

  const askAiHref = buildAgentContextHref({
    prompt: isEn
      ? "What needs attention in this operations queue right now?"
      : "¿Qué necesita atención ahora mismo en esta cola de operaciones?",
    context: {
      source: "operations",
      entityIds: overview.items.map((item) => item.id),
      filters: currentFilters,
      summary: overview.aiBriefingSeed,
      returnPath,
      permissions: {
        maySuggest: true,
        mayExecuteLowRisk: true,
        mayExecuteHighRisk: false,
      },
    },
  });

  const focusedItem = useMemo(
    () => overview.items.find((item) => item.id === focusedItemId) ?? null,
    [focusedItemId, overview.items]
  );
  const offset = Math.max(initialFilters.offset, 0);
  const limit = Math.max(initialFilters.limit, 1);
  const hasMore = overview.items.length >= limit;

  const calendarSpecialistHref = initialFilters.unitId
    ? `/module/calendar?unit_id=${encodeURIComponent(initialFilters.unitId)}`
    : "/module/calendar";

  async function handleRunTriage() {
    try {
      setRunPending(true);
      setRunError("");
      const run = await createAgentRun({
        org_id: orgId,
        mode: "autonomous",
        agent_slug: "supervisor",
        task: isEn
          ? "Review the operations queue, propose the highest-priority triage steps, and execute only low-risk actions allowed by current approval policy."
          : "Revisa la cola de operaciones, propone el triage de mayor prioridad y ejecuta solo acciones de bajo riesgo permitidas por la política actual.",
        context: {
          source: "operations",
          entityIds: overview.items.map((item) => item.id),
          filters: currentFilters,
          summary: overview.aiBriefingSeed,
          returnPath,
          permissions: {
            maySuggest: true,
            mayExecuteLowRisk: true,
            mayExecuteHighRisk: false,
          },
        },
        allow_mutations: true,
      });
      router.push(`/module/agent-dashboard/runs/${encodeURIComponent(run.id)}`);
    } catch (runErr) {
      setRunError(runErr instanceof Error ? runErr.message : String(runErr));
    } finally {
      setRunPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={askAiHref}>{isEn ? "Ask Casaora AI" : "Preguntar a Casaora IA"}</Link>
            </Button>
            <Button
              disabled={runPending || overview.items.length === 0}
              onClick={handleRunTriage}
              type="button"
            >
              {runPending
                ? isEn
                  ? "Starting..."
                  : "Iniciando..."
                : isEn
                  ? "Run low-risk triage"
                  : "Ejecutar triage seguro"}
            </Button>
          </>
        }
        description={
          isEn
            ? "Use Casaora AI to scan daily work, triage SLA risk, and move operators into the right workflow without hopping between dashboards."
            : "Usa Casaora IA para revisar el trabajo diario, priorizar riesgos SLA y llevar a los operadores al flujo correcto sin saltar entre paneles."
        }
        eyebrow={isEn ? "Operations" : "Operaciones"}
        title={isEn ? "Operations" : "Operaciones"}
      >
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-emerald-600 text-sm">
            {success}
          </div>
        ) : null}

        <div
          className="grid gap-4 md:grid-cols-4"
          data-testid="operations-summary-band"
        >
          <SummaryCard
            detail={isEn ? "work due on the current day" : "trabajo que vence hoy"}
            label={isEn ? "Due today" : "Vence hoy"}
            value={String(overview.summary.dueToday)}
          />
          <SummaryCard
            detail={isEn ? "watch or breached items" : "items en seguimiento o vencidos"}
            label={isEn ? "SLA risk" : "Riesgo SLA"}
            value={String(overview.summary.slaRisk)}
          />
          <SummaryCard
            detail={isEn ? "work without owner" : "trabajo sin responsable"}
            label={isEn ? "Unassigned" : "Sin asignar"}
            value={String(overview.summary.unassigned)}
          />
          <SummaryCard
            detail={isEn ? "arrival and departure work" : "trabajo por llegadas y salidas"}
            label={isEn ? "Turnovers today" : "Turnovers hoy"}
            value={String(overview.summary.turnoversToday)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", "today", "sla_risk", "unassigned", "turnovers", "maintenance_emergency"].map(
            (view) => (
              <Button
                key={view}
                onClick={() => updateParams({ view: view === "all" ? null : view })}
                type="button"
                variant={initialFilters.view === view ? "default" : "outline"}
              >
                {viewLabel(view, isEn)}{" "}
                <span className="opacity-70">
                  {overview.viewCounts[view] ?? 0}
                </span>
              </Button>
            )
          )}
        </div>

        <ListDetailLayout
          aside={
            <div className="space-y-6">
              <ActionRail
                className="sticky top-20"
                description={
                  isEn
                    ? "Daily AI briefing and safe automation entrypoint."
                    : "Briefing diario de IA y punto de entrada para automatización segura."
                }
                title={isEn ? "Casaora AI" : "Casaora IA"}
              >
                <div
                  className="rounded-2xl border border-border/60 bg-background/60 p-3 text-sm"
                  data-testid="operations-ai-rail"
                >
                  {overview.aiBriefingSeed}
                </div>
                {runError ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-red-600 text-sm">
                    {runError}
                  </div>
                ) : null}
                <Button asChild className="w-full">
                  <Link href={askAiHref}>
                    {isEn ? "Open Casaora AI" : "Abrir Casaora IA"}
                  </Link>
                </Button>
                <Button
                  className="w-full"
                  disabled={runPending || overview.items.length === 0}
                  onClick={handleRunTriage}
                  type="button"
                  variant="outline"
                >
                  {runPending
                    ? isEn
                      ? "Starting triage..."
                      : "Iniciando triage..."
                    : isEn
                      ? "Run low-risk triage"
                      : "Ejecutar triage seguro"}
                </Button>
                <Button asChild className="w-full" variant="ghost">
                  <Link href={calendarSpecialistHref}>
                    {isEn ? "Open calendar specialist" : "Abrir calendario especialista"}
                  </Link>
                </Button>
                {focusedItem ? (
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-3 text-sm">
                    <p className="font-medium text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      {isEn ? "Focused work" : "Trabajo enfocado"}
                    </p>
                    <p className="mt-2 font-medium">{focusedItem.title}</p>
                    <p className="mt-1 text-muted-foreground">
                      {[kindLabel(focusedItem.kind, isEn), focusedItem.propertyName, focusedItem.unitName]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                ) : null}
              </ActionRail>

              <ActionRail
                description={
                  isEn
                    ? "Highest-priority issues from the visible operations context."
                    : "Problemas de mayor prioridad en el contexto operativo visible."
                }
                title={isEn ? "Needs attention" : "Necesita atención"}
              >
                <div className="space-y-3" data-testid="operations-attention-list">
                  {overview.attentionItems.length > 0 ? (
                    overview.attentionItems.map((item) => (
                      <Link
                        className="block rounded-2xl border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/40"
                        href={item.href}
                        key={item.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-muted-foreground text-xs">{item.subtitle}</p>
                          </div>
                          <StatusBadge
                            label={
                              item.severity === "high"
                                ? isEn
                                  ? "High"
                                  : "Alta"
                                : item.severity === "medium"
                                  ? isEn
                                    ? "Medium"
                                    : "Media"
                                  : isEn
                                    ? "Low"
                                    : "Baja"
                            }
                            tone={
                              item.severity === "high"
                                ? "danger"
                                : item.severity === "medium"
                                  ? "warning"
                                  : "neutral"
                            }
                            value={item.severity}
                          />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-muted-foreground text-sm">
                      {isEn
                        ? "No urgent exceptions in the current operations view."
                        : "No hay excepciones urgentes en la vista operativa actual."}
                    </div>
                  )}
                </div>
              </ActionRail>
            </div>
          }
          primary={
            <div className="space-y-6">
              <div className="sticky top-16 z-20 rounded-2xl border border-border/60 bg-background p-3 shadow-sm">
                <div className="grid gap-3 md:grid-cols-6">
                  <Field
                    className="md:col-span-2"
                    htmlFor="operations-search"
                    label={isEn ? "Search" : "Buscar"}
                  >
                    <Input
                      aria-label={isEn ? "Search operations" : "Buscar operaciones"}
                      id="operations-search"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={
                        isEn
                          ? "Search title, property, unit, assignee..."
                          : "Buscar título, propiedad, unidad, responsable..."
                      }
                      value={query}
                    />
                  </Field>

                  <Field
                    htmlFor="operations-kind"
                    label={isEn ? "Kind" : "Tipo"}
                  >
                    <Select
                      id="operations-kind"
                      onChange={(event) =>
                        updateParams({ kind: event.target.value || null })
                      }
                      value={initialFilters.kind}
                    >
                      <option value="">{isEn ? "All work" : "Todo el trabajo"}</option>
                      <option value="task">{isEn ? "Tasks" : "Tareas"}</option>
                      <option value="maintenance">
                        {isEn ? "Maintenance" : "Mantenimiento"}
                      </option>
                      <option value="turnover">{isEn ? "Turnovers" : "Turnovers"}</option>
                      <option value="availability_conflict">
                        {isEn ? "Conflicts" : "Conflictos"}
                      </option>
                    </Select>
                  </Field>

                  <Field
                    htmlFor="operations-property"
                    label={isEn ? "Property" : "Propiedad"}
                  >
                    <Select
                      id="operations-property"
                      onChange={(event) =>
                        updateParams({
                          property_id: event.target.value || null,
                          unit_id: null,
                        })
                      }
                      value={initialFilters.propertyId}
                    >
                      <option value="">{isEn ? "All properties" : "Todas las propiedades"}</option>
                      {propertyOptions.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field htmlFor="operations-unit" label={isEn ? "Unit" : "Unidad"}>
                    <Select
                      id="operations-unit"
                      onChange={(event) =>
                        updateParams({ unit_id: event.target.value || null })
                      }
                      value={initialFilters.unitId}
                    >
                      <option value="">{isEn ? "All units" : "Todas las unidades"}</option>
                      {unitOptions.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    htmlFor="operations-assignee"
                    label={isEn ? "Assignee" : "Responsable"}
                  >
                    <Select
                      id="operations-assignee"
                      onChange={(event) =>
                        updateParams({
                          assigned_user_id: event.target.value || null,
                        })
                      }
                      value={initialFilters.assignedUserId}
                    >
                      <option value="">{isEn ? "All assignees" : "Todos los responsables"}</option>
                      <option value="unassigned">
                        {isEn ? "Unassigned" : "Sin asignar"}
                      </option>
                      {memberOptions.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field htmlFor="operations-sort" label={isEn ? "Sort" : "Orden"}>
                    <Select
                      id="operations-sort"
                      onChange={(event) =>
                        updateParams({ sort: event.target.value || null })
                      }
                      value={initialFilters.sort}
                    >
                      <option value="priority_desc">
                        {isEn ? "Priority first" : "Prioridad primero"}
                      </option>
                      <option value="due_asc">
                        {isEn ? "Due date" : "Fecha de vencimiento"}
                      </option>
                      <option value="sla_desc">{isEn ? "SLA risk" : "Riesgo SLA"}</option>
                      <option value="created_desc">
                        {isEn ? "Newest first" : "Más reciente"}
                      </option>
                    </Select>
                  </Field>
                </div>
              </div>

              {overview.items.length > 0 ? (
                <div className="space-y-3">
                  <div
                    className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm"
                    data-testid="operations-queue-table"
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{isEn ? "Work" : "Trabajo"}</TableHead>
                          <TableHead>{isEn ? "Status" : "Estado"}</TableHead>
                          <TableHead>{isEn ? "Priority" : "Prioridad"}</TableHead>
                          <TableHead>{isEn ? "Location" : "Ubicación"}</TableHead>
                          <TableHead>{isEn ? "Assignee" : "Responsable"}</TableHead>
                          <TableHead>{isEn ? "Due" : "Vence"}</TableHead>
                          <TableHead>{isEn ? "SLA" : "SLA"}</TableHead>
                          <TableHead>{isEn ? "Action" : "Acción"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overview.items.map((item) => {
                          const rowAiHref = buildAgentContextHref({
                            prompt: isEn
                              ? `What is the next best action for ${item.title}?`
                              : `¿Cuál es la siguiente mejor acción para ${item.title}?`,
                            context: {
                              source: "operations",
                              entityIds: [item.id],
                              filters: currentFilters,
                              summary: `${kindLabel(item.kind, isEn)} · ${item.title}`,
                              returnPath,
                              permissions: {
                                maySuggest: true,
                                mayExecuteLowRisk: true,
                                mayExecuteHighRisk: false,
                              },
                            },
                          });

                          const focused = Boolean(focusedItemId && focusedItemId === item.id);

                          return (
                            <TableRow
                              data-state={selectedTone(focused)}
                              key={`${item.kind}:${item.id}`}
                            >
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium">{item.title}</p>
                                    <StatusBadge
                                      label={kindLabel(item.kind, isEn)}
                                      tone={
                                        item.kind === "availability_conflict"
                                          ? "danger"
                                          : item.kind === "turnover"
                                            ? "info"
                                            : "neutral"
                                      }
                                      value={item.kind}
                                    />
                                  </div>
                                  <p className="text-muted-foreground text-xs">
                                    {[item.propertyName, item.unitName]
                                      .filter(Boolean)
                                      .join(" · ") || "—"}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  label={titleCase(item.status.replaceAll("_", " "))}
                                  value={item.status}
                                />
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  label={titleCase(item.priority)}
                                  tone={
                                    ["critical", "emergency", "urgent", "high"].includes(
                                      item.priority
                                    )
                                      ? "danger"
                                      : item.priority === "medium"
                                        ? "warning"
                                        : "neutral"
                                  }
                                  value={item.priority}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {[item.propertyName, item.unitName]
                                    .filter(Boolean)
                                    .join(" · ") || "—"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {item.assigneeName || (isEn ? "Unassigned" : "Sin asignar")}
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(item.dueAt, locale)}</TableCell>
                              <TableCell>
                                <StatusBadge
                                  label={slaLabel(item.slaState, isEn)}
                                  tone={
                                    item.slaState === "breached"
                                      ? "danger"
                                      : item.slaState === "watch"
                                        ? "warning"
                                        : "success"
                                  }
                                  value={item.slaState}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Button asChild size="sm">
                                    <Link href={item.primaryHref}>
                                      {isEn ? "Open" : "Abrir"}
                                    </Link>
                                  </Button>
                                  <Button asChild size="sm" variant="outline">
                                    <Link href={rowAiHref}>{isEn ? "Ask AI" : "IA"}</Link>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-sm">
                    <p className="text-muted-foreground">
                      {isEn
                        ? `Showing ${offset + 1}-${offset + overview.items.length}`
                        : `Mostrando ${offset + 1}-${offset + overview.items.length}`}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        disabled={offset <= 0}
                        onClick={() =>
                          updateParams({
                            offset: String(Math.max(offset - limit, 0)),
                            limit: String(limit),
                          })
                        }
                        type="button"
                        variant="outline"
                      >
                        {isEn ? "Previous" : "Anterior"}
                      </Button>
                      <Button
                        disabled={!hasMore}
                        onClick={() =>
                          updateParams({
                            offset: String(offset + limit),
                            limit: String(limit),
                          })
                        }
                        type="button"
                        variant="outline"
                      >
                        {isEn ? "Next" : "Siguiente"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Card data-testid="operations-empty-state">
                  <CardContent className="space-y-3 p-8 text-center">
                    <p className="font-semibold text-lg">
                      {isEn
                        ? "No work in this operations view"
                        : "No hay trabajo en esta vista operativa"}
                    </p>
                    <p className="mx-auto max-w-2xl text-muted-foreground text-sm">
                      {isEn
                        ? "Adjust the filters or jump into Reservations, Listings, or Calendar specialist actions. Calendar still exists, but the main daily queue now lives here."
                        : "Ajusta los filtros o entra a Reservas, Anuncios o acciones especialistas de Calendario. El calendario sigue existiendo, pero la cola diaria principal ahora vive aquí."}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button asChild variant="outline">
                        <Link href="/module/reservations">
                          {isEn ? "Open reservations" : "Abrir reservas"}
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link href={calendarSpecialistHref}>
                          {isEn ? "Open calendar specialist" : "Abrir calendario especialista"}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          }
        />
      </PageScaffold>
    </div>
  );
}
