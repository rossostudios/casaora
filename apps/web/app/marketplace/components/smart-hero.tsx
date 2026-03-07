import { Search01Icon } from "@hugeicons/core-free-icons";
import { Sparkles } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import { CITY_DISPLAY_NAMES } from "@/lib/features/marketplace/geo";

type SmartHeroProps = {
  isEn: boolean;
  defaultCity?: string;
  defaultMaxBudget?: string;
  listingCount: number;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: hero uses many ternary operators for i18n
export function SmartHero({
  isEn,
  defaultCity,
  defaultMaxBudget,
  listingCount,
}: SmartHeroProps) {
  return (
    <section className="relative pt-8 pb-4 sm:pt-12 lg:pt-20">
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 -top-16 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,var(--marketplace-hero-glow),transparent)]" />

      <div className="relative">
        {/* Editorial headline */}
        <div className="max-w-3xl">
          <h1 className="font-medium font-serif text-4xl text-[var(--marketplace-text)] tracking-tight sm:text-5xl lg:text-[4.25rem] lg:leading-[1.08]">
            {isEn
              ? "Find your next home in Paraguay"
              : "Encuentra tu próximo hogar en Paraguay"}
          </h1>
          <p className="mt-5 max-w-xl text-[var(--marketplace-text-muted)] text-lg leading-relaxed">
            {isEn
              ? "Transparent pricing. No hidden fees. AI-powered discovery."
              : "Precios transparentes. Sin costos ocultos. Búsqueda inteligente."}
          </p>
        </div>

        {/* Search form */}
        <form
          action="/marketplace"
          className="relative mt-10 max-w-4xl space-y-4"
        >
          {/* NLP search input */}
          <div className="relative">
            <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 sm:left-5">
              <Sparkles className="size-[18px] text-[var(--marketplace-ai-accent)]" />
            </div>
            <input
              className="h-14 w-full rounded-xl border border-[var(--marketplace-text)]/8 bg-white/70 pr-4 pl-12 text-[var(--marketplace-text)] shadow-[0_2px_12px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-all placeholder:text-[var(--marketplace-text-muted)]/40 focus:border-primary/20 focus:shadow-[0_4px_20px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-primary/8 sm:h-16 sm:pr-36 sm:pl-14 sm:text-lg"
              name="q"
              placeholder={
                isEn
                  ? 'Try: "2 bed apartment in Asunción under ₲3M"'
                  : 'Ej: "Depto 2 hab en Asunción bajo ₲3.000.000"'
              }
              type="text"
            />
            <button
              className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-2 rounded-lg bg-[var(--marketplace-text)] px-5 py-2.5 font-medium text-sm text-white shadow-sm transition-all duration-200 hover:opacity-90 active:scale-[0.97] sm:inline-flex"
              type="submit"
            >
              <Icon icon={Search01Icon} size={16} />
              {isEn ? "Search" : "Buscar"}
            </button>
          </div>

          {/* Compact filter row */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-[10px] text-[var(--marketplace-text-muted)] uppercase tracking-wider">
                {isEn ? "Location" : "Ubicación"}
              </span>
              <select
                className="h-10 min-w-[140px] cursor-pointer appearance-none rounded-lg border border-[var(--marketplace-text)]/8 bg-white/60 px-3 font-medium text-[var(--marketplace-text)] text-sm outline-none transition-all hover:border-[var(--marketplace-text)]/15 focus:border-primary/20 focus:ring-2 focus:ring-primary/8"
                defaultValue={defaultCity}
                name="city"
              >
                <option value="">{isEn ? "All cities" : "Todas"}</option>
                {Object.entries(CITY_DISPLAY_NAMES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-[10px] text-[var(--marketplace-text-muted)] uppercase tracking-wider">
                {isEn ? "Max budget" : "Presupuesto máx."}
              </span>
              <select
                className="h-10 min-w-[140px] cursor-pointer appearance-none rounded-lg border border-[var(--marketplace-text)]/8 bg-white/60 px-3 font-medium text-[var(--marketplace-text)] text-sm outline-none transition-all hover:border-[var(--marketplace-text)]/15 focus:border-primary/20 focus:ring-2 focus:ring-primary/8"
                defaultValue={defaultMaxBudget || ""}
                name="max_monthly"
              >
                <option value="">{isEn ? "Any" : "Cualquier"}</option>
                <option value="1500000">
                  {isEn ? "₲1,500,000" : "₲1.500.000"}
                </option>
                <option value="2000000">
                  {isEn ? "₲2,000,000" : "₲2.000.000"}
                </option>
                <option value="2500000">
                  {isEn ? "₲2,500,000" : "₲2.500.000"}
                </option>
                <option value="3000000">
                  {isEn ? "₲3,000,000" : "₲3.000.000"}
                </option>
                <option value="5000000">
                  {isEn ? "₲5,000,000" : "₲5.000.000"}
                </option>
                <option value="8000000">
                  {isEn ? "₲8,000,000" : "₲8.000.000"}
                </option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-[10px] text-[var(--marketplace-text-muted)] uppercase tracking-wider">
                {isEn ? "Bedrooms" : "Habitaciones"}
              </span>
              <select
                className="h-10 min-w-[100px] cursor-pointer appearance-none rounded-lg border border-[var(--marketplace-text)]/8 bg-white/60 px-3 font-medium text-[var(--marketplace-text)] text-sm outline-none transition-all hover:border-[var(--marketplace-text)]/15 focus:border-primary/20 focus:ring-2 focus:ring-primary/8"
                name="min_bedrooms"
              >
                <option value="">{isEn ? "Any" : "Todas"}</option>
                <option value="0">{isEn ? "Studio" : "Monoamb."}</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3+</option>
              </select>
            </label>

            {/* Mobile search button */}
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--marketplace-text)] px-5 font-medium text-sm text-white transition-all hover:opacity-90 active:scale-[0.98] sm:hidden"
              type="submit"
            >
              <Icon icon={Search01Icon} size={16} />
              {isEn ? "Search" : "Buscar"}
            </button>
          </div>
        </form>

        {/* Quick city links */}
        <div className="mt-8 flex flex-wrap items-center gap-x-1 gap-y-1">
          <span className="mr-1 text-[var(--marketplace-text-muted)] text-xs">
            {isEn ? "Popular:" : "Popular:"}
          </span>
          {Object.entries(CITY_DISPLAY_NAMES)
            .slice(0, 6)
            .map(([key, label]) => (
              <a
                className="rounded-full px-2.5 py-1 font-medium text-[var(--marketplace-text-muted)] text-xs transition-colors hover:bg-[var(--marketplace-text)]/5 hover:text-[var(--marketplace-text)]"
                href={`/marketplace?city=${encodeURIComponent(key)}`}
                key={key}
              >
                {label}
              </a>
            ))}
        </div>

        {/* Listing count */}
        {listingCount > 0 ? (
          <p className="mt-4 text-[var(--marketplace-text-muted)] text-sm">
            <span className="font-semibold text-[var(--marketplace-text)] tabular-nums">
              {listingCount}
            </span>{" "}
            {isEn ? "properties available" : "propiedades disponibles"}
          </p>
        ) : null}
      </div>
    </section>
  );
}
