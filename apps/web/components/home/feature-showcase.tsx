"use client";

import { BarChart3, Calendar, Globe, LayoutDashboard } from "lucide-react";
import { useState } from "react";

import { ScrollReveal } from "@/components/scroll-reveal";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description:
      "Get a bird's-eye view of your portfolio with real-time metrics, occupancy rates, and revenue insights.",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
    description:
      "Manage reservations, availability, and lease schedules across all your properties in one unified calendar.",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: Globe,
    description:
      "Publish beautiful, SEO-optimized listings that attract quality tenants and guests directly.",
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    description:
      "Generate owner statements, P&L reports, and occupancy analytics with one click.",
  },
] as const;

export function FeatureShowcase() {
  const [active, setActive] = useState<string>("dashboard");
  const activeTab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-semibold text-3xl tracking-tight lg:text-5xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One platform that replaces spreadsheets, portals, and disconnected
            tools.
          </p>
        </ScrollReveal>

        <ScrollReveal className="mt-12" delay={100}>
          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            {TABS.map((tab) => (
              <button
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-sm transition-colors",
                  active === tab.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                key={tab.id}
                onClick={() => setActive(tab.id)}
                type="button"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
            <div className="p-6 lg:p-8">
              <p className="text-muted-foreground">{activeTab.description}</p>
            </div>
            <div className="aspect-[16/9] border-border border-t bg-gradient-to-br from-muted/50 to-background">
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                {activeTab.label} preview
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
