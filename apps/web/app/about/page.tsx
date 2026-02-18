import { Heart, Lightbulb, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Casaora's mission to bring transparency and efficiency to property management in Latin America.",
};

const VALUES = [
  {
    icon: Shield,
    title: "Transparency",
    description:
      "Every transaction, statement, and communication is visible to all stakeholders. No hidden fees, no surprises.",
  },
  {
    icon: Lightbulb,
    title: "Simplicity",
    description:
      "Powerful features don't have to be complicated. We obsess over making complex workflows feel effortless.",
  },
  {
    icon: Users,
    title: "Collaboration",
    description:
      "Owners, managers, guests, and tenants all have their place. We design for the entire ecosystem, not just one role.",
  },
  {
    icon: Heart,
    title: "Local First",
    description:
      "Built for Latin American markets with local payment methods, bilingual interfaces, and regional compliance.",
  },
] as const;

const TIMELINE = [
  {
    year: "2024",
    title: "The idea",
    description:
      "Born from the frustration of managing properties across Paraguay with disconnected spreadsheets and messaging apps.",
  },
  {
    year: "2025",
    title: "First users",
    description:
      "Launched the marketplace and admin dashboard, onboarding the first agencies in Asuncion and Ciudad del Este.",
  },
  {
    year: "2026",
    title: "Scaling up",
    description:
      "Expanding across Latin America with AI-powered automation and new financial tools for property teams.",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      {/* Mission */}
      <Section>
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <h1 className="font-bold text-4xl tracking-tight lg:text-6xl">
            Property management,{" "}
            <span className="font-serif italic">reimagined</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Casaora is building the all-in-one operating system for property
            management in Latin America. We believe every property transaction
            should be transparent, every workflow should be automated, and every
            stakeholder should have a great experience.
          </p>
        </ScrollReveal>
      </Section>

      {/* Values */}
      <Section alt>
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-semibold text-3xl tracking-tight lg:text-5xl">
            Our values
          </h2>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <ScrollReveal delay={i * 100} key={v.title}>
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{v.title}</h3>
                <p className="mt-2 text-muted-foreground text-sm">
                  {v.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* Timeline */}
      <Section>
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-semibold text-3xl tracking-tight lg:text-5xl">
            Our journey
          </h2>
        </ScrollReveal>

        <div className="mx-auto mt-12 max-w-2xl space-y-8">
          {TIMELINE.map((event, i) => (
            <ScrollReveal delay={i * 100} key={event.year}>
              <div className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
                    {event.year}
                  </div>
                  {i < TIMELINE.length - 1 ? (
                    <div className="mt-2 h-full w-px bg-border" />
                  ) : null}
                </div>
                <div className="pb-8">
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {event.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* Team placeholder */}
      <Section alt>
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-semibold text-3xl tracking-tight lg:text-5xl">
            The team
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A small, passionate team building the future of property management
            from Asuncion, Paraguay.
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(["founder", "engineering", "operations"] as const).map(
            (role, i) => (
              <ScrollReveal delay={i * 100} key={role}>
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="aspect-square bg-muted" />
                  <div className="p-4 text-center">
                    <p className="font-semibold">Team member</p>
                    <p className="text-muted-foreground text-sm">Role</p>
                  </div>
                </div>
              </ScrollReveal>
            )
          )}
        </div>
      </Section>
    </>
  );
}
