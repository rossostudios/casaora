"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export type IconProps = ComponentPropsWithoutRef<typeof HugeiconsIcon> & {
  icon: IconSvgElement;
};

export function Icon({ className, ...props }: IconProps) {
  return (
    <HugeiconsIcon
      className={cn("shrink-0", className)}
      color="currentColor"
      strokeWidth={1.5}
      {...props}
    />
  );
}
