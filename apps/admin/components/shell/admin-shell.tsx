"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import type { Locale } from "@/lib/i18n";

type AdminShellProps = {
  orgId: string | null;
  locale: Locale;
  children: ReactNode;
};

const STORAGE_KEY = "pa-sidebar-collapsed";

export function AdminShell({ orgId, locale, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
      if (stored === "false") setCollapsed(false);
    } catch {
      // Ignore storage failures (private mode / blocked).
    }
  }, []);

  const setAndPersist = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  return (
    <div className="flex h-full">
      <Sidebar
        collapsed={collapsed}
        locale={locale}
        onCollapsedChange={setAndPersist}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar locale={locale} orgId={orgId} />
        <main className="min-h-0 min-w-0 flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
