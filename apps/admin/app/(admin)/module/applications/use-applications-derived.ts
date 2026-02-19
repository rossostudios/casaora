"use client";

import { useMemo } from "react";

import type { ChartConfig } from "@/components/ui/chart";
import { BOARD_LANES } from "@/lib/features/applications/constants";
import type { ApplicationRow } from "@/lib/features/applications/types";
import {
  asString,
  median,
  normalizeSlaStatus,
} from "@/lib/features/applications/utils";

export function useApplicationsDerived({
  filteredRows,
  isEn,
  locale,
}: {
  filteredRows: ApplicationRow[];
  isEn: boolean;
  locale: "es-PY" | "en-US";
}) {
  const metrics = useMemo(() => {
    const total = filteredRows.length;
    const unassigned = filteredRows.filter(
      (row) => !row.assigned_user_id
    ).length;
    const slaBreached = filteredRows.filter(
      (row) => normalizeSlaStatus(row) === "breached"
    ).length;
    const slaAtRisk = filteredRows.filter((row) => {
      const level = row.response_sla_alert_level.trim().toLowerCase();
      return level === "warning" || level === "critical";
    }).length;
    const responseSamples = filteredRows
      .map((row) => row.first_response_minutes)
      .filter((value) => value > 0);
    const medianFirstResponse = median(responseSamples);
    return { total, unassigned, slaBreached, slaAtRisk, medianFirstResponse };
  }, [filteredRows]);

  const funnelChartData = useMemo(() => {
    return BOARD_LANES.map((lane) => ({
      key: lane.key,
      label: lane.label[locale],
      count: filteredRows.filter((row) =>
        lane.statuses.includes(row.status.trim().toLowerCase())
      ).length,
    }));
  }, [filteredRows, locale]);

  const funnelChartConfig: ChartConfig = useMemo(
    () => ({
      incoming: {
        label: isEn ? "Incoming" : "Ingresos",
        color: "var(--chart-1)",
      },
      qualified: {
        label: isEn ? "Qualified" : "Calificación",
        color: "var(--chart-2)",
      },
      converted: {
        label: isEn ? "Converted" : "Convertidos",
        color: "var(--chart-3)",
      },
      closed: {
        label: isEn ? "Closed" : "Cerrados",
        color: "var(--chart-4)",
      },
    }),
    [isEn]
  );

  const responseTrendData = useMemo(() => {
    const days: string[] = [];
    const todayDate = new Date();
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - index);
      days.push(date.toISOString().slice(0, 10));
    }

    const valuesByDay = new Map<string, number[]>(
      days.map((day) => [day, []] as const)
    );
    for (const row of filteredRows) {
      if (row.first_response_minutes <= 0) continue;
      const day = row.created_at.slice(0, 10);
      if (!valuesByDay.has(day)) continue;
      valuesByDay.get(day)?.push(row.first_response_minutes);
    }

    return days.map((day) => {
      const parsed = new Date(`${day}T00:00:00`);
      const samples = valuesByDay.get(day) ?? [];
      return {
        day: Number.isNaN(parsed.valueOf())
          ? day
          : new Intl.DateTimeFormat(locale, {
              month: "short",
              day: "numeric",
            }).format(parsed),
        median_minutes: samples.length ? median(samples) : 0,
      };
    });
  }, [filteredRows, locale]);

  const responseTrendConfig: ChartConfig = useMemo(
    () => ({
      median_minutes: {
        label: isEn
          ? "Median first response (min)"
          : "Mediana primera respuesta (min)",
        color: "var(--chart-5)",
      },
    }),
    [isEn]
  );

  const boardRowsByLane = useMemo(() => {
    return BOARD_LANES.map((lane) => {
      const laneRows = filteredRows
        .filter((row) =>
          lane.statuses.includes(row.status.trim().toLowerCase())
        )
        .sort((left, right) =>
          asString(right.created_at).localeCompare(asString(left.created_at))
        );
      return { lane, rows: laneRows };
    });
  }, [filteredRows]);

  const slaAlertRows = useMemo(() => {
    return filteredRows
      .filter((row) => {
        const level = row.response_sla_alert_level.trim().toLowerCase();
        return level === "warning" || level === "critical";
      })
      .sort((left, right) => {
        const leftLevel = left.response_sla_alert_level.trim().toLowerCase();
        const rightLevel = right.response_sla_alert_level.trim().toLowerCase();
        if (leftLevel === rightLevel)
          return right.created_at.localeCompare(left.created_at);
        if (leftLevel === "critical") return -1;
        if (rightLevel === "critical") return 1;
        return 0;
      });
  }, [filteredRows]);

  return {
    metrics,
    funnelChartData,
    funnelChartConfig,
    responseTrendData,
    responseTrendConfig,
    boardRowsByLane,
    slaAlertRows,
  };
}
