"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ApplicationsStats({
  isEn,
  metrics,
}: {
  isEn: boolean;
  metrics: {
    total: number;
    unassigned: number;
    slaBreached: number;
    slaAtRisk: number;
    medianFirstResponse: number;
  };
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] text-muted-foreground">
            {isEn ? "Applications" : "Aplicaciones"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-2xl">{metrics.total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] text-muted-foreground">
            {isEn ? "Unassigned" : "Sin asignar"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-2xl">{metrics.unassigned}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] text-muted-foreground">
            {isEn ? "SLA breached" : "SLA vencido"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-2xl">{metrics.slaBreached}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] text-muted-foreground">
            {isEn ? "SLA at risk" : "SLA en riesgo"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-2xl">{metrics.slaAtRisk}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] text-muted-foreground">
            {isEn ? "Median first response" : "Mediana primera respuesta"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-2xl">
            {metrics.medianFirstResponse > 0
              ? `${metrics.medianFirstResponse.toFixed(1)}m`
              : "-"}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
