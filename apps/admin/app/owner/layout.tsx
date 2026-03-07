import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalScaffold } from "@/components/ui/portal-scaffold";
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
  const isEn = locale === "en-US";

  return (
    <PortalScaffold
      hideNavOnPrefixes={["/owner/login"]}
      locale={locale}
      maxWidthClassName="max-w-5xl"
      navItems={[
        {
          href: "/owner/dashboard",
          label: isEn ? "Overview" : "Resumen",
        },
        {
          href: "/owner/properties",
          label: isEn ? "Portfolio" : "Portafolio",
        },
        {
          href: "/owner/reservations",
          label: isEn ? "Reservations" : "Reservas",
        },
        {
          href: "/owner/statements",
          label: isEn ? "Statements" : "Liquidaciones",
        },
      ]}
      title={isEn ? "Owner portal" : "Portal de propietario"}
    >
      {children}
    </PortalScaffold>
  );
}
