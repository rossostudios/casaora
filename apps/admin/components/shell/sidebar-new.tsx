"use client";

import {
  AiVoiceGeneratorIcon,
  AuditIcon,
  Building01Icon,
  Calendar02Icon,
  CalendarCheckIn01Icon,
  Cancel01Icon,
  ChartIcon,
  Door01Icon,
  File01Icon,
  GridViewIcon,
  Home01Icon,
  InboxIcon,
  Invoice01Icon,
  Link01Icon,
  Message01Icon,
  Search01Icon,
  Settings03Icon,
  Share06Icon,
  SparklesIcon,
  Task01Icon,
  UserGroupIcon,
  WebhookIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NotificationBell } from "@/components/shell/notification-bell";
import { OrgSwitcher } from "@/components/shell/org-switcher";
import { SidebarAccount } from "@/components/shell/sidebar-account";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Drawer } from "@/components/ui/drawer";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import type { Locale } from "@/lib/i18n";
import { getModuleLabel, MODULE_BY_SLUG, MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<string, IconSvgElement> = {
  organizations: Building01Icon,
  properties: Home01Icon,
  units: Door01Icon,
  channels: Share06Icon,
  listings: Link01Icon,
  guests: UserGroupIcon,
  reservations: CalendarCheckIn01Icon,
  calendar: Calendar02Icon,
  tasks: Task01Icon,
  expenses: Invoice01Icon,
  "owner-statements": File01Icon,
  pricing: SparklesIcon,
  "marketplace-listings": Home01Icon,
  applications: UserGroupIcon,
  leases: File01Icon,
  collections: Invoice01Icon,
  "transparency-summary": ChartIcon,
  messaging: Message01Icon,
  "integration-events": WebhookIcon,
  "audit-logs": AuditIcon,
  reports: ChartIcon,
};

type ViewportMode = "desktop" | "tablet" | "mobile";

type SectionKey =
  | "workspace"
  | "leasing"
  | "operations"
  | "portfolio"
  | "finance"
  | "platform"
  | "other";

type PrimaryTabKey = "home" | "chat" | "inbox";

type RouteLinkDef = {
  href: string;
  icon: IconSvgElement;
  label: {
    "es-PY": string;
    "en-US": string;
  };
};

type SectionDef = {
  key: SectionKey;
  label: {
    "es-PY": string;
    "en-US": string;
  };
  routeLinks?: RouteLinkDef[];
  moduleSlugs: string[];
};

type ResolvedLink = {
  href: string;
  label: string;
  iconElement: IconSvgElement;
};

type ResolvedSection = {
  key: SectionKey;
  label: string;
  links: ResolvedLink[];
};

type OnboardingProgress = {
  completedSteps: number;
  totalSteps: number;
  percent: number;
};

const PRIMARY_TABS: Array<{
  key: PrimaryTabKey;
  href: string;
  icon: IconSvgElement;
  label: { "es-PY": string; "en-US": string };
}> = [
  {
    key: "home",
    href: "/app",
    icon: Home01Icon,
    label: { "es-PY": "Inicio", "en-US": "Home" },
  },
  {
    key: "chat",
    href: "/app/agent",
    icon: Message01Icon,
    label: { "es-PY": "Chat", "en-US": "Chat" },
  },
  {
    key: "inbox",
    href: "/module/messaging",
    icon: InboxIcon,
    label: { "es-PY": "Inbox", "en-US": "Inbox" },
  },
];

const CHAT_LINKS: RouteLinkDef[] = [
  {
    href: "/app/agent",
    icon: SparklesIcon,
    label: { "es-PY": "Agente de Operaciones", "en-US": "Operations Agent" },
  },
  {
    href: "/module/tasks?mine=1",
    icon: Task01Icon,
    label: { "es-PY": "Mis tareas", "en-US": "My tasks" },
  },
];

const INBOX_LINKS: RouteLinkDef[] = [
  {
    href: "/module/applications",
    icon: UserGroupIcon,
    label: { "es-PY": "Aplicaciones", "en-US": "Applications" },
  },
  {
    href: "/module/collections",
    icon: Invoice01Icon,
    label: { "es-PY": "Cobranzas", "en-US": "Collections" },
  },
  {
    href: "/module/tasks?mine=1",
    icon: Task01Icon,
    label: { "es-PY": "Cola personal", "en-US": "My queue" },
  },
];

const SECTIONS: SectionDef[] = [
  {
    key: "workspace",
    label: {
      "es-PY": "Inicio",
      "en-US": "Home",
    },
    routeLinks: [
      {
        href: "/setup",
        icon: Settings03Icon,
        label: {
          "es-PY": "Onboarding",
          "en-US": "Onboarding",
        },
      },
    ],
    moduleSlugs: [],
  },
  {
    key: "leasing",
    label: {
      "es-PY": "Leasing",
      "en-US": "Leasing",
    },
    moduleSlugs: ["marketplace-listings", "leases"],
  },
  {
    key: "operations",
    label: {
      "es-PY": "Operaciones",
      "en-US": "Operations",
    },
    moduleSlugs: ["tasks", "reservations", "calendar", "guests"],
  },
  {
    key: "portfolio",
    label: {
      "es-PY": "Portafolio",
      "en-US": "Portfolio",
    },
    moduleSlugs: ["properties", "units", "channels", "listings"],
  },
  {
    key: "finance",
    label: {
      "es-PY": "Finanzas",
      "en-US": "Finance",
    },
    moduleSlugs: ["expenses", "pricing", "reports"],
  },
  {
    key: "platform",
    label: {
      "es-PY": "Plataforma",
      "en-US": "Platform",
    },
    moduleSlugs: ["organizations", "integration-events", "audit-logs"],
  },
];

const COLLAPSED_SECTIONS_KEY = "pa-sidebar-collapsed-sections";
const APPLE_DEVICE_REGEX = /Mac|iPhone|iPad/i;
const HOME_TAB_HIDDEN_MODULE_SLUGS = new Set([
  "applications",
  "collections",
  "messaging",
  "owner-statements",
  "transparency-summary",
]);

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolvePrimaryTab(pathname: string): PrimaryTabKey {
  if (pathname.startsWith("/app/agent")) return "chat";
  if (pathname.startsWith("/module/messaging")) return "inbox";
  return "home";
}

function resolveModuleLink(slug: string, locale: Locale): ResolvedLink | null {
  const module = MODULE_BY_SLUG.get(slug);
  if (!module) return null;

  return {
    href: `/module/${module.slug}`,
    iconElement: MODULE_ICONS[module.slug] ?? GridViewIcon,
    label: getModuleLabel(module, locale),
  };
}

function resolveSections(locale: Locale): ResolvedSection[] {
  const resolved = SECTIONS.map((section) => {
    const routeLinks = (section.routeLinks ?? []).map((link) => ({
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
  }).filter((section) => section.links.length > 0);

  const knownSlugs = new Set(
    SECTIONS.flatMap((section) => section.moduleSlugs)
  );
  for (const hiddenSlug of HOME_TAB_HIDDEN_MODULE_SLUGS) {
    knownSlugs.add(hiddenSlug);
  }
  const extras = MODULES.filter((module) => !knownSlugs.has(module.slug));

  if (extras.length) {
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

function useCollapsedSections(): [Set<SectionKey>, (key: SectionKey) => void] {
  const [collapsed, setCollapsed] = useState<Set<SectionKey>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SectionKey[];
        if (Array.isArray(parsed)) {
          setCollapsed(new Set(parsed));
        }
      }
    } catch {
      // Ignore storage failures.
    }
  }, []);

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

function NavLinkRow({
  active,
  href,
  icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: IconSvgElement;
  label: string;
}) {
  return (
    <Link
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-[5px] transition-all duration-200 ease-in-out",
        active
          ? "bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-border/40"
          : "text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground"
      )}
      href={href}
    >
      <Icon
        className={cn(
          "shrink-0 transition-colors",
          active
            ? "text-primary"
            : "text-muted-foreground/60 group-hover:text-foreground/80"
        )}
        icon={icon}
        size={16}
      />
      <span className="truncate font-medium text-[13px] leading-5">
        {label}
      </span>
    </Link>
  );
}

function ShortcutBlock({
  label,
  links,
  locale,
  pathname,
}: {
  label: { "es-PY": string; "en-US": string };
  links: RouteLinkDef[];
  locale: Locale;
  pathname: string;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="px-2 font-medium text-[10px] text-muted-foreground/55 uppercase tracking-[0.08em]">
        {label[locale]}
      </h3>
      <div className="space-y-0.5">
        {links.map((link) => (
          <NavLinkRow
            active={isRouteActive(pathname, link.href)}
            href={link.href}
            icon={link.icon}
            key={link.href}
            label={link.label[locale]}
          />
        ))}
      </div>
    </section>
  );
}

function SidebarContent({
  locale,
  orgId,
  onboardingProgress,
}: {
  locale: Locale;
  orgId: string | null;
  onboardingProgress: OnboardingProgress;
}) {
  const pathname = usePathname();
  const activeTab = resolvePrimaryTab(pathname);
  const sections = useMemo(() => resolveSections(locale), [locale]);
  const [collapsedSections, toggleSection] = useCollapsedSections();
  const [onboardingHubClosed, setOnboardingHubClosed] = useState(false);
  const isEn = locale === "en-US";
  const completionPercent = Math.round(
    Math.max(0, Math.min(100, onboardingProgress.percent))
  );
  const onboardingCompleted = completionPercent >= 100;
  const showOnboardingHub =
    activeTab === "home" && !onboardingCompleted && !onboardingHubClosed;

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
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center px-4">
        <OrgSwitcher activeOrgId={orgId} locale={locale} />
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/70 p-1">
          <div className="flex min-w-0 flex-1 items-center gap-0.5">
            {PRIMARY_TABS.map((tab) => {
              const active = tab.key === activeTab;
              return (
                <Link
                  className={cn(
                    "inline-flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium text-[12px] transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground/75 hover:text-foreground"
                  )}
                  href={tab.href}
                  key={tab.key}
                >
                  <Icon icon={tab.icon} size={14} />
                  <span className="truncate">{tab.label[locale]}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            <button
              aria-label={isEn ? "Search" : "Buscar"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              onClick={openSearch}
              type="button"
            >
              <Icon icon={Search01Icon} size={15} />
            </button>
            <NotificationBell locale={locale} />
          </div>
        </div>
      </div>

      <div className="sidebar-scroll-mask flex-1 space-y-3 overflow-y-auto px-3 py-1.5">
        {activeTab === "chat" ? (
          <ShortcutBlock
            label={{ "es-PY": "Agentes", "en-US": "Agents" }}
            links={CHAT_LINKS}
            locale={locale}
            pathname={pathname}
          />
        ) : null}

        {activeTab === "inbox" ? (
          <ShortcutBlock
            label={{ "es-PY": "Bandejas", "en-US": "Inbox" }}
            links={INBOX_LINKS}
            locale={locale}
            pathname={pathname}
          />
        ) : null}

        {activeTab === "home" ? (
          <nav className="space-y-3">
            {sections.map((section) => {
              const isWorkspace = section.key === "workspace";
              const isCollapsed =
                !isWorkspace && collapsedSections.has(section.key);

              if (isWorkspace) {
                return (
                  <div className="space-y-2" key={section.key}>
                    <div className="space-y-0.5">
                      {section.links.map((link) => (
                        <NavLinkRow
                          active={isRouteActive(pathname, link.href)}
                          href={link.href}
                          icon={link.iconElement}
                          key={link.href}
                          label={link.label}
                        />
                      ))}
                    </div>
                    {showOnboardingHub ? (
                      <section className="rounded-xl border border-border/70 bg-background/80 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Icon
                              className="text-muted-foreground/80"
                              icon={Settings03Icon}
                              size={15}
                            />
                            <Link
                              className="truncate font-semibold text-[14px] text-foreground hover:underline"
                              href="/setup"
                            >
                              {isEn ? "Onboarding hub" : "Hub de onboarding"}
                            </Link>
                          </div>
                          <button
                            aria-label={
                              isEn
                                ? "Close onboarding hub"
                                : "Cerrar hub de onboarding"
                            }
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => setOnboardingHubClosed(true)}
                            type="button"
                          >
                            <Icon icon={Cancel01Icon} size={14} />
                          </button>
                        </div>
                        <Progress
                          aria-valuetext={`${completionPercent}%`}
                          className="mt-3 h-2.5 bg-muted/90"
                          value={completionPercent}
                        />
                        <p className="mt-2 font-medium text-[13px] text-foreground/85">
                          {isEn
                            ? `${completionPercent}% Completed`
                            : `${completionPercent}% completado`}
                        </p>
                      </section>
                    ) : null}
                  </div>
                );
              }

              return (
                <Collapsible
                  key={section.key}
                  onOpenChange={() => toggleSection(section.key)}
                  open={!isCollapsed}
                >
                  <CollapsibleTrigger className="group flex w-full items-center gap-1 px-2 pt-1 pb-1">
                    <svg
                      aria-hidden="true"
                      className={cn(
                        "h-3 w-3 shrink-0 text-muted-foreground/40 transition-transform duration-150",
                        isCollapsed ? "-rotate-90" : "rotate-0"
                      )}
                      fill="none"
                      focusable="false"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                    <span className="font-medium text-[10px] text-muted-foreground/50 uppercase tracking-[0.08em]">
                      {section.label}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-0.5 space-y-0.5">
                      {section.links.map((link) => (
                        <NavLinkRow
                          active={isRouteActive(pathname, link.href)}
                          href={link.href}
                          icon={link.iconElement}
                          key={link.href}
                          label={link.label}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>
        ) : null}
      </div>

      <div className="shrink-0 space-y-2 p-3 pt-0">
        <Link
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 font-medium text-[13px] text-foreground transition-colors hover:bg-muted"
          href="/app/agent?new=1"
        >
          <Icon icon={AiVoiceGeneratorIcon} size={14} />
          {isEn ? "New chat" : "Nuevo chat"}
        </Link>
        <SidebarAccount collapsed={false} locale={locale} />
      </div>
    </div>
  );
}

export function SidebarNew({
  locale,
  orgId,
  onboardingProgress,
  viewportMode,
  isMobileDrawerOpen,
  onMobileDrawerOpenChange,
}: {
  locale: Locale;
  orgId: string | null;
  onboardingProgress: OnboardingProgress;
  viewportMode: ViewportMode;
  isMobileDrawerOpen: boolean;
  onMobileDrawerOpenChange: (next: boolean) => void;
}) {
  const isDesktop = viewportMode === "desktop";

  if (isDesktop) {
    return (
      <aside className="h-full w-full min-w-0 shrink-0 border-border/60 border-r bg-muted/15">
        <SidebarContent
          locale={locale}
          onboardingProgress={onboardingProgress}
          orgId={orgId}
        />
      </aside>
    );
  }

  return (
    <Drawer
      className="w-[280px] p-0"
      closeLabel={locale === "en-US" ? "Close navigation" : "Cerrar navegación"}
      contentClassName="p-0"
      onOpenChange={onMobileDrawerOpenChange}
      open={isMobileDrawerOpen}
      side="left"
    >
      <div className="h-full bg-muted/15">
        <SidebarContent
          locale={locale}
          onboardingProgress={onboardingProgress}
          orgId={orgId}
        />
      </div>
    </Drawer>
  );
}
