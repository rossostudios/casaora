import {
  BarChart3,
  BellRing,
  Brain,
  CalendarDays,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore everything Casaora offers — from operations and finance to guest experience, automation, and AI intelligence.",
};

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Operations Hub",
    description:
      "A unified dashboard gives your team real-time visibility across every property, reservation, and maintenance request.",
    items: [
      "Multi-property portfolio overview",
      "Task management with assignments and deadlines",
      "Maintenance workflows and vendor coordination",
      "Custom views and filters for teams",
    ],
  },
  {
    icon: Wallet,
    title: "Finance & Payments",
    description:
      "Automate rent collection, generate owner statements, and track expenses down to every guarani.",
    items: [
      "Automated payment collection and reminders",
      "Owner statement generation with one click",
      "Expense tracking per property or portfolio",
      "Deposit management and reconciliation",
    ],
  },
  {
    icon: Globe,
    title: "Marketplace & Listings",
    description:
      "Publish beautiful, SEO-optimized listings that attract quality tenants and guests directly — no middlemen.",
    items: [
      "Public marketplace with search and filters",
      "Photo galleries with drag-and-drop ordering",
      "Automated slug generation and SEO metadata",
      "Readiness checklist for go-live",
    ],
  },
  {
    icon: CalendarDays,
    title: "Calendar & Reservations",
    description:
      "Manage availability, bookings, and lease schedules in one calendar with iCal sync and conflict detection.",
    items: [
      "Unified availability calendar",
      "iCal import/export for channel sync",
      "Automated check-in/check-out reminders",
      "Seasonal pricing and minimum stays",
    ],
  },
  {
    icon: MessageSquare,
    title: "Guest Experience",
    description:
      "From booking confirmation to check-out, create a seamless experience with automated messaging and self-service portals.",
    items: [
      "Guest and tenant self-service portals",
      "Automated messaging sequences",
      "Digital lease signing and document sharing",
      "Review collection and response management",
    ],
  },
  {
    icon: BellRing,
    title: "Automation & Workflows",
    description:
      "Reduce manual work with smart automations that trigger actions based on events across your portfolio.",
    items: [
      "Event-driven automation sequences",
      "Payment reminder escalation chains",
      "Lease renewal reminder workflows",
      "Custom trigger and action builder",
    ],
  },
  {
    icon: Brain,
    title: "Intelligence & AI",
    description:
      "AI-powered insights help you optimize pricing, detect anomalies, and respond to guests faster.",
    items: [
      "AI-generated guest reply suggestions",
      "Anomaly detection for payments and occupancy",
      "Smart pricing recommendations",
      "Natural language property search",
    ],
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description:
      "Export-ready reports give owners and managers the data they need to make informed decisions.",
    items: [
      "Occupancy and revenue dashboards",
      "Owner statements and P&L reports",
      "Custom report builder with date ranges",
      "CSV and PDF export for all reports",
    ],
  },
] as const;

export default function FeaturesPage() {
  return (
    <>
      <Section>
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <h1 className="font-bold text-4xl tracking-tight lg:text-6xl">
            Powerful features, simple interface
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Every tool you need to manage properties professionally — from
            operations and finance to AI-powered intelligence.
          </p>
        </ScrollReveal>
      </Section>

      {FEATURES.map((feature, i) => (
        <Section alt={i % 2 === 1} key={feature.title}>
          <ScrollReveal>
            <div
              className={`grid items-center gap-12 lg:grid-cols-2 ${i % 2 === 1 ? "lg:direction-rtl" : ""}`}
            >
              <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-semibold text-2xl tracking-tight lg:text-3xl">
                  {feature.title}
                </h2>
                <p className="mt-3 text-muted-foreground">
                  {feature.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {feature.items.map((item) => (
                    <li className="flex items-start gap-3 text-sm" key={item}>
                      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className={`overflow-hidden rounded-xl border border-border bg-card ${i % 2 === 1 ? "lg:order-1" : ""}`}
              >
                <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground text-sm">
                  {feature.title} preview
                </div>
              </div>
            </div>
          </ScrollReveal>
        </Section>
      ))}
    </>
  );
}
