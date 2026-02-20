"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { CasaoraLogo } from "@/components/icons/casaora-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3000";

const NAV_ITEMS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const { getSupabaseBrowserClient } = await import(
          "@/lib/supabase/browser"
        );
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (mounted) setIsAuthenticated(!!data.session);

        const { data: listener } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (mounted) setIsAuthenticated(!!session);
          }
        );
        return () => {
          mounted = false;
          listener.subscription.unsubscribe();
        };
      } catch {
        // Supabase not configured — stay unauthenticated
      }
    }

    checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  if (pathname.startsWith("/studio")) return null;

  return (
    <header className="sticky top-0 z-50 border-border/50 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            className="flex items-center gap-2 font-bold text-foreground text-xl tracking-tight transition-opacity hover:opacity-80"
            href="/"
          >
            <CasaoraLogo className="h-6 w-6" />
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

          {isAuthenticated ? (
            <a
              className="hidden h-9 items-center rounded-lg bg-foreground px-4 font-medium text-background text-sm transition-opacity hover:opacity-90 md:inline-flex"
              href={`${ADMIN_URL}/app`}
            >
              Dashboard &rarr;
            </a>
          ) : (
            <>
              <Link
                className="hidden px-4 py-2 font-medium text-sm transition-opacity hover:opacity-80 md:inline-flex"
                href="/login"
              >
                Log in
              </Link>
              <Link
                className="hidden h-9 items-center rounded-lg bg-foreground px-4 font-medium text-background text-sm transition-opacity hover:opacity-90 md:inline-flex"
                href="/signup"
              >
                Sign up
              </Link>
            </>
          )}

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
          <div className="mt-3 flex flex-col gap-2 px-3">
            {isAuthenticated ? (
              <a
                className="flex h-10 w-full items-center justify-center rounded-lg bg-foreground font-medium text-background text-sm transition-opacity hover:opacity-90"
                href={`${ADMIN_URL}/app`}
                onClick={() => setMobileOpen(false)}
              >
                Dashboard &rarr;
              </a>
            ) : (
              <>
                <Link
                  className="flex h-10 w-full items-center justify-center rounded-lg border border-border font-medium text-foreground text-sm transition-colors hover:bg-muted"
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  className="flex h-10 w-full items-center justify-center rounded-lg bg-foreground font-medium text-background text-sm transition-opacity hover:opacity-90"
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
