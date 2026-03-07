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
import { fetchPortfolioUnitOverview } from "@/lib/portfolio-overview";

type UnitRecordPageProps = {
  params: Promise<{ id: string }>;
};

function UnitSummaryCard({
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

export default async function UnitRecordPage({ params }: UnitRecordPageProps) {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";
  const { id } = await params;

  let data;
  try {
    data = await fetchPortfolioUnitOverview(id);
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

  const unitLabel = [data.unit.code, data.unit.name].filter(Boolean).join(" · ");
  const askAiHref = buildAgentContextHref({
    prompt: isEn
      ? `What should I do next for unit ${String(data.unit.code ?? id)}?`
      : `¿Qué debería hacer ahora con la unidad ${String(data.unit.code ?? id)}?`,
    context: {
      source: "units",
      entityIds: [id],
      filters: {},
      summary: isEn
        ? `${String(data.unit.code ?? id)} is in ${data.parentProperty.name}. Lease state ${data.summary.leaseState}, maintenance risk ${data.summary.maintenanceRisk}.`
        : `${String(data.unit.code ?? id)} está en ${data.parentProperty.name}. Estado ${data.summary.leaseState}, riesgo ${data.summary.maintenanceRisk}.`,
      returnPath: `/module/units/${id}`,
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        description={data.parentProperty.name}
        eyebrow={isEn ? "Portfolio Unit" : "Unidad del portafolio"}
        title={unitLabel || (isEn ? "Unit" : "Unidad")}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={data.parentProperty.unitsHref}>
                {isEn ? "Back to units" : "Volver a unidades"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={askAiHref}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
            <Button asChild>
              <Link href={`${data.parentProperty.unitsHref}&create=1`}>
                {isEn ? "Create sibling unit" : "Crear unidad hermana"}
              </Link>
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{String(data.unit.code ?? id)}</Badge>
          {data.unit.condition_status ? (
            <Badge variant="outline">{String(data.unit.condition_status)}</Badge>
          ) : null}
          <Badge variant="outline">{data.summary.leaseState}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <UnitSummaryCard
            detail={isEn ? "lease state" : "estado del contrato"}
            label={isEn ? "Lease" : "Contrato"}
            value={data.summary.leaseState}
          />
          <UnitSummaryCard
            detail={isEn ? "maintenance and turn risk" : "riesgo operativo"}
            label={isEn ? "Risk" : "Riesgo"}
            value={data.summary.maintenanceRisk}
          />
          <UnitSummaryCard
            detail={isEn ? "open work items" : "pendientes abiertos"}
            label={isEn ? "Tasks" : "Tareas"}
            value={String(data.summary.openTasks)}
          />
          <UnitSummaryCard
            detail={isEn ? "collections past due" : "cobros vencidos"}
            label={isEn ? "Overdue" : "Vencidos"}
            value={String(data.summary.overdueCollections)}
          />
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Keep the unit workflow tied to its parent property and sibling inventory."
                  : "Mantén el flujo de la unidad ligado a la propiedad madre y a las unidades hermanas."
              }
              title={isEn ? "Unit context" : "Contexto"}
            >
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="font-medium text-sm">{data.parentProperty.name}</p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {data.parentProperty.occupiedUnits}/{data.parentProperty.totalUnits}{" "}
                  {isEn ? "units occupied" : "unidades ocupadas"}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={data.parentProperty.href}>
                      {isEn ? "Open property" : "Abrir propiedad"}
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={data.parentProperty.unitsHref}>
                      {isEn ? "View all units" : "Ver unidades"}
                    </Link>
                  </Button>
                </div>
              </div>

              {data.siblings.slice(0, 5).map((sibling) => (
                <div
                  className="rounded-xl border border-border/60 bg-muted/20 p-3"
                  key={sibling.id}
                >
                  <p className="font-medium text-sm">
                    {[sibling.code, sibling.name].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {sibling.leaseState}
                    {sibling.conditionStatus ? ` · ${sibling.conditionStatus}` : ""}
                  </p>
                  <Button asChild className="mt-3 w-full justify-start" size="sm" variant="outline">
                    <Link href={sibling.primaryHref}>
                      {isEn ? "Open sibling" : "Abrir unidad"}
                    </Link>
                  </Button>
                </div>
              ))}
            </ActionRail>
          }
          primary={
            <div className="space-y-6">
              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Active lease" : "Contrato activo"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.activeLease ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                      <div>
                        <p className="font-medium text-sm">{data.activeLease.tenantName}</p>
                        <p className="text-muted-foreground text-xs">
                          {data.activeLease.currency} {data.activeLease.monthlyRent}
                          {data.activeLease.endsOn ? ` · ${data.activeLease.endsOn}` : ""}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={data.activeLease.href}>{isEn ? "Open lease" : "Abrir contrato"}</Link>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "No active lease is linked to this unit." : "No hay un contrato activo vinculado a esta unidad."}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Upcoming reservations" : "Reservas próximas"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.upcomingReservations.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "No upcoming reservations." : "No hay reservas próximas."}
                    </p>
                  ) : (
                    data.upcomingReservations.map((reservation) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                        key={reservation.id}
                      >
                        <div>
                          <p className="font-medium text-sm">{reservation.status}</p>
                          <p className="text-muted-foreground text-xs">
                            {[reservation.checkInDate, reservation.checkOutDate]
                              .filter(Boolean)
                              .join(" → ")}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={reservation.href}>{isEn ? "Open" : "Abrir"}</Link>
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Open tasks" : "Tareas abiertas"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.openTasks.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "No open tasks on this unit." : "No hay tareas abiertas en esta unidad."}
                    </p>
                  ) : (
                    data.openTasks.map((task) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                        key={task.id}
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {task.title || (isEn ? "Task" : "Tarea")}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {[task.status, task.priority].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={task.href}>{isEn ? "Open" : "Abrir"}</Link>
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
