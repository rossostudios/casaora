"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  const isEn = locale === "en-US";
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    const token = localStorage.getItem("owner_token");
    if (!token) {
      router.push("/owner/login");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/owner/dashboard`, {
        headers: { "x-owner-token": token },
      });
      if (res.status === 401) {
        localStorage.removeItem("owner_token");
        localStorage.removeItem("owner_org_id");
        router.push("/owner/login");
        return;
      }
      setData(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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
                asString(org.default_currency) || "PYG",
                locale
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEn ? "Total Collected" : "Total Cobrado"}
            </p>
          </CardContent>
        </Card>
      </div>

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
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
