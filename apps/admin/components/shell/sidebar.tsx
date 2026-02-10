"use client";

import {
  AuditIcon,
  Building01Icon,
  Calendar02Icon,
  CalendarCheckIn01Icon,
  ChartIcon,
  Door01Icon,
  File01Icon,
  GridViewIcon,
  Home01Icon,
  Invoice01Icon,
  Link01Icon,
  Menu01Icon,
  MenuCollapseIcon,
  Message01Icon,
  Share06Icon,
  SparklesIcon,
  Task01Icon,
  UserGroupIcon,
  WebhookIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarAccount } from "@/components/shell/sidebar-account";
import { SidebarShortcuts } from "@/components/shell/sidebar-shortcuts";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
  messaging: Message01Icon,
  "integration-events": WebhookIcon,
  "audit-logs": AuditIcon,
  reports: ChartIcon,
};

type GroupKey = "portfolio" | "operations" | "finance" | "system";

const GROUPS: { key: GroupKey; slugs: string[] }[] = [
  {
    key: "portfolio",
    slugs: ["organizations", "properties", "units", "channels", "listings"],
  },
  {
    key: "operations",
    slugs: ["reservations", "calendar", "tasks", "guests", "messaging"],
  },
  {
    key: "finance",
    slugs: ["expenses", "owner-statements", "reports"],
  },
  {
    key: "system",
    slugs: ["integration-events", "audit-logs"],
  },
];

const GROUP_LABELS: Record<Locale, Record<GroupKey, string>> = {
  "es-PY": {
    portfolio: "Portafolio",
    operations: "Operaciones",
    finance: "Finanzas",
    system: "Sistema",
  },
  "en-US": {
    portfolio: "Portfolio",
    operations: "Operations",
    finance: "Finance",
    system: "System",
  },
};

function NavLink({
  href,
  active,
  icon,
  children,
  collapsed,
}: {
  href: string;
  active: boolean;
  icon?: IconSvgElement;
  children: React.ReactNode;
  collapsed: boolean;
}) {
  return (
    <Link
      aria-label={typeof children === "string" ? children : undefined}
      className={cn(
        buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }),
        collapsed
          ? "w-full justify-center px-2 font-normal"
          : "w-full justify-start gap-2 px-2 font-normal"
      )}
      href={href}
      title={typeof children === "string" ? children : undefined}
    >
      {icon ? (
        <Icon className="text-muted-foreground" icon={icon} size={16} />
      ) : null}
      <span className={cn("truncate", collapsed ? "sr-only" : "")}>
        {children}
      </span>
    </Link>
  );
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  locale,
}: {
  collapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
  locale: Locale;
}) {
  const pathname = usePathname();
  const isEn = locale === "en-US";

  const groupedSlugs = new Set(GROUPS.flatMap((group) => group.slugs));
  const extraModules = MODULES.filter(
    (module) => !groupedSlugs.has(module.slug)
  );

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r bg-sidebar py-4 text-sidebar-foreground transition-[width,padding] duration-200 ease-out",
        collapsed ? "w-[72px] px-2" : "w-[260px] px-3"
      )}
    >
      <div
        className={cn(
          "mb-4 flex items-center gap-3 rounded-lg border border-sidebar-border bg-background/70 px-3 py-2.5",
          collapsed ? "justify-center px-2" : ""
        )}
      >
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon icon={Building01Icon} size={16} />
        </div>
        <div className={cn("min-w-0 flex-1", collapsed ? "sr-only" : "")}>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Puerta Abierta
          </p>
        </div>
        <button
          aria-label={
            collapsed
              ? isEn
                ? "Expand sidebar"
                : "Expandir barra lateral"
              : isEn
                ? "Collapse sidebar"
                : "Colapsar barra lateral"
          }
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-9 w-9"
          )}
          onClick={() => onCollapsedChange(!collapsed)}
          title={
            collapsed
              ? isEn
                ? "Expand sidebar"
                : "Expandir barra lateral"
              : isEn
                ? "Collapse sidebar"
                : "Colapsar barra lateral"
          }
          type="button"
        >
          <Icon
            className="text-muted-foreground"
            icon={collapsed ? Menu01Icon : MenuCollapseIcon}
            size={18}
          />
        </button>
      </div>

      <nav
        className={cn(
          "min-h-0 flex-1 space-y-5 overflow-hidden",
          collapsed ? "px-0" : ""
        )}
      >
        <div className="space-y-1">
          <p
            className={cn(
              "px-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wide",
              collapsed ? "sr-only" : ""
            )}
          >
            {isEn ? "Workspace" : "Espacio de trabajo"}
          </p>
          <NavLink
            active={pathname === "/"}
            collapsed={collapsed}
            href="/"
            icon={GridViewIcon}
          >
            {isEn ? "Dashboard" : "Panel"}
          </NavLink>
          <NavLink
            active={pathname.startsWith("/setup")}
            collapsed={collapsed}
            href="/setup"
            icon={SparklesIcon}
          >
            {isEn ? "Setup" : "Configuración"}
          </NavLink>
        </div>

        <SidebarShortcuts collapsed={collapsed} locale={locale} />

        {GROUPS.map((group) => (
          <div className="space-y-1" key={group.key}>
            <p
              className={cn(
                "px-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wide",
                collapsed ? "sr-only" : ""
              )}
            >
              {GROUP_LABELS[locale][group.key] ?? group.key}
            </p>
            {group.slugs
              .map((slug) => MODULE_BY_SLUG.get(slug))
              .filter((module): module is NonNullable<typeof module> =>
                Boolean(module)
              )
              .map((module) => {
                const href = `/module/${module.slug}`;
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                const Icon = MODULE_ICONS[module.slug];
                return (
                  <NavLink
                    active={active}
                    collapsed={collapsed}
                    href={href}
                    icon={Icon}
                    key={module.slug}
                  >
                    {getModuleLabel(module, locale)}
                  </NavLink>
                );
              })}
          </div>
        ))}

        {extraModules.length ? (
          <div className="space-y-1">
            <p
              className={cn(
                "px-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wide",
                collapsed ? "sr-only" : ""
              )}
            >
              {isEn ? "More" : "Más"}
            </p>
            {extraModules.map((module) => {
              const href = `/module/${module.slug}`;
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              const Icon = MODULE_ICONS[module.slug];
              return (
                <NavLink
                  active={active}
                  collapsed={collapsed}
                  href={href}
                  icon={Icon}
                  key={module.slug}
                >
                  {getModuleLabel(module, locale)}
                </NavLink>
              );
            })}
          </div>
        ) : null}
      </nav>

      <SidebarAccount collapsed={collapsed} locale={locale} />
    </aside>
  );
}
