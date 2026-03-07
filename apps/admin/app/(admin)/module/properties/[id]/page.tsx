import Link from "next/link";
import { notFound } from "next/navigation";
import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { ActionRail } from "@/components/ui/action-rail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { buildAgentContextHref } from "@/lib/ai-context";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";
import { fetchPortfolioPropertyOverview } from "@/lib/portfolio-overview";

type PropertyRecordPageProps = {
  params: Promise<{ id: string }>;
};

function PropertySummaryCard({
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

export default async function PropertyRecordPage({
  params,
}: PropertyRecordPageProps) {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";
  const { id } = await params;

  let data;
  try {
    data = await fetchPortfolioPropertyOverview(id);
  } catch (err) {
    const message = errorMessage(err);
    if (message.includes("404")) {
      notFound();
    }
    if (isOrgMembershipError(message)) {
      const activeOrgId = await getActiveOrgId();
      return <OrgAccessChanged orgId={activeOrgId} />;
    }
    throw err;
  }

  const activeOrgId = await getActiveOrgId();
  const propertyName = String(data.property.name ?? "Property");
  const propertyAddress = [data.property.address_line1, data.property.city]
    .filter(Boolean)
    .join(" · ");
  const floors = Array.isArray(data.hierarchy.floors)
    ? (data.hierarchy.floors as Array<Record<string, unknown>>)
    : [];
  const unassignedUnits = Array.isArray(data.hierarchy.unassigned_units)
    ? (data.hierarchy.unassigned_units as Array<Record<string, unknown>>)
    : [];
  const askAiHref = buildAgentContextHref({
    prompt: isEn
      ? `What should I do next for ${propertyName}?`
      : `¿Qué debería hacer ahora con ${propertyName}?`,
    context: {
      source: "properties",
      entityIds: [id],
      filters: {},
      summary: isEn
        ? `${propertyName} has ${data.summary.totalUnits} units, ${data.summary.openTasks} open tasks, and ${data.summary.overdueCollections} overdue collections.`
        : `${propertyName} tiene ${data.summary.totalUnits} unidades, ${data.summary.openTasks} tareas abiertas y ${data.summary.overdueCollections} cobros vencidos.`,
      returnPath: `/module/properties/${id}`,
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        description={propertyAddress || undefined}
        eyebrow={isEn ? "Portfolio Property" : "Propiedad del portafolio"}
        title={propertyName}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/module/properties">
                {isEn ? "Back to properties" : "Volver a propiedades"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={askAiHref}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
            <Button asChild>
              <Link href={`/module/units?property_id=${id}&create=1`}>
                {isEn ? "Create unit" : "Crear unidad"}
              </Link>
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {String(data.property.code ?? id)}
          </Badge>
          {data.property.status ? (
            <Badge variant="outline">{String(data.property.status)}</Badge>
          ) : null}
          {data.property.property_type ? (
            <Badge variant="outline">
              {String(data.property.property_type).replaceAll("_", " ")}
            </Badge>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <PropertySummaryCard
            detail={isEn ? "occupied / total units" : "ocupadas / total"}
            label={isEn ? "Occupancy" : "Ocupación"}
            value={`${data.summary.occupiedUnits}/${data.summary.totalUnits}`}
          />
          <PropertySummaryCard
            detail={isEn ? "open maintenance or ops work" : "trabajo operativo abierto"}
            label={isEn ? "Tasks" : "Tareas"}
            value={String(data.summary.openTasks)}
          />
          <PropertySummaryCard
            detail={isEn ? "collections currently past due" : "cobros actualmente vencidos"}
            label={isEn ? "Overdue" : "Vencidos"}
            value={String(data.summary.overdueCollections)}
          />
          <PropertySummaryCard
            detail={isEn ? "active leases" : "contratos activos"}
            label={isEn ? "Leases" : "Contratos"}
            value={String(data.summary.activeLeases)}
          />
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Move from the property record into the exact unit queue or ask AI with this property context."
                  : "Pasa del registro de la propiedad a la cola exacta de unidades o consulta a IA con este contexto."
              }
              title={isEn ? "Property actions" : "Acciones"}
            >
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href={`/module/units?property_id=${id}`}>
                  {isEn ? "Open filtered units" : "Abrir unidades filtradas"}
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href={askAiHref}>
                  {isEn ? "Review this property with AI" : "Revisar con IA"}
                </Link>
              </Button>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="font-medium text-sm">
                  {isEn ? "Health" : "Salud"}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {data.summary.health}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="font-medium text-sm">
                  {isEn ? "Recent activity count" : "Actividad reciente"}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {data.recentActivity.length}
                </p>
              </div>
            </ActionRail>
          }
          primary={
            <div className="space-y-6">
              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Linked units" : "Unidades vinculadas"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.linkedUnits.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {isEn
                        ? "No units are linked to this property yet."
                        : "Todavía no hay unidades vinculadas a esta propiedad."}
                    </p>
                  ) : (
                    data.linkedUnits.map((unit) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                        key={unit.id}
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {[unit.code, unit.name].filter(Boolean).join(" · ")}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {unit.leaseState} · {unit.maintenanceRisk} · {unit.openTasks}{" "}
                            {isEn ? "open tasks" : "tareas abiertas"}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={unit.href}>{isEn ? "Open unit" : "Abrir unidad"}</Link>
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Property hierarchy" : "Jerarquía"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {floors.length === 0 && unassignedUnits.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {isEn
                        ? "No floor or hierarchy data is configured yet."
                        : "Todavía no hay pisos ni jerarquía configurada."}
                    </p>
                  ) : null}
                  {floors.map((floor) => {
                    const floorUnits = Array.isArray(floor.units)
                      ? (floor.units as Array<Record<string, unknown>>)
                      : [];
                    return (
                      <div
                        className="rounded-xl border border-border/60 p-3"
                        key={String(floor.id ?? floor.label ?? Math.random())}
                      >
                        <p className="font-medium text-sm">
                          {String(floor.label ?? floor.number ?? "Floor")}
                        </p>
                        <p className="mt-2 text-muted-foreground text-xs">
                          {floorUnits
                            .map((unit) => String(unit.code ?? unit.name ?? "Unit"))
                            .join(", ") || (isEn ? "No units on this floor yet." : "Todavía no hay unidades en este piso.")}
                        </p>
                      </div>
                    );
                  })}
                  {unassignedUnits.length > 0 ? (
                    <div className="rounded-xl border border-border/60 p-3">
                      <p className="font-medium text-sm">
                        {isEn ? "Unassigned units" : "Unidades sin piso"}
                      </p>
                      <p className="mt-2 text-muted-foreground text-xs">
                        {unassignedUnits
                          .map((unit) => String(unit.code ?? unit.name ?? "Unit"))
                          .join(", ")}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Recent activity" : "Actividad reciente"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.recentActivity.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {isEn
                        ? "No recent activity is available yet."
                        : "Todavía no hay actividad reciente disponible."}
                    </p>
                  ) : (
                    data.recentActivity.map((item) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                        key={item.id}
                      >
                        <div>
                          <p className="font-medium text-sm">{item.title || item.kind}</p>
                          <p className="text-muted-foreground text-xs">
                            {[item.meta, item.createdAt].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={item.href}>{isEn ? "Open" : "Abrir"}</Link>
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          }
        />
      </PageScaffold>
    </div>
  );
}
