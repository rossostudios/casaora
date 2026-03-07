"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";
import { useCallback, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { getModuleLabel, MODULE_BY_SLUG, MODULES } from "@/lib/modules";
import {
  COLLAPSED_SECTIONS_KEY,
  HOME_TAB_HIDDEN_MODULE_SLUGS,
  SECTIONS,
} from "./sidebar-constants";
import {
  type ChatAgentItem,
  type ChatSummaryItem,
  type MemberRole,
  MODULE_ICONS,
  type PrimaryTabKey,
  type ResolvedLink,
  type ResolvedSection,
  type SectionKey,
} from "./sidebar-types";

export function isRouteActive(
  pathname: string,
  search: string,
  href: string
): boolean {
  if (href === "/app") return pathname === "/app";

  const qIndex = href.indexOf("?");
  if (qIndex !== -1) {
    const hrefPath = href.slice(0, qIndex);
    const hrefParams = new URLSearchParams(href.slice(qIndex + 1));
    if (pathname !== hrefPath && !pathname.startsWith(`${hrefPath}/`))
      return false;
    const currentParams = new URLSearchParams(search);
    for (const [key, value] of hrefParams) {
      if (currentParams.get(key) !== value) return false;
    }
    return true;
  }

  if (pathname === href || pathname.startsWith(`${href}/`)) {
    const currentParams = new URLSearchParams(search);
    return !(
      currentParams.has("status") ||
      currentParams.has("segment") ||
      currentParams.has("source") ||
      currentParams.has("priority") ||
      currentParams.has("q")
    );
  }
  return false;
}

export function resolvePrimaryTab(pathname: string): PrimaryTabKey {
  if (
    pathname.startsWith("/app/agent") ||
    pathname.startsWith("/app/agents") ||
    pathname.startsWith("/app/chats") ||
    pathname.startsWith("/module/governance") ||
    pathname.startsWith("/module/agent-dashboard") ||
    pathname.startsWith("/module/knowledge")
  ) {
    return "ai";
  }
  if (
    pathname.startsWith("/module/action-center") ||
    pathname.startsWith("/module/messaging") ||
    pathname.startsWith("/module/notifications") ||
    pathname.startsWith("/module/notification-rules")
  ) {
    return "conversations";
  }
  if (
    pathname.startsWith("/module/applications") ||
    pathname.startsWith("/module/listings") ||
    pathname.startsWith("/module/leases") ||
    pathname.startsWith("/module/reservations") ||
    pathname.startsWith("/module/calendar") ||
    pathname.startsWith("/module/reviews")
  ) {
    return "leasing";
  }
  if (
    pathname.startsWith("/module/operations") ||
    pathname.startsWith("/module/maintenance") ||
    pathname.startsWith("/module/tasks") ||
    pathname.startsWith("/module/guests")
  ) {
    return "operations";
  }
  if (
    pathname.startsWith("/module/reports") ||
    pathname.startsWith("/module/expenses") ||
    pathname.startsWith("/module/collections") ||
    pathname.startsWith("/module/owner-statements") ||
    pathname.startsWith("/module/billing")
  ) {
    return "finance";
  }
  if (
    pathname.startsWith("/app/portfolio") ||
    pathname.startsWith("/module/properties") ||
    pathname.startsWith("/module/units") ||
    pathname.startsWith("/module/integrations")
  ) {
    return "portfolio";
  }
  return "today";
}

function resolveModuleLink(slug: string, locale: Locale): ResolvedLink | null {
  const module = MODULE_BY_SLUG.get(slug);
  if (!module) return null;

  return {
    href: `/module/${module.slug}`,
    iconElement: MODULE_ICONS[module.slug] ?? SparklesIcon,
    label: getModuleLabel(module, locale),
  };
}

export function resolveSections(
  locale: Locale,
  role?: MemberRole | null,
  sectionKeys?: SectionKey[]
): ResolvedSection[] {
  const visibleSections = role
    ? SECTIONS.filter((s) => !s.roles || s.roles.includes(role))
    : SECTIONS;
  const filteredSections =
    sectionKeys && sectionKeys.length > 0
      ? visibleSections.filter((section) => sectionKeys.includes(section.key))
      : visibleSections;

  const resolved = filteredSections
    .map((section) => {
      const routeLinks = (section.routeLinks ?? [])
        .filter((link) =>
          link.roles ? (role ? link.roles.includes(role) : false) : true
        )
        .map((link) => ({
          href: link.href,
          iconElement: link.icon,
          label: link.label[locale],
        }));

      const moduleLinks = section.moduleSlugs
        .map((slug) => resolveModuleLink(slug, locale))
        .filter((item): item is ResolvedLink => Boolean(item));

      return {
        key: section.key,
        label: section.label[locale],
        links: [...routeLinks, ...moduleLinks],
      } satisfies ResolvedSection;
    })
    .filter((section) => section.links.length > 0);

  const knownSlugs = new Set(
    SECTIONS.flatMap((section) => section.moduleSlugs)
  );
  for (const hiddenSlug of HOME_TAB_HIDDEN_MODULE_SLUGS) {
    knownSlugs.add(hiddenSlug);
  }
  const extras = MODULES.filter((module) => !knownSlugs.has(module.slug));

  if (!sectionKeys && extras.length && (!role || role === "owner_admin")) {
    resolved.push({
      key: "other",
      label: locale === "en-US" ? "Other" : "Otros",
      links: extras.map((module) => ({
        href: `/module/${module.slug}`,
        iconElement: MODULE_ICONS[module.slug] ?? SparklesIcon,
        label: getModuleLabel(module, locale),
      })),
    });
  }

  return resolved;
}

function readCollapsedFromStorage(): Set<SectionKey> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SectionKey[];
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore storage failures.
  }
  return new Set();
}

export function useCollapsedSections(): [
  Set<SectionKey>,
  (key: SectionKey) => void,
] {
  const [collapsed, setCollapsed] = useState<Set<SectionKey>>(
    readCollapsedFromStorage
  );

  const toggle = useCallback((key: SectionKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      try {
        localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...next]));
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }, []);

  return [collapsed, toggle];
}

export function normalizeAgentItems(payload: unknown): ChatAgentItem[] {
  if (!payload || typeof payload !== "object") return [];
  const rows = (payload as { data?: unknown[] }).data;
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row): row is Record<string, unknown> =>
      Boolean(row && typeof row === "object")
    )
    .map((row) => ({
      id: String(row.id ?? ""),
      slug: String(row.slug ?? ""),
      name: String(row.name ?? ""),
    }))
    .filter((row) => row.id && row.slug && row.name);
}

export function normalizeChatItems(payload: unknown): ChatSummaryItem[] {
  if (!payload || typeof payload !== "object") return [];
  const rows = (payload as { data?: unknown[] }).data;
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row): row is Record<string, unknown> =>
      Boolean(row && typeof row === "object")
    )
    .map((row) => ({
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      is_archived: Boolean(row.is_archived),
      latest_message_preview:
        typeof row.latest_message_preview === "string"
          ? row.latest_message_preview
          : null,
    }))
    .filter((row) => row.id && row.title);
}
