"use client";

import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const Collapsible = BaseCollapsible.Root;
const CollapsibleTrigger = BaseCollapsible.Trigger;

type CollapsibleContentProps = ComponentPropsWithoutRef<
  typeof BaseCollapsible.Panel
>;

function CollapsibleContent({ className, ...props }: CollapsibleContentProps) {
  return (
    <BaseCollapsible.Panel
      className={(state) =>
        cn(
          "overflow-hidden transition-[height,opacity] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          state.open ? "opacity-100" : "opacity-0",
          className
        )
      }
      {...props}
    />
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
