import type { Metadata } from "next";

import { AudienceTabs } from "@/components/home/audience-tabs";
import { CtaSection } from "@/components/home/cta-section";
import { FeatureShowcase } from "@/components/home/feature-showcase";
import { Hero } from "@/components/home/hero";
import { LogoCloud } from "@/components/home/logo-cloud";
import { StatsBar } from "@/components/home/stats-bar";
import { Testimonials } from "@/components/home/testimonials";

export const metadata: Metadata = {
  title: "Property Management Platform",
  description:
    "Run your property portfolio with modern operations, guest communication, and automated workflows from Casaora.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <FeatureShowcase />
      <AudienceTabs />
      <Testimonials />
      <StatsBar />
      <CtaSection />
    </>
  );
}
