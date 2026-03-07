import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalScaffold } from "@/components/ui/portal-scaffold";
import { getActiveLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Casaora",
  },
};

export default async function TenantLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";

  return (
    <PortalScaffold
      hideNavOnPrefixes={["/tenant/login"]}
      locale={locale}
      maxWidthClassName="max-w-4xl"
      navItems={[
        {
          href: "/tenant/dashboard",
          label: isEn ? "Home" : "Inicio",
        },
        {
          href: "/tenant/payments",
          label: isEn ? "Payments" : "Pagos",
        },
        {
          href: "/tenant/maintenance",
          label: isEn ? "Maintenance" : "Mantenimiento",
        },
        {
          href: "/tenant/documents",
          label: isEn ? "Documents" : "Documentos",
        },
        {
          href: "/tenant/messages",
          label: isEn ? "Messages" : "Mensajes",
        },
      ]}
      title={isEn ? "Tenant portal" : "Portal de inquilino"}
    >
      {children}
    </PortalScaffold>
  );
}
