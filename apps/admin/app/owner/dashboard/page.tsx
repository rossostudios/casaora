import type { Metadata } from "next";

import { getActiveLocale } from "@/lib/i18n/server";

import { OwnerDashboard } from "./owner-dashboard";

export const metadata: Metadata = {
  title: "Owner Dashboard | Casaora",
};

export default async function OwnerDashboardPage() {
  const locale = await getActiveLocale();
  return <OwnerDashboard locale={locale} />;
}
