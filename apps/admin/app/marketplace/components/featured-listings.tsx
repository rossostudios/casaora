import { MarketplaceListingCard } from "@/components/marketplace/listing-card";
import type { MarketplaceListingViewModel } from "@/lib/features/marketplace/view-model";
import type { Locale } from "@/lib/i18n";

type FeaturedListingsProps = {
  isEn: boolean;
  locale: Locale;
  listings: MarketplaceListingViewModel[];
};

export function FeaturedListings({
  isEn,
  locale,
  listings,
}: FeaturedListingsProps) {
  const featured = listings.slice(0, 6);

  if (!featured.length) return null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-serif text-2xl font-medium tracking-tight text-[var(--marketplace-text)]">
          {isEn ? "Curated for you" : "Seleccionados para ti"}
        </h2>
        <p className="mt-1 text-sm text-[var(--marketplace-text-muted)]">
          {isEn
            ? "Hand-picked properties matching your preferences"
            : "Propiedades seleccionadas según tus preferencias"}
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((listing) => (
          <MarketplaceListingCard
            key={listing.id || listing.slug}
            listing={listing.raw}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}
