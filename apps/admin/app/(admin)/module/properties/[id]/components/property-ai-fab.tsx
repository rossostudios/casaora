"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { PropertyAiChatSheet } from "./property-ai-chat-sheet";

type PropertyAiFabProps = {
  orgId: string;
  propertyId: string;
  propertyName: string;
  propertyCode?: string;
  propertyAddress?: string;
  occupancyRate?: number | null;
  unitCount?: number;
  isEn: boolean;
};

const SUGGESTIONS_EN = [
  "Why is this unit vacant?",
  "What rent should I charge?",
  "Forecast next month revenue",
  "Summarize this property",
];

const SUGGESTIONS_ES = [
  "¿Por qué está vacante esta unidad?",
  "¿Qué renta debería cobrar?",
  "Pronosticar ingresos del próximo mes",
  "Resumen de esta propiedad",
];

export function PropertyAiFab({
  orgId,
  propertyId,
  propertyName,
  propertyCode,
  propertyAddress,
  occupancyRate,
  unitCount,
  isEn,
}: PropertyAiFabProps) {
  const [open, setOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(
    undefined
  );

  const handleFabClick = useCallback(() => {
    if (showSuggestions) {
      // Second click: open empty chat
      setShowSuggestions(false);
      setInitialPrompt(undefined);
      setOpen(true);
    } else if (!open) {
      // First click: show suggestions
      setShowSuggestions(true);
    } else {
      // Chat is open, toggle it
      setOpen(false);
    }
  }, [showSuggestions, open]);

  const handleSelectSuggestion = useCallback((prompt: string) => {
    setShowSuggestions(false);
    setInitialPrompt(prompt);
    setOpen(true);
  }, []);

  // Close suggestions on outside click (Escape)
  useEffect(() => {
    if (!showSuggestions) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSuggestions(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSuggestions]);

  // Keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "a"
      ) {
        e.preventDefault();
        setOpen((prev) => !prev);
        setShowSuggestions(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reset initialPrompt after opening
  useEffect(() => {
    if (!open) {
      setInitialPrompt(undefined);
    }
  }, [open]);

  const suggestions = isEn ? SUGGESTIONS_EN : SUGGESTIONS_ES;

  return (
    <>
      {/* Suggestion overlay */}
      {showSuggestions && (
        <div className="fixed right-6 bottom-24 z-40 w-64 space-y-1.5 rounded-xl border border-border/60 bg-card p-2 shadow-lg">
          {suggestions.map((s) => (
            <button
              className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted/50"
              key={s}
              onClick={() => handleSelectSuggestion(s)}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <button
        aria-label={isEn ? "Ask AI" : "Preguntar a IA"}
        className={cn(
          "fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-casaora-gradient text-white shadow-casaora",
          "transition-all duration-200 hover:scale-105 hover:shadow-lg",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        )}
        onClick={handleFabClick}
        title={isEn ? "Ask AI (⌘⇧A)" : "Preguntar a IA (⌘⇧A)"}
        type="button"
      >
        <Icon className="h-6 w-6" icon={SparklesIcon} />
      </button>

      <PropertyAiChatSheet
        initialPrompt={initialPrompt}
        isEn={isEn}
        occupancyRate={occupancyRate}
        onOpenChange={setOpen}
        open={open}
        orgId={orgId}
        propertyAddress={propertyAddress}
        propertyCode={propertyCode}
        propertyId={propertyId}
        propertyName={propertyName}
        unitCount={unitCount}
      />
    </>
  );
}
