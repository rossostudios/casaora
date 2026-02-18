#!/usr/bin/env node

import { performance } from "node:perf_hooks";
import process from "node:process";

function intFromEnv(name, fallback, min = 1) {
  const raw = process.env[name];
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[index];
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function safeLabel(value, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

async function benchmarkEndpoint({
  baseUrl,
  path,
  requests,
  concurrency,
  timeoutMs,
  delayMs,
  token,
}) {
  const statusCounts = new Map();
  const errorCounts = new Map();
  const successLatencies = [];

  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, requests) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= requests) break;

      const hasQuery = path.includes("?");
      const cacheBuster = `__perf=${index}`;
      const url = `${baseUrl}${path}${hasQuery ? "&" : "?"}${cacheBuster}`;

      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
      const started = performance.now();
      try {
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        // Drain body so timing includes full response payload transfer.
        await response.arrayBuffer();

        const elapsedMs = performance.now() - started;
        const statusKey = String(response.status);
        statusCounts.set(statusKey, (statusCounts.get(statusKey) ?? 0) + 1);
        if (response.ok) {
          successLatencies.push(elapsedMs);
        } else {
          const key = `http_${statusKey}`;
          errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
        }
      } catch (error) {
        const key =
          error instanceof Error && error.name === "AbortError"
            ? "timeout"
            : "network_error";
        errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
      } finally {
        clearTimeout(timeoutHandle);
      }

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  });

  await Promise.all(workers);
  successLatencies.sort((a, b) => a - b);

  const successCount = successLatencies.length;
  const failureCount = requests - successCount;
  const avgMs =
    successCount > 0
      ? successLatencies.reduce((acc, value) => acc + value, 0) / successCount
      : 0;

  return {
    path,
    requests,
    successCount,
    failureCount,
    successRatePct: requests > 0 ? round2((successCount / requests) * 100) : 0,
    p50Ms: round2(percentile(successLatencies, 50)),
    p95Ms: round2(percentile(successLatencies, 95)),
    p99Ms: round2(percentile(successLatencies, 99)),
    avgMs: round2(avgMs),
    minMs: round2(successLatencies[0] ?? 0),
    maxMs: round2(successLatencies[successLatencies.length - 1] ?? 0),
    statuses: Object.fromEntries([...statusCounts.entries()].sort()),
    errors: Object.fromEntries([...errorCounts.entries()].sort()),
  };
}

async function main() {
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const baseUrl = (
    process.env.PERF_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:8000/v1"
  ).replace(/\/+$/, "");

  const orgId =
    process.env.PERF_ORG_ID ?? process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "";
  const token = process.env.PERF_BEARER_TOKEN ?? "";

  const from = process.env.PERF_FROM ?? toIsoDate(defaultFrom);
  const to = process.env.PERF_TO ?? toIsoDate(now);
  const requests = intFromEnv("PERF_REQUESTS", 60, 1);
  const concurrency = intFromEnv("PERF_CONCURRENCY", 8, 1);
  const timeoutMs = intFromEnv("PERF_TIMEOUT_MS", 15000, 100);
  const delayMs = intFromEnv("PERF_DELAY_MS", 120, 0);
  const endpointPauseMs = intFromEnv("PERF_ENDPOINT_PAUSE_MS", 750, 0);

  const endpoints = [{ name: "public_listings", path: "/public/listings?limit=60" }];
  if (orgId) {
    const org = encodeURIComponent(orgId);
    const fromEncoded = encodeURIComponent(from);
    const toEncoded = encodeURIComponent(to);
    endpoints.push(
      {
        name: "owner_summary",
        path: `/reports/owner-summary?org_id=${org}&from=${fromEncoded}&to=${toEncoded}`,
      },
      {
        name: "operations_summary",
        path: `/reports/operations-summary?org_id=${org}&from=${fromEncoded}&to=${toEncoded}`,
      },
      {
        name: "kpi_dashboard",
        path: `/reports/kpi-dashboard?org_id=${org}&from=${fromEncoded}&to=${toEncoded}`,
      }
    );
  }

  console.log(
    `Benchmark config: base=${baseUrl} requests=${requests} concurrency=${concurrency} timeout_ms=${timeoutMs} delay_ms=${delayMs} endpoint_pause_ms=${endpointPauseMs} org_id=${safeLabel(orgId)}`
  );
  if (!token) {
    console.log(
      "Auth token: not provided (private endpoints require dev auth overrides or PERF_BEARER_TOKEN)"
    );
  }

  const results = [];
  for (const endpoint of endpoints) {
    const result = await benchmarkEndpoint({
      baseUrl,
      path: endpoint.path,
      requests,
      concurrency,
      timeoutMs,
      delayMs,
      token,
    });
    results.push({ endpoint: endpoint.name, ...result });

    if (endpointPauseMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, endpointPauseMs));
    }
  }

  const rows = results.map((result) => ({
    endpoint: result.endpoint,
    success: `${result.successCount}/${result.requests}`,
    success_rate_pct: result.successRatePct,
    p50_ms: result.p50Ms,
    p95_ms: result.p95Ms,
    p99_ms: result.p99Ms,
    avg_ms: result.avgMs,
    min_ms: result.minMs,
    max_ms: result.maxMs,
    statuses: JSON.stringify(result.statuses),
    errors: JSON.stringify(result.errors),
  }));
  console.table(rows);
}

main().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});
