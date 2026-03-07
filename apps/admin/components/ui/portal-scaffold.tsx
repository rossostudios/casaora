"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PublicFooter } from "@/components/marketplace/public-footer";
import { PublicHeader } from "@/components/marketplace/public-header";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PortalNavItem = {
  href: string;
  label: string;
};

export function PortalScaffold({
  children,
  locale,
  title,
  navItems,
  maxWidthClassName = "max-w-4xl",
  hideNavOnPrefixes = [],
}: {
  children: ReactNode;
  locale: Locale;
  title: string;
  navItems: PortalNavItem[];
  maxWidthClassName?: string;
  hideNavOnPrefixes?: string[];
}) {
  const pathname = usePathname();
  const showNav = !hideNavOnPrefixes.some((prefix) => pathname.startsWith(prefix));

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader locale={locale} />
      <main className={cn("mx-auto w-full flex-1 px-4 py-8", maxWidthClassName)}>
        <div className="space-y-5">
          <header className="space-y-3">
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
              {title}
            </p>
            {showNav ? (
              <nav
                aria-label={title}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/70 p-2"
              >
                {navItems.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      className={cn(
                        "rounded-xl px-3 py-2 font-medium text-sm transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      href={item.href}
                      key={item.href}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </header>
          {children}
        </div>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
