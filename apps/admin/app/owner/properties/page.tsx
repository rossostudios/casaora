import type { Metadata } from "next";

import { getActiveLocale } from "@/lib/i18n/server";

import { OwnerProperties } from "./owner-properties";

export const metadata: Metadata = {
  title: "Owner Properties | Casaora",
};

export default async function OwnerPropertiesPage() {
  const locale = await getActiveLocale();
  return <OwnerProperties locale={locale} />;
}
