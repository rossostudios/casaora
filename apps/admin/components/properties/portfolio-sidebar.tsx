"use client";

import {
  AlertCircleIcon,
  ChartIcon,
  Home01Icon,
  InformationCircleIcon,
  Invoice03Icon,
  Task01Icon,
  Time02Icon,
} from "@hugeicons/core-free-icons";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import type {
  PropertyActivityItem,
  PropertyNotificationItem,
} from "@/lib/features/properties/types";
import { formatCompactCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type PortfolioStatsProps = {
  totalValuePyg: number;
  occupancyRate: number;
  avgRentPyg: number;
  recentActivity: PropertyActivityItem[];
  notifications: PropertyNotificationItem[];
  isEn: boolean;
  formatLocale: "en-US" | "es-PY";
};

const MOCK_CHART_DATA = [
  { value: 4000 },
  { value: 3000 },
  { value: 2000 },
  { value: 2780 },
  { value: 1890 },
  { value: 2390 },
  { value: 3490 },
];

function relativeTimeLabel(timestamp: Date, isEn: boolean): string {
  const deltaMs = Date.now() - timestamp.getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / (1000 * 60)));

  if (minutes < 60) {
    return isEn ? `${minutes}m ago` : `${minutes}m atrás`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return isEn ? `${hours}h ago` : `hace ${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return isEn ? `${days}d ago` : `hace ${days}d`;
}

function activityIcon(item: PropertyActivityItem) {
  if (item.id.startsWith("task")) return Task01Icon;
  if (item.id.startsWith("collection")) return Invoice03Icon;
  if (item.title.toLowerCase().includes("lease")) return Home01Icon;
  return InformationCircleIcon;
}

export function PortfolioSidebar({
  totalValuePyg,
  occupancyRate,
  avgRentPyg,
  recentActivity,
  notifications,
  isEn,
  formatLocale,
}: PortfolioStatsProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="px-1 font-bold text-[11px] text-muted-foreground/70 uppercase tracking-widest">
          {isEn ? "Portfolio Summary" : "Resumen del Portafolio"}
        </h3>

        <Card className="group relative overflow-hidden border-0 bg-[#1e2b61] text-white shadow-xl">
          <div className="absolute right-0 top-0 p-4 opacity-5 transition-transform group-hover:-translate-y-2 group-hover:translate-x-2">
            <Icon icon={ChartIcon} size={140} />
          </div>
          <CardHeader className="relative z-10 pb-2">
            <div className="font-semibold text-[11px] text-white/70 uppercase tracking-wider">
              {isEn ? "Total Assets" : "Activos Totales"}
            </div>
            <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-white">
              {formatCompactCurrency(totalValuePyg, "PYG", formatLocale)}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 pt-0">
            <div className="mb-6 flex items-center gap-2">
              <Badge className="status-tone-info h-5 border px-1.5 text-[10px]">
                <Icon className="mr-1" icon={ChartIcon} size={10} />
                +12% YOY
              </Badge>
            </div>

            <div className="h-14 w-full opacity-60">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={MOCK_CHART_DATA}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="value"
                    fill="url(#colorValue)"
                    stroke="#93c5fd"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/60 bg-card/50 shadow-sm transition-colors hover:bg-card">
            <CardContent className="space-y-1 p-3">
              <div className="font-bold text-[10px] text-muted-foreground/80 uppercase tracking-wider">
                {isEn ? "Occupancy" : "Ocupación"}
              </div>
              <div className="text-[var(--status-success-fg)] text-lg font-bold">
                {Math.round(occupancyRate)}%
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/50 shadow-sm transition-colors hover:bg-card">
            <CardContent className="space-y-1 p-3">
              <div className="font-bold text-[10px] text-muted-foreground/80 uppercase tracking-wider">
                {isEn ? "Avg. Rent" : "Alquiler Prom."}
              </div>
              <div className="text-lg font-bold text-foreground">
                {formatCompactCurrency(avgRentPyg, "PYG", formatLocale)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3">
          <h3 className="px-1 font-bold text-[11px] text-red-500/80 uppercase tracking-widest">
            {isEn ? "Action Required" : "Acción Requerida"}
          </h3>
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                className="flex gap-3 rounded-xl border border-red-100 bg-red-50/30 p-3 dark:border-red-900/20 dark:bg-red-950/20"
                key={notification.id}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                  <Icon icon={AlertCircleIcon} size={16} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">
                    {notification.title}
                  </h4>
                  <p className="leading-relaxed text-red-700/80 text-xs dark:text-red-400/80">
                    {notification.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-[11px] text-muted-foreground/70 uppercase tracking-widest">
            {isEn ? "Recent Activity" : "Actividad Reciente"}
          </h3>
          <Icon className="text-muted-foreground/50" icon={Time02Icon} size={14} />
        </div>

        <div className="space-y-5 px-1">
          {recentActivity.length === 0 ? (
            <div className="py-2 text-muted-foreground text-xs italic">
              {isEn ? "No recent activity recorded." : "No se registró actividad reciente."}
            </div>
          ) : (
            recentActivity.map((item) => (
              <div className="group flex gap-4" key={item.id}>
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105",
                    item.tone === "info" && "status-tone-info border",
                    item.tone === "warning" && "status-tone-warning border",
                    item.tone === "danger" && "status-tone-danger border",
                    item.tone === "success" && "status-tone-success border"
                  )}
                >
                  <Icon icon={activityIcon(item)} size={16} />
                </div>
                <div className="space-y-1">
                  <div className="leading-tight text-foreground text-sm font-semibold">
                    {item.title}
                  </div>
                  <div className="leading-snug text-muted-foreground text-xs">{item.detail}</div>
                  <div className="pt-0.5 font-medium text-[10px] text-muted-foreground/60 uppercase tracking-tight">
                    {relativeTimeLabel(item.timestamp, isEn)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {recentActivity.length > 0 ? (
          <div className="px-1 pt-2">
            <button className="font-bold text-[11px] text-primary transition-all hover:underline" type="button">
              {isEn ? "View all activity" : "Ver toda la actividad"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
