import { AudienceTabs } from "@/components/home/audience-tabs";
import { CtaSection } from "@/components/home/cta-section";
import { FeatureShowcase } from "@/components/home/feature-showcase";
import { Hero } from "@/components/home/hero";
import { LogoCloud } from "@/components/home/logo-cloud";
import { StatsBar } from "@/components/home/stats-bar";
import { Testimonials } from "@/components/home/testimonials";

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
