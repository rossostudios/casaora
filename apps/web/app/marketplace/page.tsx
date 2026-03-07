import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SavedSearches } from "@/components/marketplace/saved-searches";
import { fetchPublicListings, fetchUsdPygRate } from "@/lib/api";
import {
  countMarketplaceActiveFilters,
  parseMarketplaceSearchFilters,
  sortMarketplaceListings,
  toMarketplaceListParams,
} from "@/lib/features/marketplace/query";
import {
  type MarketplaceListingViewModel,
  toMarketplaceListingViewModel,
} from "@/lib/features/marketplace/view-model";
import { getActiveLocale } from "@/lib/i18n/server";
import { AiMatchingPanel } from "./components/ai-matching-panel";
import { CategoryPills } from "./components/category-pills";
import { DiscoverySections } from "./components/discovery-sections";
import { MarketInsightsBar } from "./components/market-insights-bar";
import { MarketplaceFiltersForm } from "./components/marketplace-filters-form";
import { MarketplaceResultsLayout } from "./components/marketplace-results-layout";
import { RecentlyViewedSection } from "./components/recently-viewed-section";
import { SmartHero } from "./components/smart-hero";

type MarketplacePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const title = "Casaora Marketplace";
  const description =
    "Alquileres de largo plazo con precios transparentes en Paraguay. Long-term rentals with transparent pricing in Paraguay.";

  return {
    title,
    description,
    alternates: {
      languages: {
        "es-PY": "/marketplace",
        "en-US": "/marketplace",
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Casaora",
      locale: "es_PY",
      alternateLocale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MarketplacePage({
  searchParams,
}: MarketplacePageProps) {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";
  const defaultOrgId = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID?.trim();

  const query = await searchParams;
  const filters = parseMarketplaceSearchFilters(query);

  let listings: MarketplaceListingViewModel[] = [];
  let apiError: string | null = null;

  const orgIdParam = defaultOrgId || undefined;
  try {
    const [response, usdPygRate] = await Promise.all([
      fetchPublicListings(toMarketplaceListParams(filters, orgIdParam)),
      fetchUsdPygRate(),
    ]);
    const rawData = response.data;
    let dataArr: Record<string, unknown>[] = [];
    if (rawData != null) dataArr = rawData as Record<string, unknown>[];
    const records = sortMarketplaceListings(dataArr, filters.sort);
    listings = records.map((record, index) =>
      toMarketplaceListingViewModel({
        listing: record,
        locale,
        index,
        usdPygRate,
      })
    );
  } catch (err) {
    let msg = String(err);
    if (err instanceof Error) msg = err.message;
    apiError = msg;
  }

  const availableNow =
    typeof query.available_now === "string" && query.available_now === "true";
  if (availableNow) {
    const today = new Date().toISOString().slice(0, 10);
    listings = listings.filter(
      (l) => l.availableFrom && l.availableFrom <= today
    );
  }

  const activeFilters = countMarketplaceActiveFilters(filters);
  const hasActiveFilters = activeFilters > 0 || availableNow;

  return (
    <div className="pa-marketplace-root min-h-dvh bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* 1. Smart Hero with NLP search */}
        <SmartHero
          defaultCity={filters.city || undefined}
          defaultMaxBudget={filters.maxMonthly?.toString()}
          isEn={isEn}
          listingCount={listings.length}
        />

        {/* 2. Filter chips */}
        <div className="mt-10 border-[var(--marketplace-text)]/6 border-b pb-1">
          <Suspense
            fallback={
              <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 6 }, (_, index) => `pill-${index}`).map(
                  (pillKey) => (
                    <div
                      className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-muted"
                      key={pillKey}
                    />
                  )
                )}
              </div>
            }
          >
            <CategoryPills locale={locale} />
          </Suspense>
        </div>

        {/* 3. Discovery sections (only when no active filters) */}
        {hasActiveFilters ? null : (
          <div className="mt-16">
            <DiscoverySections
              isEn={isEn}
              listings={listings}
              locale={locale}
            />
          </div>
        )}

        {/* 4. Saved searches */}
        <Suspense
          fallback={
            <div className="mt-8 h-10 w-48 animate-pulse rounded-lg bg-muted" />
          }
        >
          <div className="mt-8">
            <SavedSearches isEn={isEn} />
          </div>
        </Suspense>

        {/* 5. Results area — no heavy container */}
        <div className="mt-12">
          <MarketplaceFiltersForm
            activeFilters={activeFilters}
            filters={filters}
            isEn={isEn}
          />
          <div className="mt-4">
            <MarketplaceResultsLayout
              apiError={apiError}
              isEn={isEn}
              listings={listings}
              locale={locale}
              sortValue={filters.sort}
            />
          </div>
        </div>

        {/* 6. AI matching panel */}
        <div className="mt-20">
          <AiMatchingPanel isEn={isEn} />
        </div>

        {/* 7. Market insights */}
        <div className="mt-20">
          <MarketInsightsBar isEn={isEn} listings={listings} />
        </div>

        {/* 8. Recently viewed */}
        <div className="mt-16 pb-16">
          <RecentlyViewedSection
            isEn={isEn}
            listings={listings}
            locale={locale}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
