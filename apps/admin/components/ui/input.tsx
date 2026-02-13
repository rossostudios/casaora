import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm shadow-none transition-[border-color,box-shadow,background-color] file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground/85 focus-visible:border-ring/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        type={type}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
