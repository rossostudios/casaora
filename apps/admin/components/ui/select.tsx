import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select
      className={cn(
        "flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm shadow-none transition-[border-color,box-shadow,background-color] focus-visible:border-ring/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Select.displayName = "Select";

export { Select };
