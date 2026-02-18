import { ScrollReveal } from "@/components/scroll-reveal";

const LOGOS = [
  "Greystar",
  "CBRE",
  "JLL",
  "Cushman & Wakefield",
  "Colliers",
  "Savills",
] as const;

export function LogoCloud() {
  return (
    <section className="border-border border-y bg-[var(--section-alt)] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <p className="mb-8 text-center font-medium text-muted-foreground text-sm">
            Trusted by property teams around the world
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {LOGOS.map((name) => (
              <span
                className="font-semibold text-lg text-muted-foreground/40 transition-colors hover:text-muted-foreground/80"
                key={name}
              >
                {name}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
