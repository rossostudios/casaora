"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { buildAgentContextHref } from "@/lib/ai-context";
import { useActiveLocale } from "@/lib/i18n/client";
import type {
  PortfolioPropertyRow,
  PropertiesOverviewResponse,
} from "@/lib/portfolio-overview";
import { CsvImportDialog } from "@/components/properties/csv-import-dialog";
import { CreatePropertySheet } from "./components/create-property-sheet";
import { PropertiesFilterBar } from "./components/properties-filter-bar";
import { PropertiesList } from "./components/properties-list";

type PropertiesManagerProps = {
  orgId: string;
  overview: PropertiesOverviewResponse;
  initialFilters: {
    q: string;
    status: string;
    health: string;
    propertyType: string;
    neighborhood: string;
    view: string;
    sort: string;
    create: boolean;
  };
  error?: string;
  success?: string;
};

function buildReturnPath(pathname: string, searchParams: URLSearchParams): string {
  const suffix = searchParams.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
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

export function PropertiesManager({
  orgId,
  overview,
  initialFilters,
  error,
  success,
}: PropertiesManagerProps) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(initialFilters.q);
  const [createOpen, setCreateOpen] = useState(initialFilters.create);

  useEffect(() => {
    setQuery(initialFilters.q);
  }, [initialFilters.q]);

  useEffect(() => {
    setCreateOpen(initialFilters.create);
  }, [initialFilters.create]);

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

  const returnPath = useMemo(
    () => buildReturnPath(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams]
  );
  const createReturnPath = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("create", "1");
    return buildReturnPath(pathname, params);
  }, [pathname, searchParams]);

  const currentFilters = useMemo(
    () =>
      Object.fromEntries(
        [
          ["q", initialFilters.q],
          ["status", initialFilters.status],
          ["health", initialFilters.health],
          ["property_type", initialFilters.propertyType],
          ["view", initialFilters.view],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]))
      ),
    [
      initialFilters.health,
      initialFilters.propertyType,
      initialFilters.q,
      initialFilters.status,
      initialFilters.view,
    ]
  );

  function buildAiHref(row?: PortfolioPropertyRow): string {
    const entityIds = row ? [row.id] : overview.rows.map((item) => item.id);
    const summary = row
      ? isEn
        ? `Review property ${row.name}. ${row.occupiedUnits}/${row.totalUnits} units occupied, ${row.openTasks} open tasks, collections risk ${row.collectionsRisk}.`
        : `Revisa la propiedad ${row.name}. ${row.occupiedUnits}/${row.totalUnits} unidades ocupadas, ${row.openTasks} tareas abiertas y riesgo de cobros ${row.collectionsRisk}.`
      : isEn
        ? `Review the current properties workspace with ${overview.rows.length} properties in view.`
        : `Revisa el espacio actual de propiedades con ${overview.rows.length} propiedades en vista.`;

    return buildAgentContextHref({
      prompt: row
        ? isEn
          ? `What should I do next for ${row.name}?`
          : `¿Qué debería hacer ahora con ${row.name}?`
        : isEn
          ? "What needs attention in this properties view?"
          : "¿Qué necesita atención en esta vista de propiedades?",
      context: {
        source: "properties",
        entityIds,
        filters: currentFilters,
        summary,
        returnPath,
      },
    });
  }

  const attentionRows = overview.rows.filter(
    (row) => row.health !== "good" || row.collectionsRisk !== "none"
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        description={
          isEn
            ? "Work property records and unit links from one clear portfolio surface instead of bouncing between chat-first tools."
            : "Gestiona propiedades y enlaces a unidades desde una sola superficie clara del portafolio."
        }
        eyebrow={isEn ? "Portfolio" : "Portafolio"}
        title={isEn ? "Properties" : "Propiedades"}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={buildAiHref()}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
            <CsvImportDialog
              onComplete={() => router.refresh()}
              orgId={orgId}
            />
            <Button onClick={() => setCreateOpen(true)} type="button">
              {isEn ? "Create property" : "Crear propiedad"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            detail={isEn ? "records in current view" : "registros en vista"}
            label={isEn ? "Properties" : "Propiedades"}
            value={String(overview.summary.totalProperties)}
          />
          <SummaryCard
            detail={isEn ? "occupied / total units" : "ocupadas / total"}
            label={isEn ? "Occupancy" : "Ocupación"}
            value={`${overview.summary.occupiedUnits}/${overview.summary.totalUnits}`}
          />
          <SummaryCard
            detail={isEn ? "open work items" : "pendientes abiertos"}
            label={isEn ? "Tasks" : "Tareas"}
            value={String(overview.summary.openTasks)}
          />
          <SummaryCard
            detail={isEn ? "collections past due" : "cobros vencidos"}
            label={isEn ? "Overdue" : "Vencidos"}
            value={String(overview.summary.overdueCollections)}
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
          <PropertiesFilterBar
            health={initialFilters.health}
            isEn={isEn}
            onHealthChange={(value) => updateParams({ health: value || null })}
            onPropertyTypeChange={(value) =>
              updateParams({ property_type: value || null })
            }
            onQueryChange={setQuery}
            onStatusChange={(value) => updateParams({ status: value || null })}
            onViewChange={(value) =>
              updateParams({ view: value === "all" ? null : value })
            }
            propertyType={initialFilters.propertyType}
            query={query}
            savedViews={overview.savedViews}
            status={initialFilters.status}
            view={initialFilters.view}
          />
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Prioritize the portfolio issues that connect directly to unit workflows."
                  : "Prioriza los problemas del portafolio que conectan directo con el trabajo de unidades."
              }
              title={isEn ? "Next actions" : "Próximas acciones"}
            >
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href={buildAiHref()}>
                  {isEn ? "Review this portfolio view with AI" : "Revisar esta vista con IA"}
                </Link>
              </Button>
              <Button
                className="w-full justify-start"
                onClick={() => setCreateOpen(true)}
                type="button"
                variant="outline"
              >
                {isEn ? "Create another property" : "Crear otra propiedad"}
              </Button>
              {attentionRows.slice(0, 4).map((row) => (
                <div
                  className="rounded-xl border border-border/60 bg-muted/20 p-3"
                  key={row.id}
                >
                  <p className="font-medium text-sm">{row.name}</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {row.collectionsRisk === "high"
                      ? isEn
                        ? "Collections risk is high."
                        : "El riesgo de cobros es alto."
                      : row.health === "critical"
                        ? isEn
                          ? "Health is critical."
                          : "La salud es crítica."
                        : isEn
                          ? "Vacancy or open work needs review."
                          : "La vacancia o el trabajo abierto necesita revisión."}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={row.unitsHref}>
                        {isEn ? "View units" : "Ver unidades"}
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={row.primaryHref}>{isEn ? "Open" : "Abrir"}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </ActionRail>
          }
          primary={
            <PropertiesList
              askAiHref={buildAiHref}
              isEn={isEn}
              rows={overview.rows}
            />
          }
        />
      </PageScaffold>

      <CreatePropertySheet
        isEn={isEn}
        onOpenChange={(next) => {
          setCreateOpen(next);
          updateParams({ create: next ? "1" : null }, { replace: true });
        }}
        open={createOpen}
        orgId={orgId}
        returnTo={createReturnPath}
      />
    </div>
  );
}
