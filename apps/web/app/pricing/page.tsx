import type { Metadata } from "next";

import { PricingPageClient } from "@/components/pages/pricing-page-client";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare Casaora plans for owners, agencies, and enterprise portfolios.",
};

export default function PricingPage() {
  return <PricingPageClient />;
}
