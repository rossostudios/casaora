import Link from "next/link";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Locale } from "@/lib/i18n";
import type {
  ListingsOverviewResponse,
  ListingsOverviewRow,
} from "@/lib/listings-overview";

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

export function ChannelsManager({
  locale,
  overview,
  blockedRows,
}: {
  locale: Locale;
  overview: ListingsOverviewResponse;
  blockedRows: ListingsOverviewRow[];
}) {
  const isEn = locale === "en-US";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        description={
          isEn
            ? "Casaora Marketplace is the only live listing channel right now. Use this page to monitor publication health and jump back into Listings."
            : "Casaora Marketplace es el único canal activo por ahora. Usa esta página para monitorear la salud de publicación y volver a Anuncios."
        }
        eyebrow={isEn ? "Leasing" : "Leasing"}
        title={isEn ? "Channels" : "Canales"}
      >
        <div
          className="grid gap-4 md:grid-cols-4"
          data-testid="channels-marketplace-health"
        >
          <SummaryCard
            detail={isEn ? "visible in marketplace" : "visibles en marketplace"}
            label={isEn ? "Live" : "Publicados"}
            value={String(overview.summary.published)}
          />
          <SummaryCard
            detail={isEn ? "still being prepared" : "todavía en preparación"}
            label={isEn ? "Drafts" : "Borradores"}
            value={String(overview.summary.drafts)}
          />
          <SummaryCard
            detail={isEn ? "missing something critical" : "les falta algo crítico"}
            label={isEn ? "Blocked" : "Bloqueados"}
            value={String(overview.summary.blocked)}
          />
          <SummaryCard
            detail={isEn ? "applications linked to listings" : "aplicaciones ligadas a anuncios"}
            label={isEn ? "Applications" : "Aplicaciones"}
            value={String(overview.summary.applications)}
          />
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Third-party syndication is intentionally inactive. Keep Listings clean and publishable in Casaora Marketplace first."
                  : "La sindicación a terceros está inactiva a propósito. Primero mantén Anuncios limpios y publicables en Casaora Marketplace."
              }
              title={isEn ? "Marketplace shortcuts" : "Atajos del marketplace"}
            >
              <Button asChild className="w-full justify-start">
                <Link href="/module/listings">
                  {isEn ? "Open listings queue" : "Abrir cola de anuncios"}
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/module/listings?view=live">
                  {isEn ? "Review live listings" : "Revisar publicados"}
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/module/listings?lifecycle_state=blocked">
                  {isEn ? "Fix blocked listings" : "Corregir bloqueados"}
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/marketplace">
                  {isEn ? "Open marketplace" : "Abrir marketplace"}
                </Link>
              </Button>
            </ActionRail>
          }
          primary={
            <div className="space-y-6">
              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>
                    {isEn ? "Active publication target" : "Canal de publicación activo"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label="Casaora Marketplace" value="published" />
                    <StatusBadge
                      label={isEn ? "0% commission" : "0% comisión"}
                      value="good"
                    />
                  </div>
                  <p className="max-w-3xl text-muted-foreground text-sm">
                    {isEn
                      ? "Listings publish directly to Casaora Marketplace. Pricing comes from pricing templates, availability comes from unit calendars and reservations, and applications return to Leasing."
                      : "Los anuncios se publican directamente en Casaora Marketplace. Los precios vienen de plantillas de precios, la disponibilidad viene de calendarios y reservas de unidad, y las aplicaciones vuelven a Leasing."}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>
                    {isEn ? "Listings needing attention" : "Anuncios que necesitan atención"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {blockedRows.length > 0 ? (
                    blockedRows.map((row) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-background px-4 py-3"
                        key={row.id}
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{row.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {[row.propertyName, row.unitName].filter(Boolean).join(" · ") ||
                              (isEn ? "Missing unit context" : "Falta contexto de unidad")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/module/listings/${encodeURIComponent(row.id)}?return_to=${encodeURIComponent("/module/channels")}`}
                            >
                              {isEn ? "Open" : "Abrir"}
                            </Link>
                          </Button>
                          <Button asChild size="sm">
                            <Link
                              href={`/module/listings/${encodeURIComponent(row.id)}?preview=1&return_to=${encodeURIComponent("/module/channels")}`}
                            >
                              {isEn ? "Preview" : "Vista previa"}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {isEn
                        ? "No blocked marketplace listings right now."
                        : "No hay anuncios bloqueados en este momento."}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>
                    {isEn ? "Out of scope for now" : "Fuera de alcance por ahora"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-muted-foreground text-sm">
                  <p>
                    {isEn
                      ? "Airbnb, Booking.com, VRBO, and other channels are intentionally not active in this UI yet."
                      : "Airbnb, Booking.com, VRBO y otros canales no están activos en esta interfaz todavía."}
                  </p>
                  <p>
                    {isEn
                      ? "The priority is one reliable publishing path: create a unit-backed listing, preview it, publish it, and receive applications through Casaora Marketplace."
                      : "La prioridad es una ruta de publicación confiable: crear un anuncio ligado a una unidad, previsualizarlo, publicarlo y recibir aplicaciones por Casaora Marketplace."}
                  </p>
                </CardContent>
              </Card>
            </div>
          }
        />
      </PageScaffold>
    </div>
  );
}
