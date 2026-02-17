import {
  Location01Icon,
  Search01Icon,
  Wallet02Icon,
} from "@hugeicons/core-free-icons";

import { Icon } from "@/components/ui/icon";

type MarketplaceHeroProps = {
  isEn: boolean;
  defaultCity?: string;
  defaultMaxBudget?: string;
};

export function MarketplaceHero({
  isEn,
  defaultCity,
  defaultMaxBudget,
}: MarketplaceHeroProps) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24"
      style={{ background: "var(--marketplace-hero-gradient)" }}
    >
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-[var(--marketplace-text)] sm:text-5xl lg:text-6xl">
          {isEn
            ? "Find your next home in Paraguay"
            : "Encuentra tu próximo hogar en Paraguay"}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[var(--marketplace-text-muted)] text-base sm:text-lg">
          {isEn
            ? "Transparent pricing, no hidden fees. Browse long-term rentals with full cost breakdowns."
            : "Precios transparentes, sin costos ocultos. Explora alquileres de largo plazo con desglose completo."}
        </p>

        <form
          action="/marketplace"
          className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row sm:gap-0 sm:rounded-2xl sm:border sm:border-[#e8e4df] sm:bg-white/80 sm:p-1.5 sm:shadow-[0_8px_32px_rgba(0,0,0,0.06)] sm:backdrop-blur-sm"
        >
          <label className="inline-flex h-12 flex-1 items-center gap-2 rounded-2xl border border-[#e8e4df] bg-white/80 px-4 backdrop-blur-sm sm:border-0 sm:bg-transparent">
            <Icon className="text-[var(--marketplace-text-muted)]" icon={Location01Icon} size={16} />
            <input
              className="h-full w-full bg-transparent text-sm text-[var(--marketplace-text)] outline-none placeholder:text-[var(--marketplace-text-muted)]/60"
              defaultValue={defaultCity}
              name="city"
              placeholder={isEn ? "City" : "Ciudad"}
              type="text"
            />
          </label>

          <div className="hidden w-px self-stretch bg-[#e8e4df] sm:block" />

          <label className="inline-flex h-12 flex-1 items-center gap-2 rounded-2xl border border-[#e8e4df] bg-white/80 px-4 backdrop-blur-sm sm:border-0 sm:bg-transparent">
            <Icon className="text-[var(--marketplace-text-muted)]" icon={Wallet02Icon} size={16} />
            <input
              className="h-full w-full bg-transparent text-sm text-[var(--marketplace-text)] outline-none placeholder:text-[var(--marketplace-text-muted)]/60"
              defaultValue={defaultMaxBudget}
              min={0}
              name="max_monthly"
              placeholder={isEn ? "Max budget/mo" : "Presupuesto max/mes"}
              type="number"
            />
          </label>

          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-stoa-gradient-warm px-6 font-medium text-white text-sm transition-opacity hover:opacity-90"
            type="submit"
          >
            <Icon icon={Search01Icon} size={16} />
            {isEn ? "Search" : "Buscar"}
          </button>
        </form>
      </div>
    </section>
  );
}
