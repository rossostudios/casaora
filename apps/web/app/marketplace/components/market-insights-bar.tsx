import { TrendingUp } from "lucide-react";
import type { MarketplaceListingViewModel } from "@/lib/features/marketplace/view-model";
import { formatCompactCurrency } from "@/lib/format";

type MarketInsightsBarProps = {
  isEn: boolean;
  listings: MarketplaceListingViewModel[];
};

export function MarketInsightsBar({ isEn, listings }: MarketInsightsBarProps) {
  if (listings.length < 3) return null;

  const rents = listings.map((l) => l.monthlyRecurring).filter((r) => r > 0);
  const avgRent = rents.length
    ? Math.round(rents.reduce((a, b) => a + b, 0) / rents.length)
    : 0;

  const today = new Date().toISOString().slice(0, 10);
  const availableNow = listings.filter(
    (l) => l.availableFrom && l.availableFrom <= today
  ).length;

  const cityCounts: Record<string, number> = {};
  for (const l of listings) {
    const c = l.city || "Asunción";
    cityCounts[c] = (cityCounts[c] || 0) + 1;
  }
  const topCity =
    Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "Asunción";

  const stats = [
    {
      label: isEn ? "Avg. monthly rent" : "Alquiler promedio",
      value: avgRent > 0 ? formatCompactCurrency(avgRent) : "—",
    },
    {
      label: isEn ? "Available now" : "Disponibles ahora",
      value: `${availableNow}`,
    },
    {
      label: isEn ? "Most popular city" : "Ciudad más popular",
      value: topCity,
    },
    {
      label: isEn ? "Total listings" : "Total anuncios",
      value: `${listings.length}`,
    },
  ];

  return (
    <section>
      <div className="mb-6 flex items-center gap-2">
        <TrendingUp className="size-4 text-[var(--marketplace-text-muted)]" />
        <h2 className="font-medium text-[var(--marketplace-text-muted)] text-sm uppercase tracking-wider">
          {isEn ? "Market snapshot" : "Panorama del mercado"}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="font-semibold font-serif text-2xl text-[var(--marketplace-text)] tabular-nums tracking-tight">
              {stat.value}
            </p>
            <p className="mt-1 text-[var(--marketplace-text-muted)] text-xs">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
