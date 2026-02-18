"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ScrollReveal } from "@/components/scroll-reveal";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Starter",
    description: "For individual owners managing a few properties.",
    monthlyPrice: 29,
    annualPrice: 24,
    features: [
      "Up to 10 properties",
      "Listing management",
      "Basic calendar",
      "Guest messaging",
      "Email support",
    ],
    cta: "Get started",
    popular: false,
  },
  {
    name: "Professional",
    description: "For agencies and growing property managers.",
    monthlyPrice: 79,
    annualPrice: 65,
    features: [
      "Up to 50 properties",
      "Everything in Starter",
      "Owner statements",
      "Payment collection",
      "Automation sequences",
      "AI guest replies",
      "Priority support",
    ],
    cta: "Get started",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large portfolios with custom needs.",
    monthlyPrice: null,
    annualPrice: null,
    features: [
      "Unlimited properties",
      "Everything in Professional",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantees",
      "Custom reporting",
      "Onboarding & training",
    ],
    cta: "Contact sales",
    popular: false,
  },
] as const;

const FAQ = [
  {
    q: "Can I switch plans later?",
    a: "Yes, you can upgrade or downgrade at any time. Changes take effect immediately and billing is prorated.",
  },
  {
    q: "Is there a free trial?",
    a: "We offer a 14-day free trial on all plans. No credit card required to start.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards, bank transfers, and local payment methods in Paraguay.",
  },
  {
    q: "Do you offer discounts for annual billing?",
    a: "Yes, annual billing saves you approximately 18% compared to monthly billing.",
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="mx-auto max-w-3xl text-center">
            <h1 className="font-bold text-4xl tracking-tight lg:text-6xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Choose the plan that fits your portfolio. No hidden fees, no
              surprises.
            </p>

            {/* Toggle */}
            <div className="mt-8 inline-flex items-center gap-3">
              <span
                className={cn(
                  "font-medium text-sm",
                  annual ? "text-muted-foreground" : "text-foreground"
                )}
              >
                Monthly
              </span>
              <button
                aria-label="Toggle billing period"
                className="relative h-6 w-11 rounded-full bg-muted transition-colors"
                onClick={() => setAnnual(!annual)}
                type="button"
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-foreground transition-transform",
                    annual && "translate-x-5"
                  )}
                />
              </button>
              <span
                className={cn(
                  "font-medium text-sm",
                  annual ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Annual
                <span className="ml-1.5 text-primary text-xs">Save 18%</span>
              </span>
            </div>
          </ScrollReveal>

          {/* Tier cards */}
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {TIERS.map((tier, i) => (
              <ScrollReveal delay={i * 100} key={tier.name}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-xl border p-6 lg:p-8",
                    tier.popular
                      ? "border-primary shadow-casaora"
                      : "border-border bg-card"
                  )}
                >
                  {tier.popular ? (
                    <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 font-medium text-white text-xs">
                      Most popular
                    </div>
                  ) : null}

                  <h3 className="font-semibold text-lg">{tier.name}</h3>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {tier.description}
                  </p>

                  <div className="mt-6">
                    {tier.monthlyPrice !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-4xl tracking-tight">
                          ${annual ? tier.annualPrice : tier.monthlyPrice}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          /month
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-4xl tracking-tight">
                        Custom
                      </span>
                    )}
                  </div>

                  <ul className="mt-8 flex-1 space-y-3">
                    {tier.features.map((f) => (
                      <li className="flex items-start gap-3 text-sm" key={f}>
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    className={cn(
                      "mt-8 flex h-11 items-center justify-center rounded-lg font-medium text-sm transition-opacity hover:opacity-90",
                      tier.popular
                        ? "bg-foreground text-background"
                        : "border border-border text-foreground hover:bg-accent"
                    )}
                    href="/contact"
                  >
                    {tier.cta}
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-border border-t bg-[var(--section-alt)] py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-center font-semibold text-3xl tracking-tight">
              Frequently asked questions
            </h2>
          </ScrollReveal>

          <div className="mt-12 space-y-6">
            {FAQ.map((item, i) => (
              <ScrollReveal delay={i * 50} key={item.q}>
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold">{item.q}</h3>
                  <p className="mt-2 text-muted-foreground text-sm">{item.a}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
