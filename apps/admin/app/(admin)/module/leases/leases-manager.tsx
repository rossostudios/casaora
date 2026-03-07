"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  sendRenewalOfferAction,
  setLeaseStatusAction,
} from "@/app/(admin)/module/leases/actions";
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
  LeasesOverviewResponse,
  LeasesOverviewRow,
} from "@/lib/leases-overview";
import { LeaseFormSheet } from "./lease-form-sheet";

type LeasesManagerProps = {
  orgId: string;
  locale: string;
  overview: LeasesOverviewResponse;
  properties: Record<string, unknown>[];
  units: Record<string, unknown>[];
  initialFilters: {
    q: string;
    leaseStatus: string;
    renewalStatus: string;
    propertyId: string;
    unitId: string;
    view: string;
    sort: string;
    offset: number;
  };
  openCreateOnLoad?: boolean;
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

function statusAction(
  row: LeasesOverviewRow,
): { status: string; label: string } | null {
  switch (row.leaseStatus) {
    case "draft":
      return { status: "active", label: "Activate" };
    case "active":
    case "delinquent":
      return { status: "terminated", label: "Terminate" };
    case "terminated":
      return { status: "completed", label: "Complete" };
    default:
      return null;
  }
}

function canOfferRenewal(row: LeasesOverviewRow): boolean {
  return (
    ["active", "delinquent", "completed"].includes(row.leaseStatus) &&
    !["offered", "accepted"].includes(row.renewalStatus ?? "")
  );
}

function buildReturnPath(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const next = searchParams.toString();
  return next ? `${pathname}?${next}` : pathname;
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    parsed,
  );
}

