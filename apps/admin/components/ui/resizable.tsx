"use client";

import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <Group
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  );
}

const ResizablePanel = Panel;

function ResizableHandle({
  className,
  withHandle,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) {
  return (
    <Separator
      className={cn(
        "group relative flex w-2 shrink-0 touch-none items-center justify-center bg-transparent outline-none",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border/65",
        "hover:after:bg-primary/45 focus-visible:after:bg-primary/70",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 hidden h-9 w-[5px] rounded-full border border-border/60 bg-background/90 transition-colors group-hover:border-primary/45 group-hover:bg-background lg:block" />
      ) : null}
    </Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
