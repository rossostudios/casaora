"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AIChatPanel } from "@/components/shell/ai-chat-panel";
import { AppBreadcrumbs } from "@/components/shell/app-breadcrumbs";
import { AppFooter } from "@/components/shell/app-footer";
import { CommandPalette } from "@/components/shell/command-palette";
import { ShortcutsHelp } from "@/components/shell/shortcuts-help";
import { SidebarQuickCreate } from "@/components/shell/sidebar-quick-create";
import type { MemberRole } from "@/components/shell/sidebar-types";
import { TabBar } from "@/components/shell/tab-bar";
import { TopNav } from "@/components/shell/top-nav";
import { TopNavMobileDrawer } from "@/components/shell/top-nav-mobile-drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { onApiError } from "@/lib/api-client";
import { useGlobalHotkeys } from "@/lib/hotkeys/use-global-hotkeys";
import { useNavigationHotkeys } from "@/lib/hotkeys/use-navigation-hotkeys";
import type { Locale } from "@/lib/i18n";
import { TabProvider } from "@/lib/tabs/tab-context";

type AdminShellProps = {
  orgId: string | null;
  locale: Locale;
  role?: MemberRole | null;
  onboardingProgress: {
    completedSteps: number;
    totalSteps: number;
    percent: number;
  };
  children: ReactNode;
};

const SHEET_LOCK_COUNT_ATTR = "data-pa-scroll-lock-count";
const SHEET_LOCK_PREV_OVERFLOW_ATTR = "data-pa-scroll-lock-prev-overflow";
const BASE_UI_SCROLL_LOCK_ATTR = "data-base-ui-scroll-locked";

function hasOpenModalDialog(): boolean {
  const dialogs = document.querySelectorAll<HTMLElement>(
    "[role='dialog'][aria-modal='true']"
  );

  for (const dialog of dialogs) {
    if (dialog.hasAttribute("hidden")) continue;
    if (dialog.hasAttribute("data-closed")) continue;
    if (dialog.getAttribute("aria-hidden") === "true") continue;

    const style = window.getComputedStyle(dialog);
    if (style.display === "none" || style.visibility === "hidden") continue;

    return true;
  }

  return false;
}

function clearPageScrollStyles(): void {
  const body = document.body;
  const html = document.documentElement;

  body.style.removeProperty("overflow");
  body.style.removeProperty("overflow-x");
  body.style.removeProperty("overflow-y");
  body.style.removeProperty("scroll-behavior");

  body.style.removeProperty("position");
  body.style.removeProperty("height");
  body.style.removeProperty("width");
  body.style.removeProperty("box-sizing");

  html.style.removeProperty("overflow");
  html.style.removeProperty("overflow-x");
  html.style.removeProperty("overflow-y");
  html.style.removeProperty("scroll-behavior");
  html.style.removeProperty("scrollbar-gutter");
  html.removeAttribute(BASE_UI_SCROLL_LOCK_ATTR);
}

function clearStalePageScrollLock(): void {
  const body = document.body;
  const lockCount = Number.parseInt(
    body.getAttribute(SHEET_LOCK_COUNT_ATTR) ?? "0",
    10
  );
  if (lockCount > 0 || hasOpenModalDialog()) {
    return;
  }

  clearPageScrollStyles();
  body.removeAttribute(SHEET_LOCK_COUNT_ATTR);
  body.removeAttribute(SHEET_LOCK_PREV_OVERFLOW_ATTR);
}

function useShellHotkeys(locale: Locale, onAIChatToggle: () => void) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const { gPressed } = useNavigationHotkeys();

  useGlobalHotkeys({
    onCommandPalette: useCallback(() => setCmdPaletteOpen((prev) => !prev), []),
    onShowHelp: useCallback(() => setHelpOpen((prev) => !prev), []),
    onEscape: useCallback(() => undefined, []),
  });

  // Cmd+J → toggle AI chat panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        onAIChatToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onAIChatToggle]);

  // Listen for topbar button event
  useEffect(() => {
    const handler = () => setHelpOpen((prev) => !prev);
    window.addEventListener("pa:show-shortcuts-help", handler);
    return () => window.removeEventListener("pa:show-shortcuts-help", handler);
  }, []);

  const overlays = (
    <>
      <ShortcutsHelp
        locale={locale}
        onOpenChange={setHelpOpen}
        open={helpOpen}
      />
      <CommandPalette
        onOpenChange={setCmdPaletteOpen}
        open={cmdPaletteOpen}
        showTrigger={false}
      />
      {gPressed && (
        <div className="glass-float fade-in pointer-events-none fixed bottom-4 left-4 z-50 animate-in rounded-lg px-3 py-1.5 font-mono text-foreground text-sm">
          G…
        </div>
      )}
    </>
  );

  return { overlays };
}

