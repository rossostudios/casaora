import type { Metadata } from "next";

import { getActiveLocale } from "@/lib/i18n/server";

import { BookingPage } from "./booking-page";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { orgSlug } = await params;
  return {
    title: `Book | ${orgSlug}`,
    robots: { index: true, follow: true },
  };
}

export default async function BookingRoute({ params }: PageProps) {
  const { orgSlug } = await params;
  const locale = await getActiveLocale();
  return <BookingPage locale={locale} orgSlug={orgSlug} />;
}
