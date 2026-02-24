"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BankTransaction = {
  id: string;
  bank_name: string | null;
  transaction_date: string;
  description: string;
  amount: number;
  currency: string;
  direction: string;
  reference: string | null;
  counterparty_name: string | null;
  match_status: string;
  match_confidence: number;
  match_method: string | null;
  matched_collection_id: string | null;
};

type ReconciliationRun = {
  id: string;
  run_type: string;
  started_at: string;
  completed_at: string | null;
  total_transactions: number;
  matched_count: number;
  exception_count: number;
  match_rate: number;
  total_matched_amount: number;
};

type Props = {
  transactions: Record<string, unknown>[];
  runs: Record<string, unknown>[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

function matchStatusColor(s: string): string {
  switch (s) {
    case "matched":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    case "partial":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "exception":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "ignored":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function confidenceBadge(c: number): { label: string; color: string } {
  if (c >= 0.9) return { label: "High", color: "text-emerald-600" };
  if (c >= 0.7) return { label: "Medium", color: "text-amber-600" };
  if (c > 0) return { label: "Low", color: "text-red-600" };
  return { label: "—", color: "text-muted-foreground" };
}

function formatDate(d: string): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === "PYG") return `₲${amount.toLocaleString()}`;
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

type StatusFilter = "all" | "unmatched" | "matched" | "exception";

export function ReconciliationDashboard({
  transactions: raw,
  runs: rawRuns,
}: Props) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const txns: BankTransaction[] = useMemo(() => {
    return raw
      .map((t) => ({
        id: str(t.id),
        bank_name: str(t.bank_name) || null,
        transaction_date: str(t.transaction_date),
        description: str(t.description),
        amount: num(t.amount),
        currency: str(t.currency) || "PYG",
        direction: str(t.direction) || "credit",
        reference: str(t.reference) || null,
        counterparty_name: str(t.counterparty_name) || null,
        match_status: str(t.match_status) || "unmatched",
        match_confidence: num(t.match_confidence),
        match_method: str(t.match_method) || null,
        matched_collection_id: str(t.matched_collection_id) || null,
      }))
      .sort(
        (a, b) =>
          new Date(b.transaction_date).getTime() -
          new Date(a.transaction_date).getTime()
      );
  }, [raw]);

  const runs: ReconciliationRun[] = useMemo(() => {
    return rawRuns
      .map((r) => ({
        id: str(r.id),
        run_type: str(r.run_type),
        started_at: str(r.started_at),
        completed_at: str(r.completed_at) || null,
        total_transactions: num(r.total_transactions),
        matched_count: num(r.matched_count),
        exception_count: num(r.exception_count),
        match_rate: num(r.match_rate),
        total_matched_amount: num(r.total_matched_amount),
      }))
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
  }, [rawRuns]);

  const filtered = useMemo(() => {
    if (filter === "all") return txns;
    return txns.filter((t) => t.match_status === filter);
  }, [txns, filter]);

  // Stats
  const stats = useMemo(() => {
    const total = txns.length;
    const matched = txns.filter((t) => t.match_status === "matched").length;
    const unmatched = txns.filter((t) => t.match_status === "unmatched").length;
    const exceptions = txns.filter(
      (t) => t.match_status === "exception"
    ).length;
    const matchRate = total > 0 ? ((matched / total) * 100).toFixed(0) : "0";
    const totalAmount = txns.reduce((s, t) => s + t.amount, 0);
    return { total, matched, unmatched, exceptions, matchRate, totalAmount };
  }, [txns]);

  const latestRun = runs[0];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Transactions</p>
          <p className="font-semibold text-2xl">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Match Rate</p>
          <p className="font-semibold text-2xl text-emerald-600">
            {stats.matchRate}%
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Unmatched</p>
          <p
            className={`font-semibold text-2xl ${stats.unmatched > 0 ? "text-amber-600" : "text-muted-foreground"}`}
          >
            {stats.unmatched}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Exceptions</p>
          <p
            className={`font-semibold text-2xl ${stats.exceptions > 0 ? "text-red-600" : "text-muted-foreground"}`}
          >
            {stats.exceptions}
          </p>
        </div>
      </div>

      {/* Last run info */}
      {latestRun ? (
        <div className="rounded-lg border bg-muted/20 p-3 text-muted-foreground text-xs">
          Last reconciliation: {formatDate(latestRun.started_at)} —{" "}
          {latestRun.matched_count}/{latestRun.total_transactions} matched (
          {(latestRun.match_rate * 100).toFixed(0)}%)
          {latestRun.run_type === "auto"
            ? " (auto)"
            : latestRun.run_type === "daily"
              ? " (daily)"
              : " (manual)"}
        </div>
      ) : null}

      {/* Filter */}
      <div className="flex w-fit items-center gap-1 rounded-md border bg-muted/20 p-1">
        {(["all", "unmatched", "matched", "exception"] as const).map((f) => (
          <Button
            key={f}
            onClick={() => setFilter(f)}
            size="sm"
            variant={filter === f ? "secondary" : "ghost"}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No bank transactions match this filter. Import transactions via the AI
          agent.
        </p>
      ) : (
        <div className="space-y-1">
          {/* Header */}
          <div className="hidden gap-2 border-b px-3 py-1.5 font-medium text-[11px] text-muted-foreground sm:grid sm:grid-cols-6">
            <span>Date</span>
            <span className="col-span-2">Description</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Confidence</span>
          </div>

          {filtered.map((txn) => {
            const conf = confidenceBadge(txn.match_confidence);
            return (
              <div
                className="grid grid-cols-2 gap-2 rounded-lg border bg-card p-3 text-sm sm:grid-cols-6 sm:items-center"
                key={txn.id}
              >
                <span className="font-mono text-muted-foreground text-xs">
                  {formatDate(txn.transaction_date)}
                </span>
                <div className="col-span-2 min-w-0">
                  <p className="truncate text-xs">{txn.description || "—"}</p>
                  {txn.counterparty_name ? (
                    <p className="truncate text-[10px] text-muted-foreground">
                      {txn.counterparty_name}
                    </p>
                  ) : null}
                </div>
                <span className="font-medium font-mono text-xs">
                  {txn.direction === "debit" ? "-" : "+"}
                  {formatCurrency(txn.amount, txn.currency)}
                </span>
                <span
                  className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 font-medium text-[10px] ${matchStatusColor(txn.match_status)}`}
                >
                  {txn.match_status}
                </span>
                <div className="flex items-center gap-1">
                  <span className={`font-medium text-[10px] ${conf.color}`}>
                    {conf.label}
                  </span>
                  {txn.match_method ? (
                    <Badge className="text-[9px]" variant="outline">
                      {txn.match_method}
                    </Badge>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
