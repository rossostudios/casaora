"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";

function asString(value: unknown): string {
  return typeof value === "string" ? value : value ? String(value) : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function OwnerDashboard({ locale }: { locale: string }) {
  "use no memo";
  const isEn = locale === "en-US";
  const router = useRouter();
  const [tokenState] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("owner_token") : null
  );

  const { data = null, isPending: loading } = useQuery({
    queryKey: ["owner-dashboard", tokenState],
    queryFn: async () => {
      const token = localStorage.getItem("owner_token");
      if (!token) {
        router.push("/owner/login");
        return null;
      }
      const res = await fetch(`${API_BASE}/owner/dashboard`, {
        headers: { "x-owner-token": token },
      });
      if (res.status === 401) {
        localStorage.removeItem("owner_token");
        localStorage.removeItem("owner_org_id");
        router.push("/owner/login");
        return null;
      }
      if (!res.ok) return null;
      return (await res.json()) as Record<string, unknown>;
    },
    enabled: Boolean(tokenState),
  });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground animate-pulse">
          {isEn ? "Loading..." : "Cargando..."}
        </p>
      </div>
    );
  }
  if (!data) return null;

  const org = (data.organization ?? {}) as Record<string, unknown>;
  const summary = (data.summary ?? {}) as Record<string, unknown>;
  const revenueByMonth = (data.revenue_by_month ?? []) as Record<string, unknown>[];
  const revenueByProperty = (data.revenue_by_property ?? []) as Record<string, unknown>[];
  const upcomingReservations = (data.upcoming_reservations ?? []) as Record<string, unknown>[];
  const currency = asString(org.default_currency) || "PYG";

  // Max value for bar chart scaling
  const maxMonthlyRevenue = Math.max(
    ...revenueByMonth.map((r) => asNumber(r.amount)),
    1
  );
  const maxPropertyRevenue = Math.max(
    ...revenueByProperty.map((r) => asNumber(r.amount)),
    1
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isEn ? "Owner Dashboard" : "Panel del Propietario"}
        {asString(org.name) ? ` — ${asString(org.name)}` : ""}
      </h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">
              {asNumber(summary.total_properties)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEn ? "Properties" : "Propiedades"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">
              {asNumber(summary.total_units)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEn ? "Units" : "Unidades"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">
              {asNumber(summary.occupancy_rate).toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEn ? "Occupancy Rate" : "Tasa de Ocupación"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">
              {formatCurrency(
                asNumber(summary.total_collected),
                currency,
                locale
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEn ? "Total Collected" : "Total Cobrado"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly revenue trend */}
        {revenueByMonth.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {isEn ? "Revenue Trend" : "Tendencia de Ingresos"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2" style={{ height: 140 }}>
                {revenueByMonth.map((r) => {
                  const amount = asNumber(r.amount);
                  const heightPct = Math.max((amount / maxMonthlyRevenue) * 100, 4);
                  return (
                    <div
                      className="flex flex-1 flex-col items-center gap-1"
                      key={asString(r.month)}
                    >
                      <span className="text-[10px] text-muted-foreground">
                        {formatCurrency(amount, currency, locale)}
                      </span>
                      <div
                        className="w-full rounded-t bg-primary/80"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {asString(r.month).slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Revenue by property */}
        {revenueByProperty.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {isEn ? "Revenue by Property" : "Ingresos por Propiedad"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {revenueByProperty.map((r) => {
                const amount = asNumber(r.amount);
                const widthPct = Math.max((amount / maxPropertyRevenue) * 100, 4);
                return (
                  <div key={asString(r.property_id)}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">
                        {asString(r.property_name) || asString(r.property_id).slice(0, 8)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatCurrency(amount, currency, locale)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary/70"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Upcoming reservations */}
      {upcomingReservations.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {isEn ? "Upcoming Reservations" : "Próximas Reservas"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingReservations.slice(0, 5).map((r) => (
              <div
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                key={asString(r.id)}
              >
                <div>
                  <p className="font-medium">
                    {asString(r.check_in_date)} &rarr;{" "}
                    {asString(r.check_out_date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {asString(r.unit_name) || asString(r.unit_id).slice(0, 8)}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {asString(r.status)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Activity counts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {isEn ? "Active Leases" : "Contratos Activos"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {asNumber(summary.active_leases)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {isEn ? "Active Reservations" : "Reservas Activas"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {asNumber(summary.active_reservations)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {isEn ? "Pending Statements" : "Estados Pendientes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {asNumber(summary.pending_statements)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Link href="/owner/properties">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardContent className="p-4 text-center">
              <p className="font-medium">
                {isEn ? "Properties" : "Propiedades"}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/owner/statements">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardContent className="p-4 text-center">
              <p className="font-medium">
                {isEn ? "Statements" : "Estados de Cuenta"}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/owner/reservations">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardContent className="p-4 text-center">
              <p className="font-medium">
                {isEn ? "Reservations" : "Reservas"}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Button
          className="h-auto"
          onClick={() => {
            localStorage.removeItem("owner_token");
            localStorage.removeItem("owner_org_id");
            router.push("/owner/login");
          }}
          variant="outline"
        >
          {isEn ? "Sign Out" : "Cerrar Sesión"}
        </Button>
      </div>
    </div>
  );
}
