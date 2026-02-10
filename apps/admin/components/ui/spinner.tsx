import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
} as const;

export type SpinnerProps = SVGProps<SVGSVGElement> & {
  size?: keyof typeof SIZE_CLASS;
};

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  const ariaLabel =
    typeof props["aria-label"] === "string" ? props["aria-label"] : undefined;

  return (
    <svg
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={cn("animate-spin text-primary", SIZE_CLASS[size], className)}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      {...props}
    >
      <title>{ariaLabel ?? "Cargando"}</title>
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 018-8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}
