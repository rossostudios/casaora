import type { Metadata } from "next";

import { getActiveLocale } from "@/lib/i18n/server";

import { OwnerLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Owner Access | Casaora",
  robots: { index: false, follow: false },
};

export default async function OwnerLoginPage() {
  const locale = await getActiveLocale();
  return <OwnerLoginForm locale={locale} />;
}
