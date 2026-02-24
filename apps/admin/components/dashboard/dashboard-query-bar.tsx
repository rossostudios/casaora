"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type DashboardQueryBarProps = {
  isEn: boolean;
};

export function DashboardQueryBar({ isEn }: DashboardQueryBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      router.push(
        `/app/agents?q=${encodeURIComponent(trimmed)}`
      );
    },
    [query, router]
  );

  return (
    <form
      className={cn(
        "glass-float relative flex items-center gap-3 rounded-2xl border border-border/40 px-4 py-3",
        "transition-all duration-200",
        "focus-within:border-[var(--sidebar-primary)]/30 focus-within:shadow-sm"
      )}
      onSubmit={handleSubmit}
    >
      <Icon
        className="h-4 w-4 shrink-0 text-[var(--sidebar-primary)]/60"
        icon={SparklesIcon}
      />
      <input
        className="w-full bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          isEn
            ? "Ask about your portfolio..."
            : "Pregunta sobre tu portafolio..."
        }
        type="text"
        value={query}
      />
      {query.trim() ? (
        <span className="shrink-0 text-[11px] text-muted-foreground/40">
          {isEn ? "Enter to ask" : "Enter para preguntar"}
        </span>
      ) : null}
    </form>
  );
}
