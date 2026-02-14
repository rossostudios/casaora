"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type ScrollAreaProps = ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.Root
> & {
  contentClassName?: string;
  viewportClassName?: string;
  withHorizontalScrollbar?: boolean;
};

export function ScrollArea({
  children,
  className,
  contentClassName,
  viewportClassName,
  withHorizontalScrollbar = false,
  ...props
}: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        className={cn(
          "h-full min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-contain",
          viewportClassName
        )}
      >
        <ScrollAreaPrimitive.Content
          className={cn("min-h-full", contentClassName)}
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>

      <ScrollAreaPrimitive.Scrollbar
        className="flex w-2.5 touch-none p-0.5 transition-colors data-[hovering]:bg-muted/60"
        orientation="vertical"
      >
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border/80" />
      </ScrollAreaPrimitive.Scrollbar>

      {withHorizontalScrollbar ? (
        <ScrollAreaPrimitive.Scrollbar
          className="flex h-2.5 touch-none p-0.5 transition-colors data-[hovering]:bg-muted/60"
          orientation="horizontal"
        >
          <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border/80" />
        </ScrollAreaPrimitive.Scrollbar>
      ) : null}

      <ScrollAreaPrimitive.Corner className="bg-muted/70" />
    </ScrollAreaPrimitive.Root>
  );
}
