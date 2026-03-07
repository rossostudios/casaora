"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListingPreviewModal } from "@/components/listings/listing-preview-modal";
import {
  ListingForm,
  type ListingEditorRecord,
} from "@/components/listings/listing-form";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildAgentContextHref } from "@/lib/ai-context";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { ListingDetailOverview } from "@/lib/listings-overview";
import { publishListingAction, unpublishListingAction } from "../actions";

type ListingWorkbenchProps = {
  orgId: string;
  locale: string;
  detail: ListingDetailOverview;
  properties: Record<string, unknown>[];
  units: Record<string, unknown>[];
  pricingTemplates: Record<string, unknown>[];
  returnTo: string;
  initialField?: string;
  initialPreviewOpen?: boolean;
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

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(parsed);
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

function issueFieldHref(basePath: string, returnTo: string, field: string): string {
  return `${basePath}?field=${encodeURIComponent(field)}&return_to=${encodeURIComponent(returnTo)}`;
}

function toEditorRecord(detail: ListingDetailOverview): ListingEditorRecord {
  const listing = detail.listing;
  return {
    id: listing.id,
    title: listing.title,
    public_slug: listing.publicSlug,
    city: listing.city,
    neighborhood: listing.neighborhood,
    property_type: listing.propertyType,
    description: listing.description,
    summary: listing.summary,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    square_meters: listing.squareMeters,
    furnished: listing.furnished,
    pet_policy: listing.petPolicy,
    parking_spaces: listing.parkingSpaces,
    available_from: listing.availableFrom,
    minimum_lease_months: listing.minimumLeaseMonths,
    maintenance_fee: listing.maintenanceFee,
    cover_image_url: listing.coverImageUrl,
    gallery_image_urls: listing.galleryImageUrls,
    amenities: listing.amenities,
    currency: listing.currency,
    pricing_template_id: listing.pricingTemplateId,
    property_id: listing.propertyId,
    unit_id: listing.unitId,
  };
}

export function ListingWorkbench({
  orgId,
  locale,
  detail,
  properties,
  units,
  pricingTemplates,
  returnTo,
  initialField,
  initialPreviewOpen = false,
  error,
  success,
}: ListingWorkbenchProps) {
  const isEn = locale === "en-US";
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(initialPreviewOpen);
  const detailPath = `/module/listings/${detail.listing.id}`;
  const detailPathWithReturn = `${detailPath}?return_to=${encodeURIComponent(returnTo)}`;

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
    () => new Map(propertyOptions.map((option) => [option.id, option.label] as const)),
    [propertyOptions]
  );

  const unitOptions = useMemo<Option[]>(
    () =>
      units
        .map((unit) => {
          const id = asString(unit.id);
          const name = asString(unit.name) || asString(unit.code);
          const propertyName = propertyNames.get(asString(unit.property_id));
          return {
            id,
            label: propertyName ? `${propertyName} · ${name}` : name,
          };
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

  const askAiHref = buildAgentContextHref({
    prompt: isEn
      ? `What should I do next for listing ${detail.listing.title}?`
      : `¿Qué debería hacer ahora con el anuncio ${detail.listing.title}?`,
    context: {
      source: "listings",
      entityIds: [detail.listing.id],
      filters: {},
      summary: isEn
        ? `${detail.listing.title} is ${detail.listing.lifecycleState.replaceAll("_", " ")} with readiness ${detail.readiness.score}% and ${detail.applications.total} linked applications.`
        : `${detail.listing.title} está ${detail.listing.lifecycleState.replaceAll("_", " ")} con preparación ${detail.readiness.score}% y ${detail.applications.total} aplicaciones vinculadas.`,
      returnPath: detailPathWithReturn,
    },
  });

  const editorRecord = useMemo(() => toEditorRecord(detail), [detail]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={returnTo}>
                {isEn ? "Back to listings" : "Volver a anuncios"}
              </Link>
            </Button>
            <Button onClick={() => setPreviewOpen(true)} type="button" variant="outline">
              {isEn ? "Preview" : "Vista previa"}
            </Button>
            <Button asChild variant="outline">
              <Link href={askAiHref}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
          </>
        }
        description={
          detail.listing.propertyName || detail.listing.unitName || undefined
        }
        eyebrow={isEn ? "Leasing" : "Leasing"}
        title={detail.listing.title}
      >
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={lifecycleLabel(detail.listing.lifecycleState, isEn)}
            value={detail.listing.lifecycleState}
          />
          <StatusBadge
            label={`${detail.readiness.score}% ${isEn ? "ready" : "preparado"}`}
            value={detail.readiness.blocking ? "blocked" : "good"}
          />
          <StatusBadge
            label={detail.listing.isPublished ? (isEn ? "Live in marketplace" : "Visible en marketplace") : isEn ? "Draft only" : "Solo borrador"}
            value={detail.listing.isPublished ? "published" : "draft"}
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

        <div
          className="grid gap-4 md:grid-cols-4"
          data-testid="listings-workbench-summary"
        >
          <Card className="border border-border/60 bg-card/80 shadow-sm">
            <CardContent className="space-y-1 p-5">
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                {isEn ? "Readiness" : "Preparación"}
              </p>
              <p className="font-semibold text-3xl tracking-tight">
                {detail.readiness.score}%
              </p>
              <p className="text-muted-foreground text-sm">
                {detail.readiness.issues.length > 0
                  ? isEn
                    ? `${detail.readiness.issues.length} issue(s) to resolve`
                    : `${detail.readiness.issues.length} pendiente(s) por resolver`
                  : isEn
                    ? "Ready for review"
                    : "Listo para revisar"}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/80 shadow-sm">
            <CardContent className="space-y-1 p-5">
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                {isEn ? "Monthly" : "Mensual"}
              </p>
              <p className="font-semibold text-3xl tracking-tight">
                {formatCurrency(
                  detail.pricing.monthlyRecurringTotal,
                  detail.listing.currency || "PYG",
                  locale
                )}
              </p>
              <p className="text-muted-foreground text-sm">
                {isEn ? "Recurring monthly total" : "Total mensual recurrente"}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/80 shadow-sm">
            <CardContent className="space-y-1 p-5">
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                {isEn ? "Move-in" : "Ingreso"}
              </p>
              <p className="font-semibold text-3xl tracking-tight">
                {formatCurrency(
                  detail.pricing.totalMoveIn,
                  detail.listing.currency || "PYG",
                  locale
                )}
              </p>
              <p className="text-muted-foreground text-sm">
                {isEn ? "Total move-in cost" : "Costo total de ingreso"}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/80 shadow-sm">
            <CardContent className="space-y-1 p-5">
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                {isEn ? "Applications" : "Aplicaciones"}
              </p>
              <p className="font-semibold text-3xl tracking-tight">
                {detail.applications.total}
              </p>
              <p className="text-muted-foreground text-sm">
                {isEn
                  ? `${detail.applications.open} still active`
                  : `${detail.applications.open} todavía activas`}
              </p>
            </CardContent>
          </Card>
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Publish only when pricing, media, and availability are complete."
                  : "Publica solo cuando precios, media y disponibilidad estén completos."
              }
              title={isEn ? "Listing actions" : "Acciones del anuncio"}
            >
              <form
                action={
                  detail.listing.isPublished
                    ? unpublishListingAction
                    : publishListingAction
                }
              >
                <input name="listing_id" type="hidden" value={detail.listing.id} />
                <input name="next" type="hidden" value={detailPathWithReturn} />
                <Button className="w-full" type="submit">
                  {detail.listing.isPublished
                    ? isEn
                      ? "Unpublish listing"
                      : "Despublicar anuncio"
                    : isEn
                      ? "Publish listing"
                      : "Publicar anuncio"}
                </Button>
              </form>

              <Button
                className="w-full justify-start"
                onClick={() => setPreviewOpen(true)}
                type="button"
                variant="outline"
              >
                {isEn ? "Open preview" : "Abrir vista previa"}
              </Button>

              {detail.listing.publicHref ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href={detail.listing.publicHref} target="_blank">
                    {isEn ? "Open live marketplace page" : "Abrir página publicada"}
                  </Link>
                </Button>
              ) : null}

              {detail.listing.unitId ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href={`/module/calendar?unit_id=${encodeURIComponent(detail.listing.unitId)}`}>
                    {isEn ? "Open unit calendar" : "Abrir calendario de unidad"}
                  </Link>
                </Button>
              ) : null}

              {detail.listing.pricingTemplateId ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link
                    href={`/module/pricing?template_id=${encodeURIComponent(detail.listing.pricingTemplateId)}`}
                  >
                    {isEn ? "Open pricing template" : "Abrir plantilla de precios"}
                  </Link>
                </Button>
              ) : null}

              {detail.listing.propertyId ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href={`/module/properties/${encodeURIComponent(detail.listing.propertyId)}`}>
                    {isEn ? "Open property" : "Abrir propiedad"}
                  </Link>
                </Button>
              ) : null}

              {detail.listing.unitId ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href={`/module/units/${encodeURIComponent(detail.listing.unitId)}`}>
                    {isEn ? "Open unit" : "Abrir unidad"}
                  </Link>
                </Button>
              ) : null}

              {detail.readiness.issues.length > 0 ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="font-medium text-sm">
                    {isEn ? "Publish blockers" : "Bloqueos para publicar"}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {detail.readiness.issues.map((issue) => (
                      <li key={issue.field}>
                        <Link
                          className="text-muted-foreground hover:text-foreground"
                          href={issueFieldHref(detailPath, returnTo, issue.field)}
                        >
                          {issue.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </ActionRail>
          }
          primary={
            <div className="space-y-6" data-testid="listing-workbench">
              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>
                    {isEn ? "Listing editor" : "Editor del anuncio"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ListingForm
                    editing={editorRecord}
                    isEn={isEn}
                    locale={locale}
                    onPreview={() => setPreviewOpen(true)}
                    onSuccess={() => {
                      router.replace(detailPathWithReturn);
                      router.refresh();
                    }}
                    orgId={orgId}
                    pricingTemplateOptions={pricingTemplateOptions}
                    propertyOptions={propertyOptions}
                    requireUnitLink={false}
                    scrollToField={initialField}
                    unitOptions={unitOptions}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border border-border/60 bg-card/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>
                      {isEn ? "Pricing and fees" : "Precios y cuotas"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                        <p className="font-medium text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {isEn ? "Pricing template" : "Plantilla"}
                        </p>
                        <p className="mt-1 text-sm">
                          {detail.listing.pricingTemplateLabel ||
                            (isEn ? "Not linked" : "Sin vincular")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                        <p className="font-medium text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {isEn ? "Available from" : "Disponible desde"}
                        </p>
                        <p className="mt-1 text-sm">
                          {formatDate(detail.availability.availableFrom, locale)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {detail.pricing.feeLines.length > 0 ? (
                        detail.pricing.feeLines.map((line, index) => (
                          <div
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background px-3 py-2"
                            key={`${String(line.label ?? "line")}-${index}`}
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {asString(line.label) || (isEn ? "Fee line" : "Línea")}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {asString(line.fee_type) || "fee"}
                              </p>
                            </div>
                            <p className="font-medium text-sm">
                              {formatCurrency(
                                Number(line.amount ?? 0),
                                detail.listing.currency || "PYG",
                                locale
                              )}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          {isEn
                            ? "No fee lines linked yet. Connect a pricing template before publishing."
                            : "Todavía no hay cuotas vinculadas. Conecta una plantilla de precios antes de publicar."}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/60 bg-card/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>
                      {isEn ? "Availability and applications" : "Disponibilidad y aplicaciones"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                        <p className="font-medium text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {isEn ? "Blocked dates" : "Fechas bloqueadas"}
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {detail.availability.blockedDatesCount}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                        <p className="font-medium text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {isEn ? "Upcoming reservations" : "Reservas próximas"}
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {detail.availability.upcomingReservationsCount}
                        </p>
                      </div>
                    </div>

                    <div
                      className="space-y-2 rounded-xl border border-border/50 bg-background p-3"
                      data-testid="listing-applications-panel"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-sm">
                          {isEn ? "Latest applications" : "Últimas aplicaciones"}
                        </p>
                        <Link
                          className="text-primary text-xs hover:underline"
                          href={`/module/applications?listing_id=${encodeURIComponent(detail.listing.id)}`}
                        >
                          {isEn ? "Open applications" : "Abrir aplicaciones"}
                        </Link>
                      </div>
                      {detail.applications.latest.length > 0 ? (
                        detail.applications.latest.map((application, index) => {
                          const applicationId = asString(application.id);
                          return (
                            <div
                              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2"
                              key={applicationId || `${index}`}
                            >
                              <div>
                                <p className="font-medium text-sm">
                                  {asString(application.title) ||
                                    (isEn ? "Application" : "Aplicación")}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {asString(application.status) || "—"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-muted-foreground text-xs">
                                  {formatDateTime(
                                    asString(application.createdAt) || null,
                                    locale
                                  )}
                                </p>
                                {applicationId ? (
                                  <Link
                                  className="text-primary text-xs hover:underline"
                                    href={`/module/applications/${encodeURIComponent(applicationId)}?return_to=${encodeURIComponent(detailPathWithReturn)}`}
                                  >
                                    {isEn ? "Open" : "Abrir"}
                                  </Link>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          {isEn
                            ? "No applications linked yet."
                            : "Todavía no hay aplicaciones vinculadas."}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          }
        />
      </PageScaffold>

      {previewOpen ? (
        <ListingPreviewModal
          isEn={isEn}
          isPublished={detail.listing.isPublished}
          listingId={detail.listing.id}
          locale={locale as "en-US" | "es-PY"}
          onClose={() => setPreviewOpen(false)}
          slug={detail.listing.publicSlug}
        />
      ) : null}
    </div>
  );
}
