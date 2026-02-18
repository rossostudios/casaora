"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname.startsWith("/studio")) return null;

  return (
    <header className="sticky top-0 z-50 border-border/50 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            className="font-bold text-foreground text-xl tracking-tight transition-opacity hover:opacity-80"
            href="/"
          >
            CASAORA
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                className={cn(
                  "rounded-lg px-3 py-2 font-medium text-sm transition-colors",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link
            className="hidden h-9 items-center rounded-lg bg-foreground px-4 font-medium text-background text-sm transition-opacity hover:opacity-90 md:inline-flex"
            href="/contact"
          >
            Get started
          </Link>

          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            type="button"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen ? (
        <div className="border-border/50 border-t bg-background px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV_ITEMS.map((item) => (
              <Link
                className={cn(
                  "rounded-lg px-3 py-2.5 font-medium text-sm transition-colors",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                href={item.href}
                key={item.href}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 px-3">
            <Link
              className="flex h-10 w-full items-center justify-center rounded-lg bg-foreground font-medium text-background text-sm transition-opacity hover:opacity-90"
              href="/contact"
              onClick={() => setMobileOpen(false)}
            >
              Get started
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
