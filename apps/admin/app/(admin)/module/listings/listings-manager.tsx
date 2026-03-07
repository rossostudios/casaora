"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ListingPreviewModal } from "@/components/listings/listing-preview-modal";
import { ReadinessPopover } from "@/components/listings/readiness-popover";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildAgentContextHref } from "@/lib/ai-context";
import type {
  ListingsOverviewResponse,
  ListingsOverviewRow,
} from "@/lib/listings-overview";
import { formatCurrency } from "@/lib/format";
import { publishListingAction, unpublishListingAction } from "./actions";
import { CreateListingDrawer } from "./create-listing-drawer";

type ListingsManagerProps = {
  orgId: string;
  locale: string;
  overview: ListingsOverviewResponse;
  properties: Record<string, unknown>[];
  units: Record<string, unknown>[];
  pricingTemplates: Record<string, unknown>[];
  initialFilters: {
    q: string;
    propertyId: string;
    unitId: string;
    publishedState: string;
    lifecycleState: string;
    view: string;
    sort: string;
  };
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

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(parsed);
}

function buildReturnPath(pathname: string, searchParams: URLSearchParams): string {
  const suffix = searchParams.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

function lifecycleLabel(value: string, isEn: boolean): string {
  switch (value) {
    case "ready_to_publish":
      return isEn ? "Ready" : "Listo";
    case "published":
      return isEn ? "Live" : "Publicado";
    case "blocked":
      return isEn ? "Blocked" : "Bloqueado";
    default:
      return isEn ? "Draft" : "Borrador";
  }
}

function emptyStateMessage(
  isEn: boolean,
  hasUnits: boolean
): { title: string; description: string; ctaHref: string; ctaLabel: string } {
  if (!hasUnits) {
    return {
      title: isEn ? "Create a unit first" : "Crea una unidad primero",
      description: isEn
        ? "Listings in Casaora Marketplace now start from a real unit so pricing, availability, and applications stay connected."
        : "Los anuncios del Marketplace de Casaora ahora empiezan desde una unidad real para que precios, disponibilidad y aplicaciones queden conectados.",
      ctaHref: "/module/units",
      ctaLabel: isEn ? "Open units" : "Abrir unidades",
    };
  }

  return {
    title: isEn ? "No listings in this view" : "No hay anuncios en esta vista",
    description: isEn
      ? "Adjust the filters or create a draft listing from one of your rentable units."
      : "Ajusta los filtros o crea un borrador desde una de tus unidades rentables.",
    ctaHref: "/module/units",
    ctaLabel: isEn ? "Review units" : "Revisar unidades",
  };
}

export function ListingsManager({
  orgId,
  locale,
  overview,
  properties,
  units,
  pricingTemplates,
  initialFilters,
  error,
  success,
}: ListingsManagerProps) {
  const isEn = locale === "en-US";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(initialFilters.q);
  const [createOpen, setCreateOpen] = useState(false);
  const [previewListing, setPreviewListing] = useState<ListingsOverviewRow | null>(
    null
  );

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

  const propertyNames = useMemo(
    () =>
      new Map(
        propertyOptions.map((property) => [property.id, property.label] as const)
      ),
    [propertyOptions]
  );

  const unitOptions = useMemo<Option[]>(
    () =>
      units
        .map((unit) => {
          const id = asString(unit.id);
          const name = asString(unit.name) || asString(unit.code);
          const propertyName = propertyNames.get(asString(unit.property_id));
          const label = propertyName ? `${propertyName} · ${name}` : name;
          return { id, label };
        })
        .filter((unit) => unit.id && unit.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [propertyNames, units]
  );

  const pricingTemplateOptions = useMemo<Option[]>(
    () =>
      pricingTemplates
        .map((template) => ({
          id: asString(template.id),
          label: asString(template.name) || asString(template.label),
        }))
        .filter((template) => template.id && template.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [pricingTemplates]
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
  }, [initialFilters.q, query]);

  const currentFilters = useMemo(
    () =>
      Object.fromEntries(
        [
          ["q", initialFilters.q],
          ["property_id", initialFilters.propertyId],
          ["unit_id", initialFilters.unitId],
          ["published_state", initialFilters.publishedState],
          ["lifecycle_state", initialFilters.lifecycleState],
          ["view", initialFilters.view],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]))
      ),
    [
      initialFilters.lifecycleState,
      initialFilters.propertyId,
      initialFilters.publishedState,
      initialFilters.q,
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
      ? "What needs attention in this listings view?"
      : "¿Qué necesita atención en esta vista de anuncios?",
    context: {
      source: "listings",
      entityIds: overview.rows.map((row) => row.id),
      filters: currentFilters,
      summary: isEn
        ? `Listings queue with ${overview.rows.length} visible records. ${overview.summary.readyToPublish} ready, ${overview.summary.blocked} blocked, ${overview.summary.published} live.`
        : `Cola de anuncios con ${overview.rows.length} registros visibles. ${overview.summary.readyToPublish} listos, ${overview.summary.blocked} bloqueados, ${overview.summary.published} publicados.`,
      returnPath,
    },
  });

  const blockedRows = overview.rows.filter(
    (row) => row.lifecycleState === "blocked"
  );
  const emptyState = emptyStateMessage(isEn, overview.hasUnits);
  const detailHref = (href: string) =>
    `${href}?return_to=${encodeURIComponent(returnPath)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={askAiHref}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)} type="button">
              {isEn ? "Create listing" : "Crear anuncio"}
            </Button>
          </>
        }
        description={
          isEn
            ? "Create, publish, and monitor Casaora Marketplace listings from a single operational queue."
            : "Crea, publica y controla anuncios del Marketplace de Casaora desde una sola cola operativa."
        }
        eyebrow={isEn ? "Leasing" : "Leasing"}
        title={isEn ? "Listings" : "Anuncios"}
      >
        <div
          className="grid gap-4 md:grid-cols-4"
          data-testid="listings-summary-band"
        >
          <SummaryCard
            detail={isEn ? "drafts in org" : "borradores en la organización"}
            label={isEn ? "Drafts" : "Borradores"}
            value={String(overview.summary.drafts)}
          />
          <SummaryCard
            detail={isEn ? "can publish now" : "pueden publicarse ahora"}
            label={isEn ? "Ready" : "Listos"}
            value={String(overview.summary.readyToPublish)}
          />
          <SummaryCard
            detail={isEn ? "currently in marketplace" : "actualmente en marketplace"}
            label={isEn ? "Live" : "Publicados"}
            value={String(overview.summary.published)}
          />
          <SummaryCard
            detail={isEn ? "linked applications" : "aplicaciones vinculadas"}
            label={isEn ? "Applications" : "Aplicaciones"}
            value={String(overview.summary.applications)}
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

        <div className="sticky top-16 z-20 rounded-2xl border border-border/60 bg-background p-3 shadow-sm">
          <div className="grid gap-3 md:grid-cols-6">
            <Input
              aria-label={isEn ? "Search listings" : "Buscar anuncios"}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isEn ? "Search title, slug, property..." : "Buscar título, slug, propiedad..."}
              value={query}
            />
            <Select
              onChange={(event) =>
                updateParams({ property_id: event.target.value || null, unit_id: null })
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
            <Select
              onChange={(event) => updateParams({ unit_id: event.target.value || null })}
              value={initialFilters.unitId}
            >
              <option value="">{isEn ? "All units" : "Todas las unidades"}</option>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </Select>
            <Select
              onChange={(event) => updateParams({ view: event.target.value || null })}
              value={initialFilters.view}
            >
              <option value="all">{isEn ? "All views" : "Todas las vistas"}</option>
              <option value="drafts">{isEn ? "Drafts" : "Borradores"}</option>
              <option value="ready_to_publish">{isEn ? "Ready to publish" : "Listos para publicar"}</option>
              <option value="live">{isEn ? "Live" : "Publicados"}</option>
              <option value="needs_media">{isEn ? "Needs media" : "Sin media"}</option>
              <option value="has_applications">{isEn ? "Has applications" : "Con aplicaciones"}</option>
            </Select>
            <Select
              onChange={(event) =>
                updateParams({ published_state: event.target.value || null })
              }
              value={initialFilters.publishedState}
            >
              <option value="">{isEn ? "All publication states" : "Todos los estados"}</option>
              <option value="published">{isEn ? "Published" : "Publicado"}</option>
              <option value="draft">{isEn ? "Unpublished" : "No publicado"}</option>
            </Select>
            <Select
              onChange={(event) => updateParams({ sort: event.target.value || null })}
              value={initialFilters.sort}
            >
              <option value="updated_desc">{isEn ? "Newest updates" : "Últimas actualizaciones"}</option>
              <option value="title_asc">{isEn ? "Title A-Z" : "Título A-Z"}</option>
              <option value="monthly_desc">{isEn ? "Highest monthly rent" : "Mayor renta mensual"}</option>
              <option value="applications_desc">{isEn ? "Most applications" : "Más aplicaciones"}</option>
            </Select>
          </div>
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Keep Casaora Marketplace publishing tied to real units, pricing templates, and application flow."
                  : "Mantén la publicación en Casaora Marketplace ligada a unidades reales, plantillas de precios y flujo de aplicaciones."
              }
              title={isEn ? "Next actions" : "Próximas acciones"}
            >
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/module/channels">
                  {isEn ? "Open marketplace health" : "Abrir salud del marketplace"}
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/module/pricing">
                  {isEn ? "Review pricing templates" : "Revisar plantillas de precios"}
                </Link>
              </Button>
              {blockedRows.slice(0, 3).map((row) => (
                <div
                  className="rounded-xl border border-border/60 bg-muted/20 p-3"
                  key={row.id}
                >
                  <p className="font-medium text-sm">{row.title}</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {row.propertyName || row.unitName || (isEn ? "Missing unit context" : "Falta contexto de unidad")}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={detailHref(row.primaryHref)}>
                        {isEn ? "Open" : "Abrir"}
                      </Link>
                    </Button>
                    <Button
                      onClick={() => setPreviewListing(row)}
                      size="sm"
                      type="button"
                    >
                      {isEn ? "Preview" : "Vista previa"}
                    </Button>
                  </div>
                </div>
              ))}
            </ActionRail>
          }
          primary={
            overview.rows.length > 0 ? (
              <div
                className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm"
                data-testid="listings-queue-table"
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border/60 text-sm">
                    <thead className="bg-muted/30">
                      <tr className="text-left text-muted-foreground text-xs uppercase tracking-[0.14em]">
                        <th className="px-4 py-3">{isEn ? "Listing" : "Anuncio"}</th>
                        <th className="px-4 py-3">{isEn ? "State" : "Estado"}</th>
                        <th className="px-4 py-3">{isEn ? "Readiness" : "Preparación"}</th>
                        <th className="px-4 py-3">{isEn ? "Monthly" : "Mensual"}</th>
                        <th className="px-4 py-3">{isEn ? "Available" : "Disponible"}</th>
                        <th className="px-4 py-3">{isEn ? "Applications" : "Aplicaciones"}</th>
                        <th className="px-4 py-3">{isEn ? "Updated" : "Actualizado"}</th>
                        <th className="px-4 py-3">{isEn ? "Actions" : "Acciones"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {overview.rows.map((row) => (
                        <tr className="align-top" key={row.id}>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <Link
                                className="font-medium text-sm hover:text-primary"
                                href={detailHref(row.primaryHref)}
                              >
                                {row.title}
                              </Link>
                              <p className="text-muted-foreground text-xs">
                                {[row.propertyName, row.unitName].filter(Boolean).join(" · ") ||
                                  (isEn ? "Unit link required" : "Se requiere unidad")}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {row.publicSlug ? `casaora.co/${row.publicSlug}` : "—"}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge
                              label={lifecycleLabel(row.lifecycleState, isEn)}
                              value={row.lifecycleState}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <ReadinessPopover
                              isEn={isEn}
                              listingId={row.id}
                              onFixField={(field) =>
                                router.push(
                                  `${row.primaryHref}?field=${encodeURIComponent(field)}&return_to=${encodeURIComponent(returnPath)}`
                                )
                              }
                              readinessBlocking={row.readinessBlocking}
                              readinessScore={row.readinessScore}
                            />
                          </td>
                          <td className="px-4 py-4 font-medium">
                            {formatCurrency(
                              row.monthlyRecurringTotal,
                              row.currency || "PYG",
                              locale
                            )}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {row.availableFrom
                              ? formatDate(row.availableFrom, locale)
                              : "—"}
                          </td>
                          <td className="px-4 py-4">{row.applicationCount}</td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {formatDate(row.updatedAt, locale)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Button asChild size="sm" variant="outline">
                                <Link href={detailHref(row.primaryHref)}>
                                  {isEn ? "Open" : "Abrir"}
                                </Link>
                              </Button>
                              <Button
                                onClick={() => setPreviewListing(row)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                {isEn ? "Preview" : "Vista previa"}
                              </Button>
                              <form
                                action={
                                  row.isPublished
                                    ? unpublishListingAction
                                    : publishListingAction
                                }
                              >
                                <input name="listing_id" type="hidden" value={row.id} />
                                <input name="next" type="hidden" value={returnPath} />
                                <Button size="sm" type="submit">
                                  {row.isPublished
                                    ? isEn
                                      ? "Unpublish"
                                      : "Despublicar"
                                    : isEn
                                      ? "Publish"
                                      : "Publicar"}
                                </Button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-sm"
                data-testid="listings-empty-state"
              >
                <h2 className="font-semibold text-xl tracking-tight">
                  {emptyState.title}
                </h2>
                <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
                  {emptyState.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => setCreateOpen(true)} type="button">
                    {isEn ? "Create listing" : "Crear anuncio"}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={emptyState.ctaHref}>{emptyState.ctaLabel}</Link>
                  </Button>
                </div>
              </div>
            )
          }
        />
      </PageScaffold>

      <CreateListingDrawer
        isEn={isEn}
        locale={locale}
        onOpenChange={setCreateOpen}
        open={createOpen}
        orgId={orgId}
        pricingTemplateOptions={pricingTemplateOptions}
        propertyOptions={propertyOptions}
        unitOptions={unitOptions}
      />

      {previewListing ? (
        <ListingPreviewModal
          isEn={isEn}
          isPublished={previewListing.isPublished}
          listingId={previewListing.id}
          locale={locale as "en-US" | "es-PY"}
          onClose={() => setPreviewListing(null)}
          slug={previewListing.publicSlug}
        />
      ) : null}
    </div>
  );
}
