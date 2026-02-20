import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PublicFooter } from "@/components/marketplace/public-footer";
import { PublicHeader } from "@/components/marketplace/public-header";
import { getActiveLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Owner Portal | Casaora",
  robots: { index: false, follow: false },
};

export default async function OwnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getActiveLocale();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader locale={locale} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {children}
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
