"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  snapshots: Record<string, unknown>[];
};

type ScenarioType = "investment" | "renovation" | "stress";

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function ScenarioSimulator({ snapshots }: Props) {
  const [activeType, setActiveType] = useState<ScenarioType>("investment");

  // Derive baseline from latest snapshot
  const baseline = useMemo(() => {
    const last = snapshots.at(-1);
    if (!last) return { revenue: 0, expenses: 0, rent: 0 };
    return {
      revenue: num(last.revenue),
      expenses: num(last.expenses),
      rent: num(last.revpar) * num(last.total_units) * 30,
    };
  }, [snapshots]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(
          [
            ["investment", "Cash Flow"],
            ["renovation", "Renovation ROI"],
            ["stress", "Stress Test"],
          ] as [ScenarioType, string][]
        ).map(([type, label]) => (
          <Button
            key={type}
            onClick={() => setActiveType(type)}
            size="sm"
            variant={activeType === type ? "default" : "outline"}
          >
            {label}
          </Button>
        ))}
      </div>

      {activeType === "investment" && <InvestmentPanel baseline={baseline} />}
      {activeType === "renovation" && <RenovationPanel baseline={baseline} />}
      {activeType === "stress" && <StressPanel baseline={baseline} />}
    </div>
  );
}

function InvestmentPanel({
  baseline,
}: {
  baseline: { revenue: number; expenses: number };
}) {
  const [months, setMonths] = useState(12);
  const [growthRev, setGrowthRev] = useState(2);
  const [growthExp, setGrowthExp] = useState(1);
  const [investment, setInvestment] = useState(0);

  const result = useMemo(() => {
    let cumNoi = 0;
    let breakEven: number | null = null;
    const projections: {
      month: number;
      revenue: number;
      expenses: number;
      noi: number;
      cumNoi: number;
    }[] = [];

    for (let m = 1; m <= months; m++) {
      const rev = baseline.revenue * (1 + growthRev / 100) ** (m - 1);
      const exp = baseline.expenses * (1 + growthExp / 100) ** (m - 1);
      const noi = rev - exp;
      cumNoi += noi;
      if (!breakEven && investment > 0 && cumNoi >= investment) breakEven = m;
      projections.push({ month: m, revenue: rev, expenses: exp, noi, cumNoi });
    }

    const roi = investment > 0 ? ((cumNoi - investment) / investment) * 100 : 0;
    return { projections, breakEven, roi, totalNoi: cumNoi };
  }, [baseline, months, growthRev, growthExp, investment]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Months</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            max={120}
            min={1}
            onChange={(e) => setMonths(Number(e.target.value))}
            type="number"
            value={months}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Rev Growth %/mo</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            onChange={(e) => setGrowthRev(Number(e.target.value))}
            step={0.5}
            type="number"
            value={growthRev}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Exp Growth %/mo</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            onChange={(e) => setGrowthExp(Number(e.target.value))}
            step={0.5}
            type="number"
            value={growthExp}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Investment</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            onChange={(e) => setInvestment(Number(e.target.value))}
            type="number"
            value={investment}
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Total NOI</p>
          <p className="font-semibold text-xl">{fmt(result.totalNoi)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">ROI</p>
          <p
            className={`font-semibold text-xl ${result.roi >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {result.roi.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Break-Even</p>
          <p className="font-semibold text-xl">
            {result.breakEven ? `Month ${result.breakEven}` : "—"}
          </p>
        </div>
      </div>

      {result.projections.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-2 py-1.5 text-left">Mo</th>
                <th className="px-2 py-1.5 text-right">Revenue</th>
                <th className="px-2 py-1.5 text-right">Expenses</th>
                <th className="px-2 py-1.5 text-right">NOI</th>
                <th className="px-2 py-1.5 text-right">Cum. NOI</th>
              </tr>
            </thead>
            <tbody>
              {result.projections
                .filter((_, i) => i < 12 || i % 3 === 0)
                .map((p) => (
                  <tr className="border-b last:border-0" key={p.month}>
                    <td className="px-2 py-1">{p.month}</td>
                    <td className="px-2 py-1 text-right">{fmt(p.revenue)}</td>
                    <td className="px-2 py-1 text-right">{fmt(p.expenses)}</td>
                    <td
                      className={`px-2 py-1 text-right ${p.noi < 0 ? "text-red-600" : ""}`}
                    >
                      {fmt(p.noi)}
                    </td>
                    <td
                      className={`px-2 py-1 text-right font-medium ${p.cumNoi < 0 ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {fmt(p.cumNoi)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RenovationPanel({ baseline }: { baseline: { rent: number } }) {
  const [cost, setCost] = useState(5_000_000);
  const [currentRent, setCurrentRent] = useState(baseline.rent || 3_000_000);
  const [projectedRent, setProjectedRent] = useState(
    baseline.rent ? baseline.rent * 1.3 : 3_900_000
  );
  const [vacancyMonths, setVacancyMonths] = useState(1);

  const result = useMemo(() => {
    const monthlyIncrease = projectedRent - currentRent;
    const lostRevenue = currentRent * vacancyMonths;
    const totalCost = cost + lostRevenue;
    const paybackMonths =
      monthlyIncrease > 0 ? Math.ceil(totalCost / monthlyIncrease) : 0;
    const roi5yr =
      totalCost > 0
        ? ((monthlyIncrease * 60 - totalCost) / totalCost) * 100
        : 0;
    return { monthlyIncrease, lostRevenue, totalCost, paybackMonths, roi5yr };
  }, [cost, currentRent, projectedRent, vacancyMonths]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Renovation Cost</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            onChange={(e) => setCost(Number(e.target.value))}
            type="number"
            value={cost}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Current Rent/mo</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            onChange={(e) => setCurrentRent(Number(e.target.value))}
            type="number"
            value={currentRent}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Projected Rent/mo</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            onChange={(e) => setProjectedRent(Number(e.target.value))}
            type="number"
            value={projectedRent}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Vacancy (months)</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            max={12}
            min={0}
            onChange={(e) => setVacancyMonths(Number(e.target.value))}
            type="number"
            value={vacancyMonths}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Rent Increase/mo</p>
          <p className="font-semibold text-emerald-600 text-xl">
            {fmt(result.monthlyIncrease)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Total Cost</p>
          <p className="font-semibold text-xl">{fmt(result.totalCost)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Payback</p>
          <p className="font-semibold text-xl">
            {result.paybackMonths > 0 ? `${result.paybackMonths} mo` : "—"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">5yr ROI</p>
          <p
            className={`font-semibold text-xl ${result.roi5yr >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {result.roi5yr.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}

function StressPanel({
  baseline,
}: {
  baseline: { revenue: number; expenses: number };
}) {
  const [occDrop, setOccDrop] = useState(20);
  const [rateDrop, setRateDrop] = useState(10);
  const [expIncrease, setExpIncrease] = useState(5);
  const [months, setMonths] = useState(6);

  const result = useMemo(() => {
    const stressRev =
      baseline.revenue * (1 - occDrop / 100) * (1 - rateDrop / 100);
    const stressExp = baseline.expenses * (1 + expIncrease / 100);
    const stressNoi = stressRev - stressExp;
    const normalNoi = baseline.revenue - baseline.expenses;
    const monthlyLoss = normalNoi - stressNoi;
    const totalLoss = monthlyLoss * months;
    return {
      stressRev,
      stressExp,
      stressNoi,
      normalNoi,
      monthlyLoss,
      totalLoss,
      positive: stressNoi > 0,
    };
  }, [baseline, occDrop, rateDrop, expIncrease, months]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Occupancy Drop %</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            max={100}
            min={0}
            onChange={(e) => setOccDrop(Number(e.target.value))}
            type="number"
            value={occDrop}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Rate Drop %</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            max={100}
            min={0}
            onChange={(e) => setRateDrop(Number(e.target.value))}
            type="number"
            value={rateDrop}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Expense Increase %</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            max={100}
            min={0}
            onChange={(e) => setExpIncrease(Number(e.target.value))}
            type="number"
            value={expIncrease}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Duration (months)</span>
          <input
            className="w-full rounded border bg-card px-2 py-1 text-sm"
            max={24}
            min={1}
            onChange={(e) => setMonths(Number(e.target.value))}
            type="number"
            value={months}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Stressed NOI/mo</p>
          <p
            className={`font-semibold text-xl ${result.stressNoi < 0 ? "text-red-600" : ""}`}
          >
            {fmt(result.stressNoi)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">vs Normal NOI</p>
          <p className="font-semibold text-xl">{fmt(result.normalNoi)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">Total Loss</p>
          <p className="font-semibold text-red-600 text-xl">
            {fmt(result.totalLoss)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground text-xs">NOI Status</p>
          <Badge
            className="mt-1"
            variant={result.positive ? "outline" : "destructive"}
          >
            {result.positive ? "Positive" : "Negative"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
