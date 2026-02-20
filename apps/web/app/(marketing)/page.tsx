import type { Metadata } from "next";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { Stats } from "@/components/marketing/stats";
import { Stepper } from "@/components/marketing/stepper";
import { Testimonials } from "@/components/marketing/testimonials";

export const metadata: Metadata = {
  title: "Casaora — Short-term rental operations in Paraguay, simplified.",
  description:
    "The all-in-one platform for property managers and real estate companies. Manage channels, reservations, and owner statements from a single, beautiful dashboard.",
};

export default function HomePage() {
  return (
    <SmoothScroll>
      <div className="flex w-full flex-col overflow-hidden">
        <Hero />
        <Features />
        <Stepper />
        <Stats />
        <Testimonials />
        <Pricing />
      </div>
    </SmoothScroll>
  );
}
