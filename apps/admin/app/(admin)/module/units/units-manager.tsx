"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { UnitNotionTable } from "@/components/units/unit-notion-table";
import { buildAgentContextHref } from "@/lib/ai-context";
import { useActiveLocale } from "@/lib/i18n/client";
import type {
  PortfolioUnitRow,
  UnitsOverviewResponse,
} from "@/lib/portfolio-overview";
import { BulkUpdateUnitsDrawer } from "./components/bulk-update-units-drawer";
import { CreateUnitDrawer } from "./components/create-unit-drawer";
import { UnitsFilterBar } from "./components/units-filter-bar";

type UnitsManagerProps = {
  orgId: string;
  overview: UnitsOverviewResponse;
  properties: Record<string, unknown>[];
  initialFilters: {
    q: string;
    propertyId: string;
    status: string;
    unitType: string;
    conditionStatus: string;
    view: string;
    sort: string;
    create: boolean;
  };
  error?: string;
  success?: string;
};

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

function buildReturnPath(pathname: string, searchParams: URLSearchParams): string {
  const suffix = searchParams.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

export function UnitsManager({
  orgId,
  overview,
  properties,
  initialFilters,
  error,
  success,
}: UnitsManagerProps) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(initialFilters.q);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(initialFilters.create);
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);

  useEffect(() => {
    setQuery(initialFilters.q);
  }, [initialFilters.q]);

  useEffect(() => {
    setCreateOpen(initialFilters.create);
  }, [initialFilters.create]);

  const propertyOptions = useMemo(
    () =>
      properties
        .map((property) => ({
          id: String(property.id ?? ""),
          name: String(property.name ?? ""),
        }))
        .filter((property) => property.id && property.name)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [properties]
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

  const currentFilters = useMemo(
    () =>
      Object.fromEntries(
        [
          ["q", initialFilters.q],
          ["property_id", initialFilters.propertyId],
          ["status", initialFilters.status],
          ["unit_type", initialFilters.unitType],
          ["condition_status", initialFilters.conditionStatus],
          ["view", initialFilters.view],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]))
      ),
    [
      initialFilters.conditionStatus,
      initialFilters.propertyId,
      initialFilters.q,
      initialFilters.status,
      initialFilters.unitType,
      initialFilters.view,
    ]
  );

  const returnPath = useMemo(
    () => buildReturnPath(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams]
  );
  const createReturnPath = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("create", "1");
    return buildReturnPath(pathname, params);
  }, [pathname, searchParams]);

  const selectedRows = overview.rows.filter((row) => selectedIds.includes(row.id));

  function buildAiHref(row?: PortfolioUnitRow): string {
    const entityIds = row ? [row.id] : (selectedRows.length > 0 ? selectedRows : overview.rows).map((item) => item.id);
    const summary = row
      ? isEn
        ? `Review unit ${row.code} in ${row.propertyName}. Lease state ${row.leaseState}, maintenance risk ${row.maintenanceRisk}.`
        : `Revisa la unidad ${row.code} en ${row.propertyName}. Estado de contrato ${row.leaseState}, riesgo ${row.maintenanceRisk}.`
      : isEn
        ? `Review the current units workspace with ${entityIds.length} unit records in context.`
        : `Revisa el espacio actual de unidades con ${entityIds.length} registros en contexto.`;

    return buildAgentContextHref({
      prompt: row
        ? isEn
          ? `What should I do next for unit ${row.code}?`
          : `¿Qué debería hacer ahora con la unidad ${row.code}?`
        : isEn
          ? "What needs attention in this units view?"
          : "¿Qué necesita atención en esta vista de unidades?",
      context: {
        source: "units",
        entityIds,
        filters: currentFilters,
        summary,
        returnPath,
      },
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        description={
          isEn
            ? "Work the rentable inventory from one linked portfolio queue with real create, bulk update, and parent-property navigation."
            : "Gestiona el inventario rentable desde una sola cola enlazada con creación, actualización masiva y navegación a la propiedad."
        }
        eyebrow={isEn ? "Portfolio" : "Portafolio"}
        title={isEn ? "Units" : "Unidades"}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={buildAiHref()}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)} type="button">
              {isEn ? "Create unit" : "Crear unidad"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            detail={isEn ? "records in current view" : "registros en vista"}
            label={isEn ? "Units" : "Unidades"}
            value={String(overview.summary.totalUnits)}
          />
          <SummaryCard
            detail={isEn ? "without active lease" : "sin contrato activo"}
            label={isEn ? "Vacant" : "Vacantes"}
            value={String(overview.summary.vacantUnits)}
          />
          <SummaryCard
            detail={isEn ? "leases ending soon" : "contratos por vencer"}
            label={isEn ? "Lease Risk" : "Riesgo"}
            value={String(overview.summary.endingSoonUnits)}
          />
          <SummaryCard
            detail={isEn ? "high-risk turns" : "turnos de alto riesgo"}
            label={isEn ? "High Risk" : "Alto riesgo"}
            value={String(overview.summary.highRiskUnits)}
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

        <div className="sticky top-16 z-20 bg-background py-1">
          <UnitsFilterBar
            conditionStatus={initialFilters.conditionStatus}
            isEn={isEn}
            onConditionStatusChange={(value) =>
              updateParams({ condition_status: value || null })
            }
            onPropertyChange={(value) => updateParams({ property_id: value || null })}
            onQueryChange={setQuery}
            onStatusChange={(value) => updateParams({ status: value || null })}
            onUnitTypeChange={(value) => updateParams({ unit_type: value || null })}
            onViewChange={(value) =>
              updateParams({ view: value === "all" ? null : value })
            }
            propertyId={initialFilters.propertyId}
            propertyOptions={propertyOptions}
            query={query}
            savedViews={overview.savedViews}
            status={initialFilters.status}
            unitType={initialFilters.unitType}
            view={initialFilters.view}
          />
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Keep unit work anchored to the parent property and the current portfolio queue."
                  : "Mantén el trabajo de unidades anclado a la propiedad madre y a la cola actual del portafolio."
              }
              title={isEn ? "Next actions" : "Próximas acciones"}
            >
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href={buildAiHref()}>
                  {isEn ? "Review this units view with AI" : "Revisar esta vista con IA"}
                </Link>
              </Button>
              <Button
                className="w-full justify-start"
                onClick={() => setCreateOpen(true)}
                type="button"
                variant="outline"
              >
                {isEn ? "Create another unit" : "Crear otra unidad"}
              </Button>
              {overview.facets.properties.slice(0, 4).map((property) => (
                <div
                  className="rounded-xl border border-border/60 bg-muted/20 p-3"
                  key={property.id}
                >
                  <p className="font-medium text-sm">{property.name}</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {property.count} {isEn ? "units in current view" : "unidades en vista"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/module/properties/${property.id}`}>
                        {isEn ? "Open property" : "Abrir propiedad"}
                      </Link>
                    </Button>
                    <Button
                      onClick={() => updateParams({ property_id: property.id })}
                      size="sm"
                      type="button"
                    >
                      {isEn ? "Filter units" : "Filtrar unidades"}
                    </Button>
                  </div>
                </div>
              ))}
            </ActionRail>
          }
          primary={
            <UnitNotionTable
              askAiHref={buildAiHref}
              isEn={isEn}
              onOpenBulkUpdate={() => setBulkUpdateOpen(true)}
              onOpenCreate={() => setCreateOpen(true)}
              onSelectedIdsChange={setSelectedIds}
              rows={overview.rows}
              selectedIds={selectedIds}
            />
          }
        />
      </PageScaffold>

      <CreateUnitDrawer
        defaultPropertyId={initialFilters.propertyId || null}
        isEn={isEn}
        onOpenChange={(next) => {
          setCreateOpen(next);
          updateParams({ create: next ? "1" : null }, { replace: true });
        }}
        open={createOpen}
        orgId={orgId}
        propertyOptions={propertyOptions}
        returnTo={createReturnPath}
      />

      <BulkUpdateUnitsDrawer
        isEn={isEn}
        onApplied={() => setSelectedIds([])}
        onOpenChange={setBulkUpdateOpen}
        open={bulkUpdateOpen}
        orgId={orgId}
        propertyId={initialFilters.propertyId || null}
        selectedUnits={selectedRows.map((row) => ({
          code: row.code,
          id: row.id,
          propertyId: row.propertyId,
        }))}
      />
    </div>
  );
}