export function LeasesManager({
  orgId,
  locale,
  overview,
  properties,
  units,
  initialFilters,
  openCreateOnLoad = false,
  error,
  success,
}: LeasesManagerProps) {
  const isEn = locale === "en-US";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(initialFilters.q);
  const [createOpen, setCreateOpen] = useState(openCreateOnLoad);

  useEffect(() => {
    setQuery(initialFilters.q);
  }, [initialFilters.q]);

  useEffect(() => {
    if (!openCreateOnLoad) return;
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("new") !== "1") return;
    params.delete("new");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }, [openCreateOnLoad, pathname, router, searchParams]);

  const propertyOptions = useMemo<Option[]>(
    () =>
      properties
        .map((property) => ({
          id: asString(property.id),
          label: asString(property.name),
        }))
        .filter((property) => property.id && property.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [properties],
  );

  const propertyNames = useMemo(
    () =>
      new Map(
        propertyOptions.map(
          (property) => [property.id, property.label] as const,
        ),
      ),
    [propertyOptions],
  );

  const unitOptions = useMemo<Option[]>(
    () =>
      units
        .map((unit) => {
          const id = asString(unit.id);
          const label = asString(unit.name) || asString(unit.code);
          const propertyName = propertyNames.get(asString(unit.property_id));
          return {
            id,
            label: propertyName ? `${propertyName} · ${label}` : label,
          };
        })
        .filter((unit) => unit.id && unit.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [propertyNames, units],
  );

  function updateParams(
    updates: Record<string, string | null | undefined>,
    options?: { replace?: boolean },
  ) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("new");
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

  const returnPath = useMemo(
    () =>
      buildReturnPath(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams],
  );

  const askAiHref = buildAgentContextHref({
    prompt: isEn
      ? "What needs attention in this lease queue?"
      : "¿Qué necesita atención en esta cola de contratos?",
    context: {
      source: "leases",
      entityIds: overview.rows.map((row) => row.id),
      filters: Object.fromEntries(
        [
          ["q", initialFilters.q],
          ["lease_status", initialFilters.leaseStatus],
          ["renewal_status", initialFilters.renewalStatus],
          ["property_id", initialFilters.propertyId],
          ["unit_id", initialFilters.unitId],
          ["view", initialFilters.view],
        ].filter((entry): entry is [string, string] => Boolean(entry[1])),
      ),
      summary: isEn
        ? `${overview.summary.active} active leases, ${overview.summary.expiring60d} expiring within 60 days, ${overview.summary.delinquent} delinquent.`
        : `${overview.summary.active} contratos activos, ${overview.summary.expiring60d} vencen en 60 días, ${overview.summary.delinquent} morosos.`,
      returnPath,
    },
  });

  const blockedRenewals = overview.rows
    .filter((row) => canOfferRenewal(row))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={askAiHref}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)} type="button">
              {isEn ? "Create lease" : "Crear contrato"}
            </Button>
          </>
        }
        description={
          isEn
            ? "Manage active terms, upcoming expirations, renewals, and collections context from one queue."
            : "Gestiona vigencias, vencimientos, renovaciones y contexto de cobros desde una sola cola."
        }
        eyebrow={isEn ? "Leasing" : "Leasing"}
        title={isEn ? "Leases" : "Contratos"}
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
          data-testid="leases-summary-band"
        >
          <SummaryCard
            detail={
              isEn ? "occupancy-bearing terms" : "contratos que ocupan unidades"
            }
            label={isEn ? "Active leases" : "Activos"}
            value={String(overview.summary.active)}
          />
          <SummaryCard
            detail={isEn ? "renewal follow-up window" : "ventana de renovación"}
            label={isEn ? "Expiring in 60d" : "Vencen en 60d"}
            value={String(overview.summary.expiring60d)}
          />
          <SummaryCard
            detail={
              isEn ? "collections need action" : "cobros requieren acción"
            }
            label={isEn ? "Delinquent" : "Morosos"}
            value={String(overview.summary.delinquent)}
          />
          <SummaryCard
            detail={isEn ? "monthly recurring due" : "recurrente mensual"}
            label={isEn ? "Monthly recurring due" : "Recurrente mensual"}
            value={formatCurrency(
              overview.summary.monthlyRecurringDue,
              "PYG",
              locale,
            )}
          />
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Use the queue for triage, then complete edits, renewals, documents, and collections drill-down from the lease workbench."
                  : "Usa la cola para priorizar y completa ediciones, renovaciones, documentos y cobros desde el workbench del contrato."
              }
              title={isEn ? "Lease actions" : "Acciones"}
            >
              <Button
                className="w-full justify-start"
                onClick={() => setCreateOpen(true)}
                type="button"
              >
                {isEn ? "Create lease" : "Crear contrato"}
              </Button>
              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link href="/module/collections">
                  {isEn ? "Open Collections" : "Abrir cobros"}
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link href="/module/leases?view=expiring_60d">
                  {isEn ? "Review expiring leases" : "Revisar vencimientos"}
                </Link>
              </Button>
              {blockedRenewals.length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-3">
                  <p className="font-medium text-sm">
                    {isEn ? "Ready for renewal offers" : "Listos para renovar"}
                  </p>
                  {blockedRenewals.map((row) => (
                    <Link
                      className="block text-muted-foreground text-sm hover:text-foreground"
                      href={`${row.primaryHref}?return_to=${encodeURIComponent(returnPath)}`}
                      key={row.id}
                    >
                      {row.tenantName}
                    </Link>
                  ))}
                </div>
              ) : null}
            </ActionRail>
          }
          primary={
            <div className="space-y-4">
              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="grid gap-4 md:grid-cols-6">
                    <Field
                      htmlFor="leases-search"
                      label={isEn ? "Search" : "Buscar"}
                      className="md:col-span-2"
                    >
                      <Input
                        id="leases-search"
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={
                          isEn
                            ? "Tenant, property, unit"
                            : "Inquilino, propiedad, unidad"
                        }
                        value={query}
                      />
                    </Field>
                    <Field
                      htmlFor="leases-view"
                      label={isEn ? "View" : "Vista"}
                    >
                      <Select
                        defaultValue={initialFilters.view}
                        id="leases-view"
                        onChange={(event) =>
                          updateParams({
                            view: event.target.value || null,
                            offset: null,
                          })
                        }
                      >
                        <option value="all">{isEn ? "All" : "Todos"}</option>
                        <option value="drafts">
                          {isEn ? "Drafts" : "Borradores"}
                        </option>
                        <option value="expiring_60d">
                          {isEn ? "Expiring in 60d" : "Vencen en 60d"}
                        </option>
                        <option value="delinquent">
                          {isEn ? "Delinquent" : "Morosos"}
                        </option>
                        <option value="renewal_offered">
                          {isEn ? "Renewal offered" : "Renovación ofrecida"}
                        </option>
                      </Select>
                    </Field>
                    <Field
                      htmlFor="leases-status"
                      label={isEn ? "Lease status" : "Estado"}
                    >
                      <Select
                        defaultValue={initialFilters.leaseStatus}
                        id="leases-status"
                        onChange={(event) =>
                          updateParams({
                            lease_status: event.target.value || null,
                            offset: null,
                          })
                        }
                      >
                        <option value="">
                          {isEn ? "All statuses" : "Todos"}
                        </option>
                        <option value="draft">
                          {isEn ? "Draft" : "Borrador"}
                        </option>
                        <option value="active">
                          {isEn ? "Active" : "Activo"}
                        </option>
                        <option value="delinquent">
                          {isEn ? "Delinquent" : "Moroso"}
                        </option>
                        <option value="terminated">
                          {isEn ? "Terminated" : "Terminado"}
                        </option>
                        <option value="completed">
                          {isEn ? "Completed" : "Completado"}
                        </option>
                      </Select>
                    </Field>
                    <Field
                      htmlFor="leases-renewal"
                      label={isEn ? "Renewal" : "Renovación"}
                    >
                      <Select
                        defaultValue={initialFilters.renewalStatus}
                        id="leases-renewal"
                        onChange={(event) =>
                          updateParams({
                            renewal_status: event.target.value || null,
                            offset: null,
                          })
                        }
                      >
                        <option value="">
                          {isEn ? "All renewal states" : "Todas"}
                        </option>
                        <option value="pending">
                          {isEn ? "Pending" : "Pendiente"}
                        </option>
                        <option value="offered">
                          {isEn ? "Offered" : "Ofrecida"}
                        </option>
                        <option value="accepted">
                          {isEn ? "Accepted" : "Aceptada"}
                        </option>
                        <option value="rejected">
                          {isEn ? "Rejected" : "Rechazada"}
                        </option>
                        <option value="expired">
                          {isEn ? "Expired" : "Vencida"}
                        </option>
                      </Select>
                    </Field>
                    <Field
                      htmlFor="leases-sort"
                      label={isEn ? "Sort" : "Orden"}
                    >
                      <Select
                        defaultValue={initialFilters.sort}
                        id="leases-sort"
                        onChange={(event) =>
                          updateParams({ sort: event.target.value || null })
                        }
                      >
                        <option value="end_asc">
                          {isEn ? "End date" : "Fecha fin"}
                        </option>
                        <option value="tenant_asc">
                          {isEn ? "Tenant A-Z" : "Inquilino A-Z"}
                        </option>
                        <option value="rent_desc">
                          {isEn ? "Rent high-low" : "Renta mayor-menor"}
                        </option>
                        <option value="updated_desc">
                          {isEn ? "Updated" : "Actualizado"}
                        </option>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      htmlFor="leases-property"
                      label={isEn ? "Property" : "Propiedad"}
                    >
                      <Select
                        defaultValue={initialFilters.propertyId}
                        id="leases-property"
                        onChange={(event) =>
                          updateParams({
                            property_id: event.target.value || null,
                            unit_id: null,
                            offset: null,
                          })
                        }
                      >
                        <option value="">
                          {isEn ? "All properties" : "Todas"}
                        </option>
                        {propertyOptions.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      htmlFor="leases-unit"
                      label={isEn ? "Unit" : "Unidad"}
                    >
                      <Select
                        defaultValue={initialFilters.unitId}
                        id="leases-unit"
                        onChange={(event) =>
                          updateParams({
                            unit_id: event.target.value || null,
                            offset: null,
                          })
                        }
                      >
                        <option value="">{isEn ? "All units" : "Todas"}</option>
                        {unitOptions.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {overview.rows.length === 0 ? (
                <Card
                  className="border border-dashed border-border/70 bg-card/70 shadow-sm"
                  data-testid="leases-empty-state"
                >
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-1">
                      <h2 className="font-semibold text-xl">
                        {isEn
                          ? "No leases in this view"
                          : "No hay contratos en esta vista"}
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        {isEn
                          ? "Start with a unit-backed lease so collections, renewals, and property context stay connected."
                          : "Comienza con un contrato ligado a una unidad para mantener conectados cobros, renovaciones y contexto del portafolio."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setCreateOpen(true)} type="button">
                        {isEn ? "Create lease" : "Crear contrato"}
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/module/units">
                          {isEn ? "Open units" : "Abrir unidades"}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div
                  className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm"
                  data-testid="leases-queue-table"
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border/60 text-sm">
                      <thead className="bg-muted/30">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-4 py-3 font-medium">
                            {isEn ? "Tenant" : "Inquilino"}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {isEn ? "Occupancy" : "Ocupación"}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {isEn ? "Status" : "Estado"}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {isEn ? "Term" : "Vigencia"}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {isEn ? "Monthly" : "Mensual"}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {isEn ? "Collections" : "Cobros"}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {isEn ? "Documents" : "Documentos"}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {isEn ? "Actions" : "Acciones"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {overview.rows.map((row) => {
                          const nextStatus = statusAction(row);
                          const detailHref = `${row.primaryHref}?return_to=${encodeURIComponent(
                            returnPath,
                          )}`;
                          return (
                            <tr key={row.id} className="align-top">
                              <td className="px-4 py-4">
                                <div className="space-y-1">
                                  <Link
                                    className="font-medium hover:underline"
                                    href={detailHref}
                                  >
                                    {row.tenantName}
                                  </Link>
                                  <p className="text-muted-foreground text-xs">
                                    {row.tenantEmail ||
                                      row.tenantPhoneE164 ||
                                      "—"}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-1">
                                  <p>
                                    {[row.propertyName, row.unitName]
                                      .filter(Boolean)
                                      .join(" · ") || "—"}
                                  </p>
                                  {(row.spaceName || row.bedCode) && (
                                    <p className="text-muted-foreground text-xs">
                                      {[row.spaceName, row.bedCode]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <StatusBadge
                                    label={row.leaseStatusLabel}
                                    value={row.leaseStatus}
                                  />
                                  {row.renewalStatus ? (
                                    <StatusBadge
                                      label={row.renewalStatus}
                                      value={row.renewalStatus}
                                    />
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-1">
                                  <p>{formatDate(row.startsOn, locale)}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {formatDate(row.endsOn, locale)}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                {formatCurrency(
                                  row.monthlyRecurringTotal,
                                  row.currency,
                                  locale,
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-1">
                                  <StatusBadge
                                    label={row.collectionState}
                                    value={row.collectionState}
                                  />
                                  <p className="text-muted-foreground text-xs">
                                    {row.overdueCount > 0
                                      ? `${row.overdueCount} ${isEn ? "overdue" : "vencidos"}`
                                      : formatCurrency(
                                          row.unpaidAmount,
                                          row.currency,
                                          locale,
                                        )}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                {row.documentsCount}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <Button asChild size="sm" variant="outline">
                                    <Link href={detailHref}>
                                      {isEn ? "Open" : "Abrir"}
                                    </Link>
                                  </Button>
                                  {nextStatus ? (
                                    <form action={setLeaseStatusAction}>
                                      <input
                                        name="lease_id"
                                        type="hidden"
                                        value={row.id}
                                      />
                                      <input
                                        name="lease_status"
                                        type="hidden"
                                        value={nextStatus.status}
                                      />
                                      <input
                                        name="next"
                                        type="hidden"
                                        value={returnPath}
                                      />
                                      <Button
                                        size="sm"
                                        type="submit"
                                        variant="ghost"
                                      >
                                        {isEn
                                          ? nextStatus.label
                                          : nextStatus.label}
                                      </Button>
                                    </form>
                                  ) : null}
                                  {canOfferRenewal(row) ? (
                                    <form action={sendRenewalOfferAction}>
                                      <input
                                        name="lease_id"
                                        type="hidden"
                                        value={row.id}
                                      />
                                      <input
                                        name="next"
                                        type="hidden"
                                        value={returnPath}
                                      />
                                      <Button
                                        size="sm"
                                        type="submit"
                                        variant="ghost"
                                      >
                                        {isEn
                                          ? "Send renewal offer"
                                          : "Enviar oferta"}
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
                </div>
              )}
            </div>
          }
        />
      </PageScaffold>

      <LeaseFormSheet
        defaultPropertyId={initialFilters.propertyId || null}
        editing={null}
        isEn={isEn}
        nextPath={returnPath}
        onOpenChange={setCreateOpen}
        open={createOpen}
        orgId={orgId}
        propertyOptions={propertyOptions.map((property) => ({
          id: property.id,
          label: property.label,
        }))}
        unitOptions={units.map((unit) => ({
          id: asString(unit.id),
          label: asString(unit.name) || asString(unit.code),
          propertyId: asString(unit.property_id),
        }))}
      />
    </div>
  );
}
