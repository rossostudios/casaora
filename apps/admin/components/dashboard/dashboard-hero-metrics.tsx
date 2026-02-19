"use client";

import {
  ChartIcon,
  File01Icon,
  Home01Icon,
  Invoice01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";

import { StatCard } from "@/components/ui/stat-card";

type DashboardHeroMetricsProps = {
  isEn: boolean;
  occupancyRate: string;
  occupancyHelper: string;
  reportGross: string;
  revenueHelper: string;
  collectionRate: string;
  collectionHelper: string;
  pipelineValue: string;
  pipelineHelper: string;
};

export function DashboardHeroMetrics({
  isEn,
  occupancyRate,
  occupancyHelper,
  reportGross,
  revenueHelper,
  collectionRate,
  collectionHelper,
  pipelineValue,
  pipelineHelper,
}: DashboardHeroMetricsProps) {
  return (
    <section
      aria-label={isEn ? "Key metrics" : "Metricas clave"}
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <Link href="/module/leases">
        <StatCard
          icon={Home01Icon}
          label={isEn ? "Occupancy rate" : "Tasa de ocupacion"}
          value={occupancyRate}
          helper={occupancyHelper}
        />
      </Link>
      <Link href="/module/reports/finance">
        <StatCard
          icon={ChartIcon}
          label={isEn ? "Monthly revenue" : "Ingresos mensuales"}
          value={reportGross}
          helper={revenueHelper}
        />
      </Link>
      <Link href="/module/collections">
        <StatCard
          icon={Invoice01Icon}
          label={isEn ? "Collection rate" : "Tasa de cobro"}
          value={collectionRate}
          helper={collectionHelper}
        />
      </Link>
      <Link href="/module/applications">
        <StatCard
          icon={File01Icon}
          label={isEn ? "Pipeline" : "Pipeline"}
          value={pipelineValue}
          helper={pipelineHelper}
        />
      </Link>
    </section>
  );
}
