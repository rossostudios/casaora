"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type {
  PortfolioKpis,
  PortfolioPropertyComparison,
  PortfolioSnapshot,
} from "@/lib/api";

type Props = {
  kpis: PortfolioKpis | null;
  properties: PortfolioPropertyComparison[];
  snapshots: PortfolioSnapshot[];
  locale: string;
};

export function PortfolioDashboard({
  kpis,
  properties,
  snapshots,
  locale,
}: Props) {
  const isEn = locale === "en-US";

  return (
    <div className="space-y-6">
      {/* KPI Hero Cards */}
      {kpis && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title={isEn ? "Total Units" : "Unidades Totales"}
            value={String(kpis.total_units)}
            subtitle={`${kpis.occupied_units} ${isEn ? "occupied" : "ocupadas"}`}
          />
          <KpiCard
            title={isEn ? "Occupancy" : "Ocupación"}
            value={`${(kpis.occupancy * 100).toFixed(1)}%`}
            subtitle={`${kpis.occupied_units} / ${kpis.total_units}`}
          />
          <KpiCard
            title={isEn ? "Monthly NOI" : "NOI Mensual"}
            value={formatCurrency(kpis.noi, "USD", "en-US")}
            subtitle={`${isEn ? "Revenue" : "Ingresos"}: ${formatCurrency(kpis.monthly_revenue, "USD", "en-US")}`}
          />
          <KpiCard
            title="RevPAR"
            value={formatCurrency(kpis.revpar, "USD", "en-US")}
            subtitle={isEn ? "Revenue per available room" : "Ingreso por unidad disponible"}
          />
        </div>
      )}

      {/* Property Comparison */}
      {properties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isEn ? "Property Comparison" : "Comparación de Propiedades"}
            </CardTitle>
            <CardDescription>
              {isEn
                ? "Performance by property"
                : "Rendimiento por propiedad"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">
                      {isEn ? "Property" : "Propiedad"}
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      {isEn ? "Units" : "Unidades"}
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      {isEn ? "Occupancy" : "Ocupación"}
                    </th>
                    <th className="pb-2 font-medium text-right">
                      {isEn ? "Revenue" : "Ingresos"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <tr
                      key={p.property_id}
                      className="border-b last:border-0"
                    >
                      <td className="py-2 pr-4">{p.property_name}</td>
                      <td className="py-2 pr-4 text-right">
                        {p.occupied_units}/{p.total_units}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {(p.occupancy * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(p.monthly_revenue, "USD", "en-US")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Snapshots */}
      {snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isEn ? "Historical Snapshots" : "Historial de Rendimiento"}
            </CardTitle>
            <CardDescription>
              {isEn
                ? "Nightly portfolio performance history"
                : "Historial nocturno del rendimiento del portafolio"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">
                      {isEn ? "Date" : "Fecha"}
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      {isEn ? "Occupancy" : "Ocupación"}
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      {isEn ? "Revenue" : "Ingresos"}
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">NOI</th>
                    <th className="pb-2 font-medium text-right">RevPAR</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.slice(0, 14).map((s) => (
                    <tr key={s.date} className="border-b last:border-0">
                      <td className="py-2 pr-4 tabular-nums">{s.date}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {(s.occupancy * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatCurrency(s.revenue, "USD", "en-US")}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatCurrency(s.noi, "USD", "en-US")}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatCurrency(s.revpar, "USD", "en-US")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!kpis && properties.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isEn
              ? "No portfolio data available. Add properties and units to get started."
              : "No hay datos de portafolio disponibles. Agrega propiedades y unidades para comenzar."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-wide">
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
