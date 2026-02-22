import { PortfolioDashboard } from "@/components/portfolio/portfolio-dashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchPortfolioComparison,
  fetchPortfolioKpis,
  fetchPortfolioSnapshots,
  type PortfolioKpis,
  type PortfolioPropertyComparison,
  type PortfolioSnapshot,
} from "@/lib/api";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";

export default async function PortfolioPage() {
  const locale = await getActiveLocale();
  const orgId = await getActiveOrgId();
  const isEn = locale === "en-US";

  if (!orgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {isEn
              ? "Missing organization context"
              : "Falta contexto de organización"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="warning">
            <AlertTitle>
              {isEn ? "Select an organization" : "Selecciona una organización"}
            </AlertTitle>
            <AlertDescription>
              {isEn
                ? "Portfolio requires an active organization."
                : "El portafolio requiere una organización activa."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  let kpis: PortfolioKpis | null = null;
  let properties: PortfolioPropertyComparison[] = [];
  let snapshots: PortfolioSnapshot[] = [];

  try {
    const [kpiData, compData, snapData] = await Promise.all([
      fetchPortfolioKpis(orgId).catch(() => null),
      fetchPortfolioComparison(orgId).catch(() => ({ properties: [] })),
      fetchPortfolioSnapshots(orgId, 30).catch(() => ({ snapshots: [] })),
    ]);

    kpis = kpiData;
    properties = compData.properties ?? [];
    snapshots = snapData.snapshots ?? [];
  } catch {
    // graceful degradation — empty state will render
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEn ? "Portfolio" : "Portafolio"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Cross-property performance and analytics"
            : "Rendimiento y análisis entre propiedades"}
        </p>
      </div>

      <PortfolioDashboard
        kpis={kpis}
        properties={properties}
        snapshots={snapshots}
        locale={locale}
      />
    </div>
  );
}
