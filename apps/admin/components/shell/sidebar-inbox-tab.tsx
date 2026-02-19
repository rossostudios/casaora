"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { INBOX_SEGMENT_LINKS, INBOX_STATUS_LINKS } from "./sidebar-constants";
import { ShortcutBlock } from "./sidebar-nav-link";

export function SidebarInboxTab({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  return (
    <div className="space-y-4">
      <ShortcutBlock
        label={{ "es-PY": "Estado", "en-US": "Status" }}
        links={INBOX_STATUS_LINKS}
        locale={locale}
        pathname={pathname}
        search={search}
      />
      <ShortcutBlock
        label={{
          "es-PY": "Segmentos guardados",
          "en-US": "Saved Segments",
        }}
        links={INBOX_SEGMENT_LINKS}
        locale={locale}
        pathname={pathname}
        search={search}
      />
    </div>
  );
}