function AdminShellV2({
  orgId,
  locale,
  role,
  children,
}: Omit<AdminShellProps, "onboardingProgress">) {
  const pathname = usePathname();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [backendDegraded, setBackendDegraded] = useState<{
    message: string;
    requestId?: string;
  } | null>(null);
  const degradedClearTimerRef = useRef<number | null>(null);

  const toggleAiPanel = useCallback(() => setAiPanelOpen((v) => !v), []);

  const { overlays } = useShellHotkeys(locale, toggleAiPanel);

  useEffect(() => {
    return onApiError(({ status, message, retryable, requestId }) => {
      const isTransient =
        retryable === true ||
        status === 502 ||
        status === 503 ||
        status === 504;
      if (!isTransient) return;

      setBackendDegraded({ message, requestId });

      if (degradedClearTimerRef.current !== null) {
        window.clearTimeout(degradedClearTimerRef.current);
      }
      degradedClearTimerRef.current = window.setTimeout(() => {
        setBackendDegraded(null);
        degradedClearTimerRef.current = null;
      }, 30_000);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (degradedClearTimerRef.current !== null) {
        window.clearTimeout(degradedClearTimerRef.current);
      }
    };
  }, []);

  // Close the mobile drawer on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    clearStalePageScrollLock();
    const handle = window.setTimeout(clearStalePageScrollLock, 120);
    return () => window.clearTimeout(handle);
  }, [pathname]);

  useEffect(() => {
    const onWindowFocus = () => clearStalePageScrollLock();
    const onPageShow = () => clearStalePageScrollLock();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        clearStalePageScrollLock();
      }
    };

    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const searchParams = useSearchParams();
  const isPreviewMode = searchParams.get("preview") === "1";

  if (isPreviewMode) {
    return (
      <div className="h-full w-full overflow-auto bg-background">
        <div className="mx-auto w-full max-w-screen-2xl p-3 sm:p-4 lg:p-5 xl:p-7">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full overflow-hidden bg-background">
      {/* Top navigation — always black */}
      <TopNav
        aiChatOpen={aiPanelOpen}
        locale={locale}
        onAIChatToggle={toggleAiPanel}
        onMobileMenuToggle={() => setIsMobileDrawerOpen((v) => !v)}
        orgId={orgId}
        role={role}
      />

      {/* Mobile drawer */}
      <TopNavMobileDrawer
        locale={locale}
        onOpenChange={setIsMobileDrawerOpen}
        open={isMobileDrawerOpen}
        orgId={orgId}
        role={role}
      />

      {/* AI chat panel */}
      <AIChatPanel
        locale={locale}
        onOpenChange={setAiPanelOpen}
        open={aiPanelOpen}
        orgId={orgId}
      />

      {/* Main content area — offset for fixed nav */}
      <div className="flex h-full min-h-0 flex-col pt-14">
        <TabProvider locale={locale}>
          {/* Breadcrumb sub-bar */}
          <div className="sticky top-14 z-20 flex items-center justify-between border-border/40 border-b bg-background px-4 py-2 lg:px-6">
            <AppBreadcrumbs locale={locale} />
            <SidebarQuickCreate locale={locale} />
          </div>

          <TabBar />

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="min-h-0 flex-1">
              {backendDegraded ? (
                <div className="mx-auto mt-3 w-full max-w-screen-2xl px-3 sm:px-4 lg:px-5 xl:px-7">
                  <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-amber-900 text-sm shadow-sm">
                    <div className="font-medium">
                      Backend degraded: retryable API failures detected
                    </div>
                    <div className="mt-0.5 truncate text-amber-800/90 text-xs">
                      {backendDegraded.message}
                    </div>
                    {backendDegraded.requestId ? (
                      <div className="mt-0.5 font-mono text-[11px] text-amber-800/80">
                        request_id: {backendDegraded.requestId}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="mx-auto w-full max-w-screen-2xl p-3 sm:p-4 lg:p-5 xl:p-7">
                {children}
              </div>
            </ScrollArea>
          </main>

          <AppFooter locale={locale} />
        </TabProvider>
      </div>

      {overlays}
    </div>
  );
}

export function AdminShell({ orgId, locale, role, children }: AdminShellProps) {
  return (
    <Suspense fallback={null}>
      <AdminShellV2 locale={locale} orgId={orgId} role={role}>
        {children}
      </AdminShellV2>
    </Suspense>
  );
}
