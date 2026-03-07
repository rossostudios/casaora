"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type TwinData = {
  health_score: number;
  occupancy_rate: number;
  avg_daily_rate: number;
  revenue_mtd: number;
  pending_maintenance: number;
  avg_review_score: number;
  guest_sentiment_score: number;
  risk_flags: Array<{
    type: string;
    severity: string;
    detail: string;
  }>;
  refreshed_at: string;
};

export type TwinSummary = {
  avgHealthScore: number;
  totalRiskFlags: number;
  avgSentiment: number;
};

const EMPTY_MAP = new Map<string, TwinData>();

export function useBatchPropertyTwins(
  orgId: string,
  propertyIds: string[]
): {
  twinMap: Map<string, TwinData>;
  twinSummary: TwinSummary | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery<Map<string, TwinData>>({
    queryKey: ["property-twins", orgId, propertyIds],
    queryFn: async () => {
      const results = await Promise.allSettled(
        propertyIds.map(async (pid) => {
          const res = await fetch(
            `/api/proxy/properties/${encodeURIComponent(pid)}/twin?org_id=${encodeURIComponent(orgId)}`,
            { cache: "no-store", headers: { Accept: "application/json" } }
          );
          if (!res.ok) return null;
          const twin = (await res.json()) as TwinData & { error?: string };
          if (twin.error) return null;
          return { id: pid, twin };
        })
      );

      const map = new Map<string, TwinData>();
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          map.set(result.value.id, result.value.twin);
        }
      }
      return map;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    enabled: !!orgId && propertyIds.length > 0,
    retry: false,
  });

  const twinMap = data ?? EMPTY_MAP;

  const twinSummary = useMemo<TwinSummary | null>(() => {
    if (twinMap.size === 0) return null;
    let totalHealth = 0;
    let totalFlags = 0;
    let totalSentiment = 0;
    for (const twin of twinMap.values()) {
      totalHealth += twin.health_score;
      totalFlags += twin.risk_flags?.length ?? 0;
      totalSentiment += twin.guest_sentiment_score;
    }
    return {
      avgHealthScore: Math.round(totalHealth / twinMap.size),
      totalRiskFlags: totalFlags,
      avgSentiment: Math.round(totalSentiment / twinMap.size),
    };
  }, [twinMap]);

  return { twinMap, twinSummary, isLoading };
}
