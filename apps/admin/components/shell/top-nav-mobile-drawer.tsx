"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  CHAT_LINKS,
  INBOX_STATUS_LINKS,
} from "@/components/shell/sidebar-constants";
import { SidebarQuickCreate } from "@/components/shell/sidebar-quick-create";
import type { MemberRole } from "@/components/shell/sidebar-types";
import {
  isRouteActive,
  resolveSections,
} from "@/components/shell/sidebar-utils";
import { Drawer } from "@/components/ui/drawer";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TopNavMobileDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
  orgId: string | null;
  role?: MemberRole | null;
};

function DrawerContent({
  locale,
  orgId,
  role,
  onClose,
}: {
  locale: Locale;
  orgId: string | null;
  role?: MemberRole | null;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const isEn = locale === "en-US";
  const sections = resolveSections(locale, role);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link
          className="font-bold text-foreground text-lg tracking-tight"
          href="/app"
          onClick={onClose}
        >
          Casaora
        </Link>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {sections.map((section) => (
          <div key={section.key}>
            <p className="px-2 pb-1.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const active = isRouteActive(pathname, search, link.href);
                return (
                  <Link
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-accent font-medium text-foreground"
                        : "text-foreground/80 hover:bg-accent/60 hover:text-foreground"
                    )}
                    href={link.href}
                    key={link.href}
                    onClick={onClose}
                  >
                    <Icon
                      className="text-muted-foreground"
                      icon={link.iconElement}
                      size={15}
                    />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <p className="px-2 pb-1.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
            {isEn ? "Conversations" : "Conversaciones"}
          </p>
          <div className="space-y-0.5">
            {INBOX_STATUS_LINKS.map((link) => {
              const active = isRouteActive(pathname, search, link.href);
              return (
                <Link
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] transition-colors",
                    active
                      ? "bg-accent font-medium text-foreground"
                      : "text-foreground/80 hover:bg-accent/60 hover:text-foreground"
                  )}
                  href={link.href}
                  key={link.href}
                  onClick={onClose}
                >
                  <Icon
                    className="text-muted-foreground"
                    icon={link.icon}
                    size={15}
                  />
                  {link.label[locale]}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <p className="px-2 pb-1.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
            {isEn ? "AI" : "IA"}
          </p>
          <div className="space-y-0.5">
            {CHAT_LINKS.filter(
              (link) => !link.roles || (role && link.roles.includes(role))
            ).map((link) => {
              const active = isRouteActive(pathname, search, link.href);
              return (
                <Link
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] transition-colors",
                    active
                      ? "bg-accent font-medium text-foreground"
                      : "text-foreground/80 hover:bg-accent/60 hover:text-foreground"
                  )}
                  href={link.href}
                  key={link.href}
                  onClick={onClose}
                >
                  <Icon
                    className="text-muted-foreground"
                    icon={link.icon}
                    size={15}
                  />
                  {link.label[locale]}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-border/40 border-t p-3">
        <SidebarQuickCreate locale={locale} />
      </div>
    </div>
  );
}

export function TopNavMobileDrawer({
  open,
  onOpenChange,
  locale,
  orgId,
  role,
}: TopNavMobileDrawerProps) {
  return (
    <Drawer
      className="w-[280px] p-0"
      closeLabel={locale === "en-US" ? "Close navigation" : "Cerrar navegación"}
      contentClassName="p-0"
      onOpenChange={onOpenChange}
      open={open}
      side="left"
    >
      <Suspense fallback={null}>
        <DrawerContent
          locale={locale}
          onClose={() => onOpenChange(false)}
          orgId={orgId}
          role={role}
        />
      </Suspense>
    </Drawer>
  );
}
