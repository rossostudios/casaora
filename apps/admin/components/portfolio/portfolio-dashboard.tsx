"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ActionRail } from "@/components/ui/action-rail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { buildAgentContextHref } from "@/lib/ai-context";
import { errorMessage } from "@/lib/errors";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import {
  type PortfolioOverviewPeriod,
  type PortfolioOverviewResponse,
} from "@/lib/portfolio-analytics";

type Props = {
  currency: string;
  initialOverview: PortfolioOverviewResponse;
  initialPeriod: PortfolioOverviewPeriod;
  locale: Locale;
  orgId: string;
};

const PERIOD_OPTIONS: Array<{
  id: PortfolioOverviewPeriod;
  label: string;
}> = [
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "12m", label: "12m" },
];

export function PortfolioDashboard({
  currency,
  initialOverview,
  initialPeriod,
  locale,
  orgId,
}: Props) {
  const isEn = locale === "en-US";
  const [overview, setOverview] = useState(initialOverview);
  const [period, setPeriod] = useState<PortfolioOverviewPeriod>(initialPeriod);
  const [pendingPeriod, setPendingPeriod] = useState<PortfolioOverviewPeriod | null>(
    null
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setOverview(initialOverview);
    setPeriod(initialPeriod);
    setPendingPeriod(null);
    setError("");
  }, [initialOverview, initialPeriod]);

  async function handlePeriodChange(nextPeriod: PortfolioOverviewPeriod) {
    if (nextPeriod === period || pendingPeriod) return;
    const previousPeriod = period;
    setPeriod(nextPeriod);
    setPendingPeriod(nextPeriod);
    setError("");

    try {
      const response = await fetch(
        `/api/portfolio/overview?org_id=${encodeURIComponent(orgId)}&period=${encodeURIComponent(nextPeriod)}`,
        {
          cache: "no-store",
        }
      );

      const payload = (await response.json()) as
        | PortfolioOverviewResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "error" in payload
            ? payload.error || "Portfolio overview request failed."
            : "Portfolio overview request failed."
        );
      }

      setOverview(payload as PortfolioOverviewResponse);
      const path =
        nextPeriod === "30d"
          ? "/app/portfolio"
          : `/app/portfolio?period=${encodeURIComponent(nextPeriod)}`;
      window.history.replaceState(window.history.state, "", path);
    } catch (err) {
      setPeriod(previousPeriod);
      setError(errorMessage(err));
    } finally {
      setPendingPeriod(null);
    }
  }

  const askAiHref = buildAgentContextHref({
    prompt: isEn
      ? "Review the current portfolio overview and recommend the next operator actions."
      : "Revisa el resumen actual del portafolio y recomienda las próximas acciones operativas.",
    context: {
      source: "portfolio",
      entityIds: overview.topProperties.map((property) => property.id),
      filters: { period },
      summary: `${overview.summary.totalProperties} properties · ${overview.summary.totalUnits} units · ${overview.summary.openTasks} open tasks · ${overview.summary.overdueCollections} overdue collections`,
      returnPath:
        period === "30d"
          ? "/app/portfolio"
          : `/app/portfolio?period=${encodeURIComponent(period)}`,
    },
  });

  if (!overview.hasData) {
    return (
      <Card className="border border-border/60 bg-card/70" data-testid="portfolio-empty-state">
        <CardContent className="p-6">
          <EmptyState
            action={
              <Button asChild>
                <Link href="/module/properties">
                  {isEn ? "Open properties" : "Abrir propiedades"}
                </Link>
              </Button>
            }
            description={
              isEn
                ? "Portfolio analytics starts showing trends after you add properties and units."
                : "La analítica del portafolio empieza a mostrar tendencias después de agregar propiedades y unidades."
            }
            title={
              isEn
                ? "Add your first property to activate analytics"
                : "Agrega tu primera propiedad para activar la analítica"
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        data-testid="portfolio-summary"
      >
        <MetricCard
          detail={`${overview.summary.totalUnits} ${isEn ? "units tracked" : "unidades monitoreadas"}`}
          title={isEn ? "Properties" : "Propiedades"}
          value={String(overview.summary.totalProperties)}
        />
        <MetricCard
          detail={`${overview.summary.occupiedUnits}/${overview.summary.totalUnits} ${isEn ? "occupied" : "ocupadas"}`}
          title={isEn ? "Occupancy" : "Ocupación"}
          value={`${overview.summary.occupancyRate.toFixed(1)}%`}
        />
        <MetricCard
          detail={isEn ? "Across the portfolio" : "En todo el portafolio"}
          title={isEn ? "Open Tasks" : "Tareas abiertas"}
          value={String(overview.summary.openTasks)}
        />
        <MetricCard
          detail={isEn ? "Need follow-up" : "Requieren seguimiento"}
          title={isEn ? "Overdue Collections" : "Cobros vencidos"}
          value={String(overview.summary.overdueCollections)}
        />
      </section>

      <Card className="border border-border/60 bg-card/70" data-testid="portfolio-trend">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle>{isEn ? "Trend" : "Tendencia"}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "Track occupancy, revenue, and NOI over the selected period."
                : "Sigue ocupación, ingresos y NOI durante el período seleccionado."}
            </p>
          </div>
          <div
            aria-label={isEn ? "Trend period" : "Período de tendencia"}
            className="flex flex-wrap items-center gap-2"
            role="group"
          >
            {PERIOD_OPTIONS.map((option) => (
              <Button
                aria-pressed={period === option.id}
                data-testid={`portfolio-period-${option.id}`}
                disabled={Boolean(pendingPeriod)}
                key={option.id}
                onClick={() => void handlePeriodChange(option.id)}
                size="sm"
                variant={period === option.id ? "default" : "outline"}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <DeltaCard
              label={isEn ? "Revenue change" : "Cambio en ingresos"}
              value={formatDeltaPercent(overview.trend.delta.revenuePct, isEn)}
            />
            <DeltaCard
              label={isEn ? "Occupancy change" : "Cambio en ocupación"}
              value={formatDeltaPoints(overview.trend.delta.occupancyPts, isEn)}
            />
            <DeltaCard
              label="NOI"
              value={formatDeltaPercent(overview.trend.delta.noiPct, isEn)}
            />
          </div>

          {error ? (
            <p aria-live="polite" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">
                    {isEn ? "Date" : "Fecha"}
                  </th>
                  <th className="pb-2 pr-4 text-right font-medium">
                    {isEn ? "Occupancy" : "Ocupación"}
                  </th>
                  <th className="pb-2 pr-4 text-right font-medium">
                    {isEn ? "Revenue" : "Ingresos"}
                  </th>
                  <th className="pb-2 text-right font-medium">NOI</th>
                </tr>
              </thead>
              <tbody>
                {overview.trend.points.map((point) => (
                  <tr className="border-b border-border/50 last:border-0" key={point.date}>
                    <td className="py-3 pr-4 tabular-nums">{point.date}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {point.occupancyRate.toFixed(1)}%
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatCurrency(point.revenue, currency, locale)}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatCurrency(point.noi, currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card
        className="border border-border/60 bg-card/70"
        data-testid="portfolio-top-properties"
      >
        <CardHeader className="space-y-1">
          <CardTitle>{isEn ? "Top properties" : "Propiedades destacadas"}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {isEn
              ? "Ranked by health signals and current workload."
              : "Ordenadas por señales de salud y carga operativa actual."}
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">
                  {isEn ? "Property" : "Propiedad"}
                </th>
                <th className="pb-2 pr-4 text-right font-medium">
                  {isEn ? "Occupancy" : "Ocupación"}
                </th>
                <th className="pb-2 pr-4 text-right font-medium">
                  {isEn ? "Open Tasks" : "Tareas"}
                </th>
                <th className="pb-2 pr-4 text-right font-medium">
                  {isEn ? "Overdue" : "Vencidos"}
                </th>
                <th className="pb-2 font-medium">{isEn ? "Action" : "Acción"}</th>
              </tr>
            </thead>
            <tbody>
              {overview.topProperties.map((property) => (
                <tr
                  className="border-b border-border/50 last:border-0"
                  key={property.id}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Link
                        className="font-medium hover:underline"
                        href={property.href}
                      >
                        {property.name}
                      </Link>
                      <HealthBadge health={property.health} isEn={isEn} />
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {property.occupiedUnits}/{property.totalUnits}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {property.openTasks}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {property.overdueCollections}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        className="text-primary text-sm underline-offset-4 hover:underline"
                        href={property.href}
                      >
                        {isEn ? "Open property" : "Abrir propiedad"}
                      </Link>
                      <Link
                        className="text-primary text-sm underline-offset-4 hover:underline"
                        href={property.unitsHref}
                      >
                        {isEn ? "View units" : "Ver unidades"}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <Card
          className="border border-border/60 bg-card/70"
          data-testid="portfolio-attention"
        >
          <CardHeader className="space-y-1">
            <CardTitle>{isEn ? "Needs attention" : "Necesita atención"}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "Highest-priority issues across properties and units."
                : "Problemas de mayor prioridad en propiedades y unidades."}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.attentionItems.map((item) => (
              <Link
                className="block rounded-2xl border border-border/60 p-4 transition-colors hover:bg-muted/30"
                href={item.href}
                key={item.id}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant={item.severity === "high" ? "destructive" : "secondary"}>
                    {attentionLabel(item.severity, isEn)}
                  </Badge>
                  <Badge variant="outline">
                    {item.kind === "property"
                      ? isEn
                        ? "Property"
                        : "Propiedad"
                      : isEn
                        ? "Unit"
                        : "Unidad"}
                  </Badge>
                </div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="mt-1 text-muted-foreground text-sm">{item.subtitle}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <ActionRail
          description={
            isEn
              ? "Jump straight into the main portfolio workflows from the current overview."
              : "Entra directo a los principales flujos del portafolio desde el resumen actual."
          }
          title={isEn ? "Next actions" : "Siguientes acciones"}
        >
          <div className="space-y-1">
            <p className="font-medium text-sm">
              {isEn ? "Monthly revenue" : "Ingresos mensuales"}
            </p>
            <p className="text-2xl tabular-nums">
              {formatCompactCurrency(overview.summary.monthlyRevenue, currency, locale)}
            </p>
            <p className="text-muted-foreground text-xs">
              {isEn
                ? `Current period: ${period}`
                : `Período actual: ${period}`}
            </p>
          </div>

          <Button asChild className="w-full">
            <Link href="/module/properties">
              {isEn ? "Open properties" : "Abrir propiedades"}
            </Link>
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link href="/module/units">
              {isEn ? "Open units" : "Abrir unidades"}
            </Link>
          </Button>
          <Button asChild className="w-full" variant="secondary">
            <Link href={askAiHref}>
              <Icon icon={SparklesIcon} size={14} />
              {isEn ? "Ask AI" : "Preguntar a IA"}
            </Link>
          </Button>
        </ActionRail>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border border-border/60 bg-card/70">
      <CardContent className="space-y-2 p-5">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
          {title}
        </p>
        <p className="font-semibold text-3xl tabular-nums tracking-tight">{value}</p>
        <p className="text-muted-foreground text-sm">{detail}</p>
      </CardContent>
    </Card>
  );
}

function DeltaCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
      <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
        {label}
      </p>
      <p className="mt-2 font-medium text-base tabular-nums">{value}</p>
    </div>
  );
}

function HealthBadge({
  health,
  isEn,
}: {
  health: "good" | "watch" | "critical";
  isEn: boolean;
}) {
  if (health === "critical") {
    return <Badge variant="destructive">{isEn ? "Critical" : "Crítica"}</Badge>;
  }
  if (health === "watch") {
    return <Badge variant="secondary">{isEn ? "Watch" : "Atención"}</Badge>;
  }
  return <Badge variant="outline">{isEn ? "Healthy" : "Saludable"}</Badge>;
}

function attentionLabel(
  severity: "high" | "medium" | "low",
  isEn: boolean
): string {
  if (severity === "high") return isEn ? "High" : "Alta";
  if (severity === "medium") return isEn ? "Medium" : "Media";
  return isEn ? "Low" : "Baja";
}

function formatDeltaPercent(value: number | null, isEn: boolean): string {
  if (value === null) return isEn ? "No baseline yet" : "Sin base todavía";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatDeltaPoints(value: number | null, isEn: boolean): string {
  if (value === null) return isEn ? "No baseline yet" : "Sin base todavía";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} ${isEn ? "pts" : "pts"}`;
}
