import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ScrollReveal } from "@/components/scroll-reveal";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--hero-glow)" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 lg:px-8 lg:pt-32 lg:pb-28">
        <ScrollReveal className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center rounded-full border border-border bg-background px-4 py-1.5 text-muted-foreground text-sm">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            Now in beta — join the waitlist
          </div>

          {/* Headline */}
          <h1 className="font-bold text-5xl leading-[1.08] tracking-tight lg:text-7xl">
            The operating system for{" "}
            <span className="text-casaora-gradient">property management</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground lg:text-xl">
            Casaora unifies your listings, reservations, finances, and guest
            communication into one seamless platform — built for property
            owners, managers, and agencies.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-foreground px-6 font-medium text-background text-sm transition-opacity hover:opacity-90"
              href="/contact"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-border px-6 font-medium text-foreground text-sm transition-colors hover:bg-accent"
              href="/features"
            >
              Explore features
            </Link>
          </div>
        </ScrollReveal>

        {/* Product screenshot placeholder */}
        <ScrollReveal className="mt-16 lg:mt-20" delay={200}>
          <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/5">
            <div className="flex items-center gap-2 border-border border-b px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-border" />
              <div className="h-3 w-3 rounded-full bg-border" />
              <div className="h-3 w-3 rounded-full bg-border" />
            </div>
            <div className="aspect-[16/9] bg-gradient-to-br from-muted to-background p-8">
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Product screenshot
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
