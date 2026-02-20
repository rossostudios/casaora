"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  locale?: "es-PY" | "en-US";
  allowClear?: boolean;
};

export function DatePicker({
  value,
  defaultValue,
  onValueChange,
  name,
  id,
  className,
  disabled = false,
  min,
  max,
}: DatePickerProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const resolvedValue = isControlled ? value : internalValue;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  }

  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-xl border border-input bg-background/90 px-3 py-1.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      disabled={disabled}
      id={id}
      max={max}
      min={min}
      name={name}
      onChange={handleChange}
      type="date"
      value={resolvedValue}
    />
  );
}
