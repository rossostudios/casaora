"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  description,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  description?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const descriptionId = useId();
  const errorId = useId();

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        className="flex items-center gap-1 font-medium text-[13px] text-foreground/90"
        htmlFor={htmlFor}
      >
        <span>{label}</span>
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </label>
      {description ? (
        <p className="text-[12px] text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      ) : null}
      <div>{children}</div>
      {error ? (
        <p className="text-[12px] text-destructive" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FieldGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-4 md:grid-cols-2", className)}>{children}</div>;
}
