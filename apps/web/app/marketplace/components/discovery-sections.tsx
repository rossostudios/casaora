import { MarketplaceListingCard } from "@/components/marketplace/listing-card";
import {
  type MarketplaceListingViewModel,
  marketplaceListingKey,
} from "@/lib/features/marketplace/view-model";
import type { Locale } from "@/lib/i18n";

type DiscoverySectionsProps = {
  isEn: boolean;
  locale: Locale;
  listings: MarketplaceListingViewModel[];
};

type Section = {
  key: string;
  title: string;
  listings: MarketplaceListingViewModel[];
};

function buildSections(
  listings: MarketplaceListingViewModel[],
  isEn: boolean
): Section[] {
  const sections: Section[] = [];

  // Trending: first N listings (simulating popularity by featured order)
  const trending = listings.slice(0, 4);
  if (trending.length >= 2) {
    sections.push({
      key: "trending",
      title: isEn ? "Trending homes" : "Tendencia",
      listings: trending,
    });
  }

  // Best value: lowest monthly rent
  const bestValue = [...listings]
    .filter((l) => l.monthlyRecurring > 0)
    .sort((a, b) => a.monthlyRecurring - b.monthlyRecurring)
    .slice(0, 4);
  if (bestValue.length >= 2) {
    sections.push({
      key: "best-value",
      title: isEn ? "Best value rentals" : "Mejor relación precio-calidad",
      listings: bestValue,
    });
  }

  // Pet friendly
  const petFriendly = listings
    .filter((l) => l.petPolicy === "allowed")
    .slice(0, 4);
  if (petFriendly.length >= 2) {
    sections.push({
      key: "pet-friendly",
      title: isEn ? "Pet friendly homes" : "Hogares que aceptan mascotas",
      listings: petFriendly,
    });
  }

  // Move-in ready
  const today = new Date().toISOString().slice(0, 10);
  const moveInReady = listings
    .filter((l) => l.availableFrom && l.availableFrom <= today)
    .slice(0, 4);
  if (moveInReady.length >= 2) {
    sections.push({
      key: "move-in-ready",
      title: isEn ? "Move-in ready" : "Listo para mudarse",
      listings: moveInReady,
    });
  }

  return sections;
}

export function DiscoverySections({
  isEn,
  locale,
  listings,
}: DiscoverySectionsProps) {
  const sections = buildSections(listings, isEn);
  if (!sections.length) return null;

  return (
    <div className="space-y-14">
      {sections.map((section) => (
        <section key={section.key}>
          <h2 className="font-medium font-serif text-2xl text-[var(--marketplace-text)] tracking-tight">
            {section.title}
          </h2>
          <div className="scrollbar-none mt-5 flex gap-5 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
            {section.listings.map((listing) => (
              <div
                className="w-[280px] shrink-0 sm:w-auto"
                key={marketplaceListingKey(listing.raw)}
              >
                <MarketplaceListingCard listing={listing.raw} locale={locale} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
