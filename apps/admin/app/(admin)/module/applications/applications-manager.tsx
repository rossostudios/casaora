"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  convertApplicationToLeaseAction,
  setApplicationStatusAction,
} from "@/app/(admin)/module/applications/actions";
import {
  ApplicationMessageDrawer,
  type ApplicationMessageTemplateOption,
} from "@/app/(admin)/module/applications/components/application-message-drawer";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildAgentContextHref } from "@/lib/ai-context";
import { formatDateTime } from "@/lib/format";
import type {
  ApplicationsOverviewResponse,
  ApplicationsOverviewRow,
} from "@/lib/applications-overview";
import { useActiveLocale } from "@/lib/i18n/client";

type ApplicationsManagerProps = {
  orgId: string;
  overview: ApplicationsOverviewResponse;
  members: Record<string, unknown>[];
  messageTemplates: Record<string, unknown>[];
  initialFilters: {
    q: string;
    status: string;
    assignedUserId: string;
    listingId: string;
    propertyId: string;
    qualificationBand: string;
    responseSlaStatus: string;
    source: string;
    view: string;
    sort: string;
    limit: number;
    offset: number;
  };
  error?: string;
  success?: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildReturnPath(pathname: string, searchParams: URLSearchParams): string {
  const suffix = searchParams.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

function nextStatusFor(status: string): string | null {
  switch (status) {
    case "new":
      return "screening";
    case "screening":
      return "qualified";
    case "qualified":
      return "visit_scheduled";
    case "visit_scheduled":
      return "offer_sent";
    default:
      return null;
  }
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

function labelForBand(value: ApplicationsOverviewRow["qualificationBand"], isEn: boolean) {
  if (value === "strong") return isEn ? "Strong" : "Fuerte";
  if (value === "moderate") return isEn ? "Moderate" : "Moderado";
  return isEn ? "Watch" : "Revisar";
}

function labelForSla(value: ApplicationsOverviewRow["responseSlaStatus"], isEn: boolean) {
  if (value === "met") return isEn ? "SLA met" : "SLA cumplido";
  if (value === "breached") return isEn ? "SLA breached" : "SLA vencido";
  return isEn ? "Pending response" : "Pendiente";
}

export function ApplicationsManager({
  orgId,
  overview,
  members,
  messageTemplates,
  initialFilters,
  error,
  success,
}: ApplicationsManagerProps) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(initialFilters.q);
  const [messageRow, setMessageRow] = useState<ApplicationsOverviewRow | null>(null);

  useEffect(() => {
    setQuery(initialFilters.q);
  }, [initialFilters.q]);

  function updateParams(
    updates: Record<string, string | null | undefined>,
    options?: { replace?: boolean }
  ) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    if (!("offset" in updates)) {
      params.delete("offset");
    }
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
  }, [query, initialFilters.q]);

  const returnPath = useMemo(
    () => buildReturnPath(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams]
  );

  const memberOptions = useMemo(
    () =>
      members
        .map((member) => {
          const userId = asString(member.user_id);
          const appUserValue = member.app_users;
          const appUser =
            Array.isArray(appUserValue) && appUserValue.length > 0
              ? (appUserValue[0] as Record<string, unknown>)
              : (appUserValue as Record<string, unknown> | null);
          const label =
            asString(appUser?.full_name) ||
            asString(appUser?.email) ||
            asString(member.email) ||
            userId;
          return {
            id: userId,
            label,
          };
        })
        .filter((member) => member.id && member.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [members]
  );

  const templateOptions = useMemo<ApplicationMessageTemplateOption[]>(
    () =>
      messageTemplates
        .map((template) => ({
          id: asString(template.id),
          channel: asString(template.channel).toLowerCase(),
          name: asString(template.name),
          subject: asString(template.subject) || null,
          body: asString(template.body),
        }))
        .filter((template) => template.id && template.channel && template.body),
    [messageTemplates]
  );

  const currentFilters = useMemo(
    () =>
      Object.fromEntries(
        [
          ["q", initialFilters.q],
          ["status", initialFilters.status],
          ["assigned_user_id", initialFilters.assignedUserId],
          ["listing_id", initialFilters.listingId],
          ["property_id", initialFilters.propertyId],
          ["qualification_band", initialFilters.qualificationBand],
          ["response_sla_status", initialFilters.responseSlaStatus],
          ["source", initialFilters.source],
          ["view", initialFilters.view],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]))
      ),
    [
      initialFilters.assignedUserId,
      initialFilters.listingId,
      initialFilters.propertyId,
      initialFilters.q,
      initialFilters.qualificationBand,
      initialFilters.responseSlaStatus,
      initialFilters.source,
      initialFilters.status,
      initialFilters.view,
    ]
  );

  const askAiHref = buildAgentContextHref({
    prompt: isEn
      ? "What should I do next in this applications queue?"
      : "¿Qué debería hacer ahora en esta cola de aplicaciones?",
    context: {
      source: "applications",
      entityIds: overview.rows.map((row) => row.id),
      filters: currentFilters,
      summary: isEn
        ? `Applications queue with ${overview.rows.length} rows, ${overview.summary.needsResponse} needing response, and ${overview.summary.qualifiedReady} ready to convert.`
        : `Cola de aplicaciones con ${overview.rows.length} filas, ${overview.summary.needsResponse} pendientes y ${overview.summary.qualifiedReady} listas para convertir.`,
      returnPath,
    },
  });

  const offset = overview.pagination.offset;
  const limit = overview.pagination.limit;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={askAiHref}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/module/listings">
                {isEn ? "Open listings" : "Abrir listings"}
              </Link>
            </Button>
          </>
        }
        description={
          isEn
            ? "Run leasing operations from one queue. Filter applicants, open the workbench, send follow-ups, and convert only when the record is ready."
            : "Opera leasing desde una sola cola. Filtra postulantes, abre el workbench, envía seguimientos y convierte solo cuando el registro esté listo."
        }
        eyebrow={isEn ? "Leasing" : "Leasing"}
        title={isEn ? "Applications" : "Aplicaciones"}
      >
        <div className="grid gap-4 md:grid-cols-4" data-testid="applications-summary-band">
          <SummaryCard
            detail={isEn ? "records in current view" : "registros en vista"}
            label={isEn ? "Applications" : "Aplicaciones"}
            value={String(overview.summary.totalApplications)}
          />
          <SummaryCard
            detail={isEn ? "reply before SLA breach" : "responder antes del SLA"}
            label={isEn ? "Needs response" : "Necesitan respuesta"}
            value={String(overview.summary.needsResponse)}
          />
          <SummaryCard
            detail={isEn ? "ready to convert" : "listas para convertir"}
            label={isEn ? "Qualified" : "Calificadas"}
            value={String(overview.summary.qualifiedReady)}
          />
          <SummaryCard
            detail={isEn ? "stalled or lost" : "estancadas o perdidas"}
            label={isEn ? "Stalled / failed" : "Estancadas / perdidas"}
            value={String(overview.summary.stalledOrFailed)}
          />
        </div>

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

        <div className="sticky top-16 z-20 space-y-3 bg-background py-1">
          <div className="flex flex-wrap gap-2">
            {overview.savedViews.map((view) => {
              const selected = (initialFilters.view || "all") === view.id;
              const params = new URLSearchParams(searchParams.toString());
              params.delete("offset");
              if (view.id === "all") params.delete("view");
              else params.set("view", view.id);
              const next = params.toString();
              const href = next ? `${pathname}?${next}` : pathname;
              return (
                <Button
                  asChild
                  key={view.id}
                  size="sm"
                  variant={selected ? "default" : "outline"}
                >
                  <Link href={href}>
                    {view.id.replaceAll("_", " ")} · {view.count}
                  </Link>
                </Button>
              );
            })}
          </div>

          <div className="grid gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm md:grid-cols-4 xl:grid-cols-5">
            <Input
              aria-label={isEn ? "Search applications" : "Buscar aplicaciones"}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isEn ? "Search applicant, listing, property..." : "Buscar postulante, listing, propiedad..."}
              value={query}
            />
            <Select
              aria-label={isEn ? "Filter by status" : "Filtrar por estado"}
              onChange={(event) => updateParams({ status: event.target.value || null })}
              value={initialFilters.status}
            >
              <option value="">{isEn ? "All statuses" : "Todos los estados"}</option>
              <option value="new">{isEn ? "New" : "Nuevo"}</option>
              <option value="screening">{isEn ? "Screening" : "Evaluacion"}</option>
              <option value="qualified">{isEn ? "Qualified" : "Calificado"}</option>
              <option value="visit_scheduled">{isEn ? "Visit scheduled" : "Visita agendada"}</option>
              <option value="offer_sent">{isEn ? "Offer sent" : "Oferta enviada"}</option>
              <option value="contract_signed">{isEn ? "Contract signed" : "Contrato firmado"}</option>
              <option value="rejected">{isEn ? "Rejected" : "Rechazado"}</option>
              <option value="lost">{isEn ? "Lost" : "Perdido"}</option>
            </Select>
            <Select
              aria-label={isEn ? "Filter by assignee" : "Filtrar por responsable"}
              onChange={(event) =>
                updateParams({ assigned_user_id: event.target.value || null })
              }
              value={initialFilters.assignedUserId}
            >
              <option value="">{isEn ? "All assignees" : "Todos los responsables"}</option>
              <option value="__unassigned__">
                {isEn ? "Unassigned" : "Sin asignar"}
              </option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </Select>
            <Select
              aria-label={isEn ? "Filter by qualification" : "Filtrar por calificacion"}
              onChange={(event) =>
                updateParams({ qualification_band: event.target.value || null })
              }
              value={initialFilters.qualificationBand}
            >
              <option value="">{isEn ? "All qualification" : "Toda la calificacion"}</option>
              <option value="strong">{isEn ? "Strong" : "Fuerte"}</option>
              <option value="moderate">{isEn ? "Moderate" : "Moderado"}</option>
              <option value="watch">{isEn ? "Watch" : "Revisar"}</option>
            </Select>
            <Select
              aria-label={isEn ? "Sort applications" : "Ordenar aplicaciones"}
              onChange={(event) => updateParams({ sort: event.target.value || null })}
              value={initialFilters.sort}
            >
              <option value="last_touch_desc">{isEn ? "Last touch" : "Ultimo movimiento"}</option>
              <option value="qualification_desc">{isEn ? "Qualification" : "Calificacion"}</option>
              <option value="sla_desc">{isEn ? "SLA urgency" : "Urgencia SLA"}</option>
              <option value="created_desc">{isEn ? "Newest first" : "Mas nuevas"}</option>
            </Select>
            <Select
              aria-label={isEn ? "Filter by property" : "Filtrar por propiedad"}
              onChange={(event) => updateParams({ property_id: event.target.value || null })}
              value={initialFilters.propertyId}
            >
              <option value="">{isEn ? "All properties" : "Todas las propiedades"}</option>
              {overview.facets.properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label={isEn ? "Filter by listing" : "Filtrar por listing"}
              onChange={(event) => updateParams({ listing_id: event.target.value || null })}
              value={initialFilters.listingId}
            >
              <option value="">{isEn ? "All listings" : "Todos los listings"}</option>
              {overview.facets.listings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label={isEn ? "Filter by SLA" : "Filtrar por SLA"}
              onChange={(event) =>
                updateParams({ response_sla_status: event.target.value || null })
              }
              value={initialFilters.responseSlaStatus}
            >
              <option value="">{isEn ? "All SLA states" : "Todos los SLA"}</option>
              <option value="pending">{isEn ? "Pending" : "Pendiente"}</option>
              <option value="met">{isEn ? "Met" : "Cumplido"}</option>
              <option value="breached">{isEn ? "Breached" : "Vencido"}</option>
            </Select>
            <Select
              aria-label={isEn ? "Filter by source" : "Filtrar por origen"}
              onChange={(event) => updateParams({ source: event.target.value || null })}
              value={initialFilters.source}
            >
              <option value="">{isEn ? "All sources" : "Todos los origenes"}</option>
              {overview.facets.sources.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.value}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Keep the queue narrow: resolve stalled replies, review intake failures, and launch AI with the current filters."
                  : "Mantén la cola enfocada: resuelve respuestas estancadas, revisa fallos de intake y lanza IA con los filtros actuales."
              }
              title={isEn ? "Queue actions" : "Acciones"}
            >
              <div
                className="rounded-xl border border-border/60 bg-muted/20 p-3"
                data-testid="applications-intake-health"
              >
                <p className="font-medium text-sm">
                  {isEn ? "Failed public submissions" : "Envios publicos fallidos"}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {overview.intakeHealth.failedSubmissions}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="font-medium text-sm">
                  {isEn ? "Stalled 48h applications" : "Aplicaciones estancadas 48h"}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {overview.intakeHealth.stalledApplications}
                </p>
              </div>
              <Button
                className="w-full justify-start"
                onClick={() => updateParams({ view: "needs_response" })}
                type="button"
                variant="outline"
              >
                {isEn ? "Open needs response" : "Abrir pendientes"}
              </Button>
              <Button
                className="w-full justify-start"
                onClick={() => updateParams({ view: "stalled_or_failed" })}
                type="button"
                variant="outline"
              >
                {isEn ? "Open stalled / failed" : "Abrir estancadas / perdidas"}
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href={askAiHref}>
                  {isEn ? "Ask AI about this queue" : "Preguntar a IA por esta cola"}
                </Link>
              </Button>
            </ActionRail>
          }
          primary={
            <Card className="border border-border/60 bg-card/80 shadow-sm">
              <CardContent className="space-y-4 p-0">
                {overview.rows.length === 0 ? (
                  <div
                    className="space-y-4 px-6 py-12 text-center"
                    data-testid="applications-empty-state"
                  >
                    <h2 className="font-semibold text-xl">
                      {isEn ? "No applications in this view" : "No hay aplicaciones en esta vista"}
                    </h2>
                    <p className="mx-auto max-w-2xl text-muted-foreground text-sm">
                      {isEn
                        ? "Applications appear here once marketplace or manual intake creates submissions. Adjust the filters or review published listings."
                        : "Las aplicaciones aparecerán aquí cuando marketplace o intake manual creen envíos. Ajusta filtros o revisa listings publicados."}
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button asChild>
                        <Link href="/module/listings">
                          {isEn ? "Open listings" : "Abrir listings"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto" data-testid="applications-queue-table">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-border/60 border-b bg-muted/30 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">{isEn ? "Applicant" : "Postulante"}</th>
                            <th className="px-4 py-3 font-medium">{isEn ? "Listing / property" : "Listing / propiedad"}</th>
                            <th className="px-4 py-3 font-medium">{isEn ? "Status" : "Estado"}</th>
                            <th className="px-4 py-3 font-medium">{isEn ? "Assignee" : "Responsable"}</th>
                            <th className="px-4 py-3 font-medium">{isEn ? "Qualification" : "Calificacion"}</th>
                            <th className="px-4 py-3 font-medium">SLA</th>
                            <th className="px-4 py-3 font-medium">{isEn ? "Last touch" : "Ultimo movimiento"}</th>
                            <th className="px-4 py-3 font-medium">{isEn ? "Source" : "Origen"}</th>
                            <th className="px-4 py-3 font-medium">{isEn ? "Actions" : "Acciones"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.rows.map((row) => {
                            const detailHref = `${row.primaryHref}?return_to=${encodeURIComponent(returnPath)}`;
                            const nextStatus = nextStatusFor(row.status);
                            return (
                              <tr className="border-border/50 border-b align-top" key={row.id}>
                                <td className="px-4 py-4">
                                  <div className="space-y-1">
                                    <p className="font-medium">{row.applicantName}</p>
                                    <p className="text-muted-foreground text-xs">{row.email}</p>
                                    {row.phoneE164 ? (
                                      <p className="text-muted-foreground text-xs">{row.phoneE164}</p>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="space-y-1">
                                    <p className="font-medium">
                                      {row.listingTitle || (isEn ? "Unlinked listing" : "Sin listing")}
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
                                      {row.propertyId && row.propertyName ? (
                                        <Link className="underline decoration-dotted underline-offset-2" href={`/module/properties/${row.propertyId}`}>
                                          {row.propertyName}
                                        </Link>
                                      ) : null}
                                      {row.unitId && row.unitName ? (
                                        <Link className="underline decoration-dotted underline-offset-2" href={`/module/units/${row.unitId}`}>
                                          {row.unitName}
                                        </Link>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <StatusBadge label={row.statusLabel} value={row.status} />
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  {row.assignedUserName || (isEn ? "Unassigned" : "Sin asignar")}
                                </td>
                                <td className="px-4 py-4">
                                  <div className="space-y-2">
                                    <StatusBadge
                                      label={labelForBand(row.qualificationBand, isEn)}
                                      value={row.qualificationBand}
                                    />
                                    <p className="text-muted-foreground text-xs">
                                      {row.qualificationScore}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="space-y-2">
                                    <StatusBadge
                                      label={labelForSla(row.responseSlaStatus, isEn)}
                                      value={row.responseSlaStatus}
                                    />
                                    <p className="text-muted-foreground text-xs">
                                      {row.responseSlaAlertLevel}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-muted-foreground text-sm">
                                  {formatDateTime(row.lastTouchAt, locale)}
                                </td>
                                <td className="px-4 py-4 text-muted-foreground text-sm">
                                  {row.source}
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-wrap gap-2">
                                    <Button asChild size="sm" variant="outline">
                                      <Link href={detailHref}>
                                        {isEn ? "Open" : "Abrir"}
                                      </Link>
                                    </Button>
                                    <Button
                                      onClick={() => setMessageRow(row)}
                                      size="sm"
                                      type="button"
                                      variant="outline"
                                    >
                                      {isEn ? "Follow up" : "Seguimiento"}
                                    </Button>
                                    {nextStatus ? (
                                      <form action={setApplicationStatusAction}>
                                        <input name="application_id" type="hidden" value={row.id} />
                                        <input name="status" type="hidden" value={nextStatus} />
                                        <input name="next" type="hidden" value={returnPath} />
                                        <Button size="sm" type="submit" variant="outline">
                                          {isEn ? "Advance" : "Avanzar"}
                                        </Button>
                                      </form>
                                    ) : null}
                                    {["qualified", "visit_scheduled", "offer_sent"].includes(
                                      row.status
                                    ) ? (
                                      <form action={convertApplicationToLeaseAction}>
                                        <input name="application_id" type="hidden" value={row.id} />
                                        <input
                                          name="starts_on"
                                          type="hidden"
                                          value={new Date().toISOString().slice(0, 10)}
                                        />
                                        <input name="platform_fee" type="hidden" value="0" />
                                        <input name="next" type="hidden" value={returnPath} />
                                        <Button size="sm" type="submit" variant="outline">
                                          {isEn ? "Convert" : "Convertir"}
                                        </Button>
                                      </form>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between px-4 pb-4">
                      <p className="text-muted-foreground text-sm">
                        {isEn
                          ? `Showing ${offset + 1}-${Math.min(offset + limit, overview.pagination.total)} of ${overview.pagination.total}`
                          : `Mostrando ${offset + 1}-${Math.min(offset + limit, overview.pagination.total)} de ${overview.pagination.total}`}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          disabled={offset <= 0}
                          onClick={() =>
                            updateParams({ offset: String(Math.max(0, offset - limit)) })
                          }
                          type="button"
                          variant="outline"
                        >
                          {isEn ? "Previous" : "Anterior"}
                        </Button>
                        <Button
                          disabled={!overview.pagination.hasMore}
                          onClick={() =>
                            updateParams({ offset: String(offset + limit) })
                          }
                          type="button"
                          variant="outline"
                        >
                          {isEn ? "Next" : "Siguiente"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          }
        />
      </PageScaffold>

      {messageRow ? (
        <ApplicationMessageDrawer
          applicantName={messageRow.applicantName}
          applicationId={messageRow.id}
          email={messageRow.email || null}
          isEn={isEn}
          onOpenChange={(open) => {
            if (!open) setMessageRow(null);
          }}
          open
          orgId={orgId}
          phoneE164={messageRow.phoneE164}
          returnTo={returnPath}
          templates={templateOptions}
        />
      ) : null}
    </div>
  );
}
