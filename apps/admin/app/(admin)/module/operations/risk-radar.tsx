"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Prediction = {
  id: string;
  prediction_type: string;
  entity_type: string | null;
  predicted_value: number | null;
  predicted_label: string | null;
  confidence: number;
  features: Record<string, unknown>;
  model_version: string | null;
  created_at: string;
};

type Forecast = {
  id: string;
  forecast_date: string;
  predicted_occupancy: number;
  predicted_adr: number;
  predicted_demand: string;
  confidence: number;
  unit_id: string | null;
};

type Props = {
  predictions: Record<string, unknown>[];
  forecasts: Record<string, unknown>[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

function typeLabel(t: string): string {
  switch (t) {
    case "tenant_risk":
      return "Tenant Risk";
    case "demand":
      return "Demand";
    case "maintenance":
      return "Maintenance";
    case "churn":
      return "Churn";
    case "pricing":
      return "Pricing";
    case "anomaly":
      return "Anomaly";
    default:
      return t;
  }
}

function riskColor(label: string): string {
  switch (label) {
    case "high":
    case "critical":
    case "elevated":
    case "high_anomaly":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "medium":
    case "low_anomaly":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "low":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function demandColor(d: string): string {
  switch (d) {
    case "peak":
      return "text-red-600 font-semibold";
    case "high":
      return "text-amber-600 font-medium";
    case "normal":
      return "text-muted-foreground";
    case "low":
      return "text-blue-600";
    default:
      return "text-muted-foreground";
  }
}

function relTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RiskRadar({
  predictions: rawPredictions,
  forecasts: rawForecasts,
}: Props) {
  const [tab, setTab] = useState<"overview" | "predictions" | "forecasts">(
    "overview"
  );

  const predictions: Prediction[] = useMemo(() => {
    return rawPredictions
      .map((p) => ({
        id: str(p.id),
        prediction_type: str(p.prediction_type) || "unknown",
        entity_type: str(p.entity_type) || null,
        predicted_value:
          p.predicted_value != null ? num(p.predicted_value) : null,
        predicted_label: str(p.predicted_label) || null,
        confidence: num(p.confidence),
        features: (typeof p.features === "object" && p.features !== null
          ? p.features
          : {}) as Record<string, unknown>,
        model_version: str(p.model_version) || null,
        created_at: str(p.created_at),
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [rawPredictions]);

  const forecasts: Forecast[] = useMemo(() => {
    return rawForecasts
      .map((f) => ({
        id: str(f.id),
        forecast_date: str(f.forecast_date),
        predicted_occupancy: num(f.predicted_occupancy),
        predicted_adr: num(f.predicted_adr),
        predicted_demand: str(f.predicted_demand) || "normal",
        confidence: num(f.confidence),
        unit_id: str(f.unit_id) || null,
      }))
      .sort((a, b) => a.forecast_date.localeCompare(b.forecast_date));
  }, [rawForecasts]);

  // Aggregate stats by prediction type
  const typeStats = useMemo(() => {
    const map = new Map<
      string,
      { total: number; highRisk: number; avgConfidence: number }
    >();
    for (const p of predictions) {
      const entry = map.get(p.prediction_type) ?? {
        total: 0,
        highRisk: 0,
        avgConfidence: 0,
      };
      entry.total += 1;
      if (
        ["high", "critical", "elevated", "high_anomaly"].includes(
          p.predicted_label ?? ""
        )
      ) {
        entry.highRisk += 1;
      }
      entry.avgConfidence += p.confidence;
      map.set(p.prediction_type, entry);
    }
    for (const [, v] of map) {
      v.avgConfidence = v.total > 0 ? v.avgConfidence / v.total : 0;
    }
    return Array.from(map.entries()).map(([type, stats]) => ({
      type,
      ...stats,
    }));
  }, [predictions]);

  // Demand outlook summary
  const demandSummary = useMemo(() => {
    const upcoming = forecasts.filter((f) => {
      const fDate = new Date(f.forecast_date);
      const now = new Date();
      return fDate >= now && fDate <= new Date(now.getTime() + 30 * 86_400_000);
    });
    const peakDays = upcoming.filter(
      (f) => f.predicted_demand === "peak"
    ).length;
    const highDays = upcoming.filter(
      (f) => f.predicted_demand === "high"
    ).length;
    const avgOccupancy =
      upcoming.length > 0
        ? upcoming.reduce((s, f) => s + f.predicted_occupancy, 0) /
          upcoming.length
        : 0;
    return { total: upcoming.length, peakDays, highDays, avgOccupancy };
  }, [forecasts]);

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Predictions</p>
          <p className="font-semibold text-2xl">{predictions.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Categories</p>
          <p className="font-semibold text-2xl">{typeStats.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">High Risk</p>
          <p
            className={`font-semibold text-2xl ${typeStats.reduce((s, t) => s + t.highRisk, 0) > 0 ? "text-red-600" : "text-muted-foreground"}`}
          >
            {typeStats.reduce((s, t) => s + t.highRisk, 0)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Peak Days (30d)</p>
          <p
            className={`font-semibold text-2xl ${demandSummary.peakDays > 0 ? "text-amber-600" : "text-muted-foreground"}`}
          >
            {demandSummary.peakDays}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Avg Occupancy</p>
          <p className="font-semibold text-2xl">
            {(demandSummary.avgOccupancy * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["overview", "predictions", "forecasts"] as const).map((t) => (
          <Button
            key={t}
            onClick={() => setTab(t)}
            size="sm"
            variant={tab === t ? "default" : "outline"}
          >
            {t === "overview"
              ? "Risk Overview"
              : t === "predictions"
                ? `Predictions (${predictions.length})`
                : `Forecasts (${forecasts.length})`}
          </Button>
        ))}
      </div>

      {/* Risk Overview */}
      {tab === "overview" &&
        (typeStats.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            No ML predictions recorded yet. Run screening or forecasting to
            populate risk data.
          </p>
        ) : (
          <div className="space-y-2">
            {typeStats.map((ts) => (
              <div
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
                key={ts.type}
              >
                <Badge variant="outline">{typeLabel(ts.type)}</Badge>
                <span className="font-medium text-sm">
                  {ts.total} predictions
                </span>
                {ts.highRisk > 0 && (
                  <span className="inline-flex items-center rounded-md border border-red-200 bg-red-500/10 px-2 py-0.5 font-medium text-red-600 text-xs">
                    {ts.highRisk} high risk
                  </span>
                )}
                <span className="ml-auto text-muted-foreground text-xs">
                  Avg confidence: {(ts.avgConfidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        ))}

      {/* Predictions */}
      {tab === "predictions" &&
        (predictions.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            No predictions recorded.
          </p>
        ) : (
          <div className="space-y-1">
            {predictions.slice(0, 50).map((p) => (
              <div
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-xs"
                key={p.id}
              >
                <Badge className="text-[9px]" variant="outline">
                  {typeLabel(p.prediction_type)}
                </Badge>
                {p.predicted_label && (
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px] ${riskColor(p.predicted_label)}`}
                  >
                    {p.predicted_label}
                  </span>
                )}
                {p.predicted_value !== null && (
                  <span className="font-mono">
                    {p.predicted_value.toFixed(1)}
                  </span>
                )}
                <span className="text-muted-foreground">
                  conf: {(p.confidence * 100).toFixed(0)}%
                </span>
                {p.model_version && (
                  <span className="text-muted-foreground">
                    {p.model_version}
                  </span>
                )}
                <span className="ml-auto text-muted-foreground">
                  {relTime(p.created_at)}
                </span>
              </div>
            ))}
          </div>
        ))}

      {/* Forecasts */}
      {tab === "forecasts" &&
        (forecasts.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            No demand forecasts generated yet.
          </p>
        ) : (
          <div className="space-y-1">
            {forecasts.slice(0, 60).map((f) => (
              <div
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-xs"
                key={f.id}
              >
                <span className="w-24 shrink-0 font-medium font-mono">
                  {f.forecast_date}
                </span>
                <span className={demandColor(f.predicted_demand)}>
                  {f.predicted_demand}
                </span>
                <span className="text-muted-foreground">
                  Occ: {(f.predicted_occupancy * 100).toFixed(0)}%
                </span>
                {f.predicted_adr > 0 && (
                  <span className="font-mono text-muted-foreground">
                    ADR: {f.predicted_adr.toFixed(0)}
                  </span>
                )}
                <span className="ml-auto text-muted-foreground">
                  conf: {(f.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
