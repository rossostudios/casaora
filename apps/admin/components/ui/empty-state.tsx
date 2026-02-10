"use client";

import type { IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: IconSvgElement;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 text-center",
        className
      )}
    >
      {icon ? (
        <div className="rounded-full border bg-muted/30 p-3">
          <Icon className="text-muted-foreground" icon={icon} size={22} />
        </div>
      ) : null}

      <div className="mx-auto max-w-sm space-y-1">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>

      {action ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}
