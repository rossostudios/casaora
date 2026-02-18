"use client";

import { Building2, Hotel, KeyRound, Users } from "lucide-react";
import { useState } from "react";

import { ScrollReveal } from "@/components/scroll-reveal";
import { cn } from "@/lib/utils";

const AUDIENCES = [
  {
    id: "owners",
    label: "Owners",
    icon: Building2,
    benefits: [
      "Real-time portfolio performance visibility",
      "Automated owner statement generation",
      "Dedicated owner portal with financials",
      "Multi-property expense tracking",
    ],
  },
  {
    id: "managers",
    label: "Managers",
    icon: Users,
    benefits: [
      "Unified dashboard for all properties",
      "Task management and maintenance workflows",
      "Automated guest/tenant communication",
      "Integrated payment collection",
    ],
  },
  {
    id: "guests",
    label: "Guests",
    icon: Hotel,
    benefits: [
      "Beautiful marketplace to discover properties",
      "Digital booking and check-in process",
      "Self-service guest portal",
      "Direct messaging with property team",
    ],
  },
  {
    id: "tenants",
    label: "Tenants",
    icon: KeyRound,
    benefits: [
      "Online lease signing and renewals",
      "Easy rent payment via multiple methods",
      "Maintenance request submission",
      "Document access and payment history",
    ],
  },
] as const;

export function AudienceTabs() {
  const [active, setActive] = useState("owners");
  const audience = AUDIENCES.find((a) => a.id === active) ?? AUDIENCES[0];

  return (
    <section className="bg-[var(--section-alt)] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-semibold text-3xl tracking-tight lg:text-5xl">
            Built for every stakeholder
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Whether you own, manage, or live in a property — Casaora works for
            you.
          </p>
        </ScrollReveal>

        <ScrollReveal className="mt-12" delay={100}>
          <div className="flex flex-wrap justify-center gap-2">
            {AUDIENCES.map((a) => (
              <button
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-sm transition-colors",
                  active === a.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                key={a.id}
                onClick={() => setActive(a.id)}
                type="button"
              >
                <a.icon className="h-4 w-4" />
                {a.label}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {/* Benefits */}
            <div className="flex flex-col justify-center space-y-4">
              {audience.benefits.map((benefit, i) => (
                <div className="flex items-start gap-3" key={benefit}>
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
                    {i + 1}
                  </div>
                  <p className="text-foreground">{benefit}</p>
                </div>
              ))}
            </div>

            {/* Screenshot placeholder */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground text-sm">
                {audience.label} experience
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
