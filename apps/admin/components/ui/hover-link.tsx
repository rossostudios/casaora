"use client";

import { ExternalLink } from "@hugeicons/core-free-icons";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Icon } from "@/components/ui/icon";
import { useActiveLocale } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type HoverLinkProps = {
  href: string;
  label: string;
  description?: string;
  meta?: string;
  id?: string;
  className?: string;
  prefetch?: boolean;
  children?: ReactNode;
};

export function HoverLink({
  href,
  label,
  description,
  meta,
  id,
  className,
  prefetch = false,
  children,
}: HoverLinkProps) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  return (
    <HoverCard closeDelay={80} openDelay={250}>
      <HoverCardTrigger asChild>
        <Link className={className} href={href} prefetch={prefetch}>
          {children ?? label}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="space-y-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
              {label}
            </p>
            {meta ? (
              <Badge className="text-[11px]" variant="secondary">
                {meta}
              </Badge>
            ) : null}
          </div>
          {description ? (
            <p className="text-muted-foreground text-xs">{description}</p>
          ) : null}
          {id ? (
            <p
              className="truncate font-mono text-[11px] text-muted-foreground"
              title={id}
            >
              {id}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-2"
            )}
            href={href}
            prefetch={prefetch}
          >
            <Icon icon={ExternalLink} size={14} />
            {isEn ? "Open" : "Abrir"}
          </Link>
          {id ? (
            <CopyButton
              className="h-8"
              label={isEn ? "Copy ID" : "Copiar ID"}
              value={id}
            />
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
