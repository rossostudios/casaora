"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { transitionReservationStatusAction } from "@/app/(admin)/module/reservations/actions";
import { ReservationFormSheet } from "@/app/(admin)/module/reservations/reservation-form-sheet";
import { SendGuestPortalLink } from "@/components/reservations/send-guest-portal-link";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildAgentContextHref } from "@/lib/ai-context";
import { formatCurrency } from "@/lib/format";
import type {
  ReservationOverviewRow,
  ReservationsOverviewResponse,
} from "@/lib/reservations-overview";
import { ManualBlockDrawer } from "./components/manual-block-drawer";

type ReservationsManagerProps = {
  orgId: string;
  locale: string;
  overview: ReservationsOverviewResponse;
  properties: Record<string, unknown>[];
  units: Record<string, unknown>[];
  guests: Record<string, unknown>[];
  initialFilters: {
    q: string;
    status: string;
    source: string;
    propertyId: string;
    unitId: string;
    stayPhase: string;
    from: string;
    to: string;
    view: string;
    sort: string;
    limit: number;
    offset: number;
  };
  error?: string;
  success?: string;
};

type Option = {
  id: string;
  label: string;
};

type BlockTarget = {
  unitId: string;
  label: string;
  startsOn?: string;
  endsOn?: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildReturnPath(pathname: string, searchParams: URLSearchParams): string {
  const suffix = searchParams.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

function nextStatusAction(
  row: ReservationOverviewRow,
  isEn: boolean
): { status: string; label: string } | null {
  switch (row.status) {
    case "pending":
      return { status: "confirmed", label: isEn ? "Confirm" : "Confirmar" };
    case "confirmed":
      return { status: "checked_in", label: isEn ? "Check in" : "Check in" };
    case "checked_in":
      return { status: "checked_out", label: isEn ? "Check out" : "Check out" };
    default:
      return null;
  }
}

function stayPhaseLabel(value: string, isEn: boolean): string {
  switch (value) {
    case "arriving_today":
      return isEn ? "Arriving today" : "Llegan hoy";
    case "departing_today":
      return isEn ? "Departing today" : "Salen hoy";
    case "in_house":
      return isEn ? "In house" : "En estadia";
    case "upcoming":
      return isEn ? "Upcoming" : "Próxima";
    case "cancelled":
      return isEn ? "Cancelled" : "Cancelada";
    default:
      return isEn ? "Completed" : "Completada";
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

export function ReservationsManager({
  orgId,
  locale,
  overview,
  properties,
  units,
  guests,
  initialFilters,
  error,
  success,
}: ReservationsManagerProps) {
  const isEn = locale === "en-US";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(initialFilters.q);
  const [createOpen, setCreateOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState<BlockTarget | null>(null);

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

  const allUnitOptions = useMemo<
    Array<Option & { propertyId: string }>
  >(
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

  const filteredUnitOptions = useMemo(
    () =>
      initialFilters.propertyId
        ? allUnitOptions.filter((unit) => unit.propertyId === initialFilters.propertyId)
        : allUnitOptions,
    [allUnitOptions, initialFilters.propertyId]
  );

  const guestOptions = useMemo<Option[]>(
    () =>
      guests
        .map((guest) => {
          const id = asString(guest.id);
          const name = asString(guest.full_name) || asString(guest.name);
          const email = asString(guest.email);
          return {
            id,
            label: email ? `${name} · ${email}` : name,
          };
        })
        .filter((guest) => guest.id && guest.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [guests]
  );

  const currentFilters = useMemo(
    () =>
      Object.fromEntries(
        [
          ["q", initialFilters.q],
          ["status", initialFilters.status],
          ["source", initialFilters.source],
          ["property_id", initialFilters.propertyId],
          ["unit_id", initialFilters.unitId],
          ["stay_phase", initialFilters.stayPhase],
          ["from", initialFilters.from],
          ["to", initialFilters.to],
          ["view", initialFilters.view],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]))
      ),
    [
      initialFilters.from,
      initialFilters.propertyId,
      initialFilters.q,
      initialFilters.source,
      initialFilters.stayPhase,
      initialFilters.status,
      initialFilters.to,
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
      ? "What needs attention in this reservations queue?"
      : "¿Qué necesita atención en esta cola de reservas?",
    context: {
      source: "reservations",
      entityIds: overview.rows.map((row) => row.id),
      filters: currentFilters,
      summary: isEn
        ? `${overview.summary.arrivalsToday} arrivals today, ${overview.summary.departuresToday} departures today, ${overview.summary.inHouse} in house, ${overview.summary.needsAttention} need attention.`
        : `${overview.summary.arrivalsToday} llegadas hoy, ${overview.summary.departuresToday} salidas hoy, ${overview.summary.inHouse} en estadia, ${overview.summary.needsAttention} necesitan atención.`,
      returnPath,
    },
  });

  const attentionRows = overview.rows.filter(
    (row) =>
      row.status === "pending" ||
      row.status === "no_show" ||
      !row.guestId ||
      row.openTasks > 0
  );

  const offset = Math.max(initialFilters.offset, 0);
  const limit = Math.max(initialFilters.limit, 1);
  const hasMore = overview.rows.length >= limit;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={askAiHref}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)} type="button">
              {isEn ? "Create reservation" : "Crear reserva"}
            </Button>
          </>
        }
        description={
          isEn
            ? "Track arrivals, departures, in-house stays, and reservation exceptions from one operational queue."
            : "Controla llegadas, salidas, estadias activas y excepciones desde una sola cola operativa."
        }
        eyebrow={isEn ? "Operations" : "Operaciones"}
        title={isEn ? "Reservations" : "Reservas"}
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
          data-testid="reservations-summary-band"
        >
          <SummaryCard
            detail={isEn ? "scheduled to arrive" : "programadas para llegar"}
            label={isEn ? "Arrivals today" : "Llegadas hoy"}
            value={String(overview.summary.arrivalsToday)}
          />
          <SummaryCard
            detail={isEn ? "scheduled to depart" : "programadas para salir"}
            label={isEn ? "Departures today" : "Salidas hoy"}
            value={String(overview.summary.departuresToday)}
          />
          <SummaryCard
            detail={isEn ? "currently checked in" : "actualmente hospedados"}
            label={isEn ? "In house" : "En estadia"}
            value={String(overview.summary.inHouse)}
          />
          <SummaryCard
            detail={isEn ? "need follow-up" : "requieren seguimiento"}
            label={isEn ? "Needs attention" : "Necesitan atención"}
            value={String(overview.summary.needsAttention)}
          />
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Keep the queue focused on real operations: arrivals, departures, guest comms, and manual blocks."
                  : "Mantén la cola enfocada en operación real: llegadas, salidas, comunicación y bloqueos manuales."
              }
              title={isEn ? "Next actions" : "Próximas acciones"}
            >
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/module/calendar">
                  {isEn ? "Open calendar" : "Abrir calendario"}
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/module/tasks">
                  {isEn ? "Open tasks" : "Abrir tareas"}
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href={askAiHref}>{isEn ? "Ask AI with this queue" : "Preguntar a IA con esta cola"}</Link>
              </Button>

              <div className="space-y-2 pt-2">
                <p className="font-medium text-sm">
                  {isEn ? "Attention items" : "Items con atención"}
                </p>
                {attentionRows.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {isEn
                      ? "No urgent reservation issues in the current view."
                      : "No hay incidencias urgentes en esta vista."}
                  </p>
                ) : (
                  attentionRows.slice(0, 5).map((row) => (
                    <Link
                      className="block rounded-xl border border-border/60 px-3 py-2 transition hover:border-foreground/20 hover:bg-muted/40"
                      href={`${row.primaryHref}?return_to=${encodeURIComponent(returnPath)}`}
                      key={row.id}
                    >
                      <p className="font-medium text-sm">{row.guestName || (isEn ? "Unassigned guest" : "Huésped sin asignar")}</p>
                      <p className="text-muted-foreground text-xs">
                        {[row.propertyName, row.unitName, stayPhaseLabel(row.stayPhase, isEn)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </ActionRail>
          }
          primary={
            <div className="space-y-5">
              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Field
                      htmlFor="reservations-search"
                      label={isEn ? "Search reservations" : "Buscar reservas"}
                    >
                      <Input
                        aria-label={isEn ? "Search reservations" : "Buscar reservas"}
                        id="reservations-search"
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={isEn ? "Guest, property, unit" : "Huésped, propiedad, unidad"}
                        value={query}
                      />
                    </Field>

                    <Field htmlFor="reservations-view" label={isEn ? "Saved view" : "Vista"}>
                      <Select
                        id="reservations-view"
                        onChange={(event) =>
                          updateParams({ view: event.target.value || null })
                        }
                        value={initialFilters.view}
                      >
                        <option value="all">{isEn ? "All" : "Todas"}</option>
                        <option value="arrivals_today">
                          {isEn ? "Arrivals today" : "Llegadas hoy"}
                        </option>
                        <option value="departures_today">
                          {isEn ? "Departures today" : "Salidas hoy"}
                        </option>
                        <option value="in_house">{isEn ? "In house" : "En estadia"}</option>
                        <option value="needs_attention">
                          {isEn ? "Needs attention" : "Necesitan atención"}
                        </option>
                      </Select>
                    </Field>

                    <Field htmlFor="reservations-status" label={isEn ? "Status" : "Estado"}>
                      <Select
                        id="reservations-status"
                        onChange={(event) =>
                          updateParams({ status: event.target.value || null })
                        }
                        value={initialFilters.status}
                      >
                        <option value="">{isEn ? "All statuses" : "Todos los estados"}</option>
                        <option value="pending">{isEn ? "Pending" : "Pendiente"}</option>
                        <option value="confirmed">{isEn ? "Confirmed" : "Confirmada"}</option>
                        <option value="checked_in">{isEn ? "Checked in" : "Check in"}</option>
                        <option value="checked_out">{isEn ? "Checked out" : "Check out"}</option>
                        <option value="cancelled">{isEn ? "Cancelled" : "Cancelada"}</option>
                        <option value="no_show">{isEn ? "No show" : "No show"}</option>
                      </Select>
                    </Field>

                    <Field htmlFor="reservations-property" label={isEn ? "Property" : "Propiedad"}>
                      <Select
                        id="reservations-property"
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

                    <Field htmlFor="reservations-unit" label={isEn ? "Unit" : "Unidad"}>
                      <Select
                        id="reservations-unit"
                        onChange={(event) =>
                          updateParams({ unit_id: event.target.value || null })
                        }
                        value={initialFilters.unitId}
                      >
                        <option value="">{isEn ? "All units" : "Todas las unidades"}</option>
                        {filteredUnitOptions.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Field htmlFor="reservations-source" label={isEn ? "Source" : "Origen"}>
                      <Select
                        id="reservations-source"
                        onChange={(event) =>
                          updateParams({ source: event.target.value || null })
                        }
                        value={initialFilters.source}
                      >
                        <option value="">{isEn ? "All sources" : "Todos los orígenes"}</option>
                        <option value="manual">{isEn ? "Manual" : "Manual"}</option>
                        <option value="marketplace">
                          {isEn ? "Casaora Marketplace" : "Marketplace Casaora"}
                        </option>
                        <option value="direct_booking">{isEn ? "Casaora direct" : "Directo Casaora"}</option>
                      </Select>
                    </Field>

                    <Field htmlFor="reservations-stay-phase" label={isEn ? "Stay phase" : "Fase"}>
                      <Select
                        id="reservations-stay-phase"
                        onChange={(event) =>
                          updateParams({ stay_phase: event.target.value || null })
                        }
                        value={initialFilters.stayPhase}
                      >
                        <option value="">{isEn ? "All phases" : "Todas las fases"}</option>
                        <option value="arriving_today">{isEn ? "Arriving today" : "Llegan hoy"}</option>
                        <option value="departing_today">{isEn ? "Departing today" : "Salen hoy"}</option>
                        <option value="in_house">{isEn ? "In house" : "En estadia"}</option>
                        <option value="upcoming">{isEn ? "Upcoming" : "Próximas"}</option>
                        <option value="completed">{isEn ? "Completed" : "Completadas"}</option>
                        <option value="cancelled">{isEn ? "Cancelled" : "Canceladas"}</option>
                      </Select>
                    </Field>

                    <Field htmlFor="reservations-from" label={isEn ? "From" : "Desde"}>
                      <Input
                        id="reservations-from"
                        onChange={(event) =>
                          updateParams({ from: event.target.value || null })
                        }
                        type="date"
                        value={initialFilters.from}
                      />
                    </Field>

                    <Field htmlFor="reservations-to" label={isEn ? "To" : "Hasta"}>
                      <Input
                        id="reservations-to"
                        onChange={(event) =>
                          updateParams({ to: event.target.value || null })
                        }
                        type="date"
                        value={initialFilters.to}
                      />
                    </Field>

                    <Field htmlFor="reservations-sort" label={isEn ? "Sort" : "Orden"}>
                      <Select
                        id="reservations-sort"
                        onChange={(event) =>
                          updateParams({ sort: event.target.value || null })
                        }
                        value={initialFilters.sort}
                      >
                        <option value="check_in_asc">{isEn ? "Check-in" : "Check-in"}</option>
                        <option value="check_out_asc">{isEn ? "Check-out" : "Check-out"}</option>
                        <option value="guest_asc">{isEn ? "Guest A-Z" : "Huésped A-Z"}</option>
                        <option value="total_desc">{isEn ? "Total high to low" : "Total mayor a menor"}</option>
                      </Select>
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {overview.rows.length === 0 ? (
                <Card
                  className="border border-dashed border-border/70 bg-card/60"
                  data-testid="reservations-empty-state"
                >
                  <CardContent className="space-y-4 p-8">
                    <div className="space-y-2">
                      <h2 className="font-semibold text-xl">
                        {isEn ? "No reservations in this view" : "No hay reservas en esta vista"}
                      </h2>
                      <p className="max-w-2xl text-muted-foreground text-sm">
                        {isEn
                          ? "Create a reservation, adjust the filters, or open Calendar if you need a specialist scheduling view."
                          : "Crea una reserva, ajusta los filtros u abre Calendario si necesitas la vista especializada de agenda."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setCreateOpen(true)} type="button">
                        {isEn ? "Create reservation" : "Crear reserva"}
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/module/calendar">
                          {isEn ? "Open calendar" : "Abrir calendario"}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-border/60 bg-card/80 shadow-sm">
                  <CardContent className="overflow-x-auto p-0">
                    <table
                      className="min-w-full divide-y divide-border/60 text-sm"
                      data-testid="reservations-queue-table"
                    >
                      <thead className="bg-muted/30">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-4 py-3 font-medium">{isEn ? "Guest" : "Huésped"}</th>
                          <th className="px-4 py-3 font-medium">{isEn ? "Property / unit" : "Propiedad / unidad"}</th>
                          <th className="px-4 py-3 font-medium">{isEn ? "Stay dates" : "Fechas"}</th>
                          <th className="px-4 py-3 font-medium">{isEn ? "Status" : "Estado"}</th>
                          <th className="px-4 py-3 font-medium">{isEn ? "Source" : "Origen"}</th>
                          <th className="px-4 py-3 font-medium">{isEn ? "Total / paid" : "Total / pagado"}</th>
                          <th className="px-4 py-3 font-medium">{isEn ? "Open tasks" : "Tareas abiertas"}</th>
                          <th className="px-4 py-3 font-medium">{isEn ? "Actions" : "Acciones"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {overview.rows.map((row) => {
                          const nextAction = nextStatusAction(row, isEn);
                          const detailHref = `${row.primaryHref}?return_to=${encodeURIComponent(returnPath)}`;
                          return (
                            <tr className="align-top" key={row.id}>
                              <td className="space-y-1 px-4 py-4">
                                <Link
                                  className="font-medium transition hover:text-primary"
                                  href={detailHref}
                                >
                                  {row.guestName || (isEn ? "Guest not linked" : "Sin huésped")}
                                </Link>
                                <p className="text-muted-foreground text-xs">
                                  {stayPhaseLabel(row.stayPhase, isEn)}
                                </p>
                              </td>
                              <td className="space-y-1 px-4 py-4">
                                <p>{[row.propertyName, row.unitName].filter(Boolean).join(" · ") || "—"}</p>
                                {row.listingSlug ? (
                                  <Link
                                    className="text-muted-foreground text-xs underline-offset-4 hover:underline"
                                    href={`/marketplace/${row.listingSlug}`}
                                    target="_blank"
                                  >
                                    {isEn ? "Marketplace preview" : "Vista marketplace"}
                                  </Link>
                                ) : null}
                              </td>
                              <td className="space-y-1 px-4 py-4">
                                <p>
                                  {row.checkInDate} → {row.checkOutDate}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {row.nights} {isEn ? "nights" : "noches"}
                                </p>
                              </td>
                              <td className="space-y-2 px-4 py-4">
                                <StatusBadge label={row.statusLabel} value={row.status} />
                                <StatusBadge
                                  label={stayPhaseLabel(row.stayPhase, isEn)}
                                  value={row.stayPhase}
                                />
                              </td>
                              <td className="space-y-1 px-4 py-4">
                                <p>{row.sourceLabel}</p>
                                <p className="text-muted-foreground text-xs">{row.source}</p>
                              </td>
                              <td className="space-y-1 px-4 py-4">
                                <p>{formatCurrency(row.totalAmount, row.currency, locale)}</p>
                                <p className="text-muted-foreground text-xs">
                                  {isEn ? "Paid" : "Pagado"}:{" "}
                                  {formatCurrency(row.amountPaid, row.currency, locale)}
                                </p>
                              </td>
                              <td className="px-4 py-4">
                                <span className="font-medium">{row.openTasks}</span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex min-w-[12rem] flex-col gap-2">
                                  <Button asChild size="sm" variant="outline">
                                    <Link href={detailHref}>
                                      {isEn ? "Open" : "Abrir"}
                                    </Link>
                                  </Button>
                                  {nextAction ? (
                                    <form action={transitionReservationStatusAction}>
                                      <input name="next" type="hidden" value={returnPath} />
                                      <input name="reservation_id" type="hidden" value={row.id} />
                                      <input name="status" type="hidden" value={nextAction.status} />
                                      <Button className="w-full" size="sm" type="submit" variant="outline">
                                        {nextAction.label}
                                      </Button>
                                    </form>
                                  ) : null}
                                  {row.guestPortalEligible ? (
                                    <SendGuestPortalLink
                                      buttonClassName="w-full justify-center"
                                      buttonLabel={isEn ? "Send portal link" : "Enviar portal"}
                                      isEn={isEn}
                                      reservationId={row.id}
                                      size="sm"
                                      successLabel={isEn ? "Portal link sent" : "Portal enviado"}
                                      variant="outline"
                                    />
                                  ) : null}
                                  {row.unitId ? (
                                    <Button
                                      onClick={() =>
                                        setBlockTarget({
                                          unitId: row.unitId!,
                                          label:
                                            [row.propertyName, row.unitName]
                                              .filter(Boolean)
                                              .join(" · ") || (isEn ? "Unit" : "Unidad"),
                                          startsOn: row.checkInDate,
                                          endsOn: row.checkOutDate,
                                        })
                                      }
                                      size="sm"
                                      type="button"
                                      variant="outline"
                                    >
                                      {isEn ? "Create block" : "Crear bloqueo"}
                                    </Button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                  {isEn
                    ? `Showing ${offset + 1}-${offset + overview.rows.length}`
                    : `Mostrando ${offset + 1}-${offset + overview.rows.length}`}
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={offset <= 0}
                    onClick={() =>
                      updateParams({ offset: String(Math.max(offset - limit, 0)) })
                    }
                    type="button"
                    variant="outline"
                  >
                    {isEn ? "Previous" : "Anterior"}
                  </Button>
                  <Button
                    disabled={!hasMore}
                    onClick={() => updateParams({ offset: String(offset + limit) })}
                    type="button"
                    variant="outline"
                  >
                    {isEn ? "Next" : "Siguiente"}
                  </Button>
                </div>
              </div>
            </div>
          }
        />
      </PageScaffold>

      <ReservationFormSheet
        guestOptions={guestOptions}
        isEn={isEn}
        locale={locale}
        onOpenChange={setCreateOpen}
        open={createOpen}
        orgId={orgId}
        propertyOptions={propertyOptions}
        returnTo={returnPath}
        unitOptions={allUnitOptions}
      />

      <ManualBlockDrawer
        isEn={isEn}
        onOpenChange={(open) => {
          if (!open) setBlockTarget(null);
        }}
        open={Boolean(blockTarget)}
        orgId={orgId}
        preset={blockTarget}
      />
    </div>
  );
}
