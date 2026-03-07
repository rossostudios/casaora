"use client";

import {
  ArtificialIntelligence02Icon,
  Menu01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback } from "react";

import { NotificationBell } from "@/components/shell/notification-bell";
import { APPLE_DEVICE_REGEX } from "@/components/shell/sidebar-constants";
import type { MemberRole } from "@/components/shell/sidebar-types";
import {
  resolvePrimaryTab,
  resolveSections,
} from "@/components/shell/sidebar-utils";
import { TopNavDropdown } from "@/components/shell/top-nav-dropdown";
import { TopNavUserMenu } from "@/components/shell/top-nav-user-menu";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TopNavProps = {
  locale: Locale;
  orgId: string | null;
  role?: MemberRole | null;
  aiChatOpen: boolean;
  onAIChatToggle: () => void;
  onMobileMenuToggle: () => void;
};

export function TopNav({
  locale,
  orgId,
  role,
  aiChatOpen,
  onAIChatToggle,
  onMobileMenuToggle,
}: TopNavProps) {
  const pathname = usePathname();
  const activeTab = resolvePrimaryTab(pathname);
  const isEn = locale === "en-US";
  const sections = resolveSections(locale, role);

  const sectionToTab: Record<string, string[]> = {
    portfolio: ["portfolio"],
    rentals: ["leasing"],
    operations: ["operations"],
    finance: ["finance"],
    workspace: [],
  };

  const openSearch = useCallback(() => {
    if (typeof window === "undefined") return;
    const isMac = APPLE_DEVICE_REGEX.test(window.navigator.platform);
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "k",
      metaKey: isMac,
      ctrlKey: !isMac,
    });
    window.dispatchEvent(event);
  }, []);

  return (
    <header className="fixed top-0 z-40 h-14 w-full border-white/10 border-b bg-black text-white">
      <div className="flex h-full items-center px-4 lg:px-6">
        {/* Mobile hamburger */}
        <button
          aria-label={isEn ? "Open menu" : "Abrir menú"}
          className="mr-3 flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          onClick={onMobileMenuToggle}
          type="button"
        >
          <Icon icon={Menu01Icon} size={20} />
        </button>

        {/* Logo */}
        <Link
          className="mr-6 font-bold text-lg text-white tracking-tight"
          href="/app"
        >
          Casaora
        </Link>

        {/* Desktop nav dropdowns */}
        <nav className="hidden h-full items-center lg:flex">
          <Suspense fallback={null}>
            {sections.map((section) => {
              const tabKeys = sectionToTab[section.key] ?? [];
              const isActive = tabKeys.includes(activeTab);
              return (
                <TopNavDropdown
                  isActive={isActive}
                  key={section.key}
                  section={section}
                />
              );
            })}
          </Suspense>
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1">
          {/* Search */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={isEn ? "Search" : "Buscar"}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                onClick={openSearch}
                type="button"
              >
                <Icon icon={Search01Icon} size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              <span className="font-medium text-[11px]">
                {isEn ? "Search" : "Buscar"}
              </span>
              <kbd className="ml-2 rounded border border-border/80 bg-muted/60 px-1 py-0.5 font-mono text-[10px]">
                {typeof navigator !== "undefined" &&
                APPLE_DEVICE_REGEX.test(navigator.platform)
                  ? "⌘K"
                  : "Ctrl+K"}
              </kbd>
            </TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <div
            className={cn(
              "[&_button]:text-white/60 [&_button]:hover:bg-white/10 [&_button]:hover:text-white",
              "[&_span.absolute]:ring-black"
            )}
          >
            <NotificationBell locale={locale} orgId={orgId} />
          </div>

          {/* AI Chat toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={isEn ? "AI Assistant" : "Asistente IA"}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  aiChatOpen
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
                onClick={onAIChatToggle}
                type="button"
              >
                <Icon icon={ArtificialIntelligence02Icon} size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              <span className="font-medium text-[11px]">
                {isEn ? "AI Assistant" : "Asistente IA"}
              </span>
              <kbd className="ml-2 rounded border border-border/80 bg-muted/60 px-1 py-0.5 font-mono text-[10px]">
                {typeof navigator !== "undefined" &&
                APPLE_DEVICE_REGEX.test(navigator.platform)
                  ? "⌘J"
                  : "Ctrl+J"}
              </kbd>
            </TooltipContent>
          </Tooltip>

          {/* User menu */}
          <div className="ml-1">
            <TopNavUserMenu locale={locale} orgId={orgId} />
          </div>
        </div>
      </div>
    </header>
  );
}
