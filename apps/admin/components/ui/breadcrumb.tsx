import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function Breadcrumb({
  className,
  ...props
}: ComponentPropsWithoutRef<"nav">) {
  return (
    <nav
      aria-label="breadcrumb"
      className={cn("min-w-0", className)}
      {...props}
    />
  );
}

export function BreadcrumbList({
  className,
  ...props
}: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5 text-muted-foreground text-xs",
        className
      )}
      {...props}
    />
  );
}

export function BreadcrumbItem({
  className,
  ...props
}: ComponentPropsWithoutRef<"li">) {
  return (
    <li
      className={cn("inline-flex min-w-0 items-center gap-1.5", className)}
      {...props}
    />
  );
}

export function BreadcrumbLink({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      className={cn(
        "truncate transition-colors hover:text-foreground hover:underline hover:underline-offset-4",
        className
      )}
      {...props}
    />
  );
}

export function BreadcrumbPage({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn("truncate font-medium text-foreground", className)}
      {...props}
    />
  );
}

export function BreadcrumbSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn("text-muted-foreground/60", className)}
      {...props}
    >
      <Icon icon={ArrowRight01Icon} size={14} />
    </span>
  );
}
