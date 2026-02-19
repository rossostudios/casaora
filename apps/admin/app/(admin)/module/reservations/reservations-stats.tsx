"use client";

import {
  Globe02Icon,
  Home01Icon,
  Login03Icon,
  Logout03Icon,
  Money01Icon,
} from "@hugeicons/core-free-icons";

import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/format";

export function ReservationsStats({
  isEn,
  kpiStats,
  locale,
  periodRevenue,
  total,
}: {
  isEn: boolean;
  kpiStats: {
    arrivalsToday: number;
    departuresToday: number;
    inHouse: number;
    marketplace: number;
  };
  locale: string;
  periodRevenue: { total: number; currency: string };
  total: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        icon={Login03Icon}
        label={isEn ? "Today's Arrivals" : "Llegadas hoy"}
        value={String(kpiStats.arrivalsToday)}
      />
      <StatCard
        icon={Logout03Icon}
        label={isEn ? "Today's Departures" : "Salidas hoy"}
        value={String(kpiStats.departuresToday)}
      />
      <StatCard
        icon={Home01Icon}
        label={isEn ? "In-House" : "In-house"}
        value={String(kpiStats.inHouse)}
      />
      <StatCard
        icon={Globe02Icon}
        label="Marketplace"
        value={String(kpiStats.marketplace)}
      />
      <StatCard
        helper={`${total} ${isEn ? "filtered records" : "registros filtrados"}`}
        icon={Money01Icon}
        label={isEn ? "Period Revenue" : "Ingresos del periodo"}
        value={formatCurrency(
          periodRevenue.total,
          periodRevenue.currency,
          locale
        )}
      />
    </div>
  );
}
