import type { Metadata } from "next";

import { getActiveLocale } from "@/lib/i18n/server";

import { OwnerStatements } from "./owner-statements";

export const metadata: Metadata = {
  title: "Owner Statements | Casaora",
};

export default async function OwnerStatementsPage() {
  const locale = await getActiveLocale();
  return <OwnerStatements locale={locale} />;
}
