"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type ProgressProps = ComponentProps<typeof ProgressPrimitive.Root>;

export function Progress({ className, value, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Track className="h-full w-full">
        <ProgressPrimitive.Indicator className="h-full rounded-full bg-foreground transition-[width] duration-200 ease-out" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}
