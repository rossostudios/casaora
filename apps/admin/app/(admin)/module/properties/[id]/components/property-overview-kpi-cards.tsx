import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { PropertyOverview as PropertyOverviewData } from "../types";

type PropertyOverviewKpiCardsProps = {
  overview: PropertyOverviewData;
  locale: "en-US" | "es-PY";
  isEn: boolean;
};

export function PropertyOverviewKpiCards({
  overview,
  locale,
  isEn,
}: PropertyOverviewKpiCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card className="border-border/80 bg-card/95">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs">
            {isEn ? "Occupancy" : "Ocupación"}
          </p>
          <p className="font-semibold text-2xl">
            {overview.occupancyRate !== null
              ? `${overview.occupancyRate}%`
              : "-"}
          </p>
        </CardContent>
      </Card>
      <Card className="border-border/80 bg-card/95">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs">
            {isEn ? "Projected rent" : "Renta proyectada"}
          </p>
          <p className="font-semibold text-xl">
            {formatCurrency(overview.projectedRentPyg, "PYG", locale)}
          </p>
        </CardContent>
      </Card>
      <Card className="border-border/80 bg-card/95">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs">
            {isEn ? "Active leases" : "Contratos activos"}
          </p>
          <p className="font-semibold text-2xl">{overview.activeLeaseCount}</p>
        </CardContent>
      </Card>
      <Card className="border-border/80 bg-card/95">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs">
            {isEn ? "Open tasks" : "Tareas abiertas"}
          </p>
          <p className="font-semibold text-2xl">{overview.openTaskCount}</p>
        </CardContent>
      </Card>
      <Card className="border-border/80 bg-card/95">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs">
            {isEn ? "Open collections" : "Cobros abiertos"}
          </p>
          <p className="font-semibold text-2xl">
            {overview.openCollectionCount}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
