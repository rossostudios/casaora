import type { Metadata } from "next";

import { getActiveLocale } from "@/lib/i18n/server";

import { OwnerReservations } from "./owner-reservations";

export const metadata: Metadata = {
  title: "Owner Reservations | Casaora",
};

export default async function OwnerReservationsPage() {
  const locale = await getActiveLocale();
  return <OwnerReservations locale={locale} />;
}
