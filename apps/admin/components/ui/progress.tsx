"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type ProgressProps = ComponentProps<typeof ProgressPrimitive.Root>;

export function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: ProgressProps & { indicatorClassName?: string }) {
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
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full rounded-full bg-foreground transition-[width] duration-200 ease-out",
            indicatorClassName
          )}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}
