import type { Metadata } from "next";

import { ContactPageClient } from "@/components/pages/contact-page-client";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Casaora about pricing, onboarding, and support for your property portfolio.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
