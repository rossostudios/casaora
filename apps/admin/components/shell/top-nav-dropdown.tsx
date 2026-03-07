"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ResolvedSection } from "@/components/shell/sidebar-types";
import { isRouteActive } from "@/components/shell/sidebar-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type TopNavDropdownProps = {
  section: ResolvedSection;
  isActive: boolean;
};

export function TopNavDropdown({ section, isActive }: TopNavDropdownProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  if (section.links.length === 1) {
    const link = section.links[0];
    return (
      <Link
        className={cn(
          "flex h-14 items-center px-3 font-medium text-sm text-white/70 transition-colors hover:text-white",
          isActive && "border-white border-b-2 text-white"
        )}
        href={link.href}
      >
        {section.label}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-14 items-center gap-1 px-3 font-medium text-sm text-white/70 outline-none transition-colors hover:text-white",
          isActive && "border-white border-b-2 text-white"
        )}
      >
        {section.label}
        <svg
          aria-hidden="true"
          className="h-3 w-3 opacity-60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M6 9l6 6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[180px]"
        sideOffset={0}
      >
        {section.links.map((link) => {
          const active = isRouteActive(pathname, search, link.href);
          return (
            <DropdownMenuItem key={link.href}>
              <Link
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                  active && "font-medium"
                )}
                href={link.href}
              >
                <Icon
                  className="text-muted-foreground"
                  icon={link.iconElement}
                  size={15}
                />
                {link.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
