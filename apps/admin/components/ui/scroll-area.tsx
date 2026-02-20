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

      <ScrollAreaPrimitive.Scrollbar className="hidden" orientation="vertical">
        <ScrollAreaPrimitive.Thumb />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  );
}
