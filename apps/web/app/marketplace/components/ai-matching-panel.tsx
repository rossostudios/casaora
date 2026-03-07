"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS_EN = [
  "2 bedroom apartment in Asunción",
  "Furnished studio under ₲2M",
  "House with garden and parking",
  "Pet-friendly near downtown",
];

const SUGGESTIONS_ES = [
  "Depto 2 hab en Asunción",
  "Monoambiente amoblado bajo ₲2M",
  "Casa con jardín y estacionamiento",
  "Pet-friendly cerca del centro",
];

export function AiMatchingPanel({ isEn }: { isEn: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const suggestions = isEn ? SUGGESTIONS_EN : SUGGESTIONS_ES;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/marketplace?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleSuggestion(suggestion: string) {
    router.push(`/marketplace?q=${encodeURIComponent(suggestion)}`);
  }

  return (
    <section className="rounded-2xl bg-[var(--marketplace-ai-surface)] px-6 py-14 text-center sm:px-10 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--marketplace-ai-accent)]/10 px-3.5 py-1.5">
          <Sparkles className="size-3.5 text-[var(--marketplace-ai-accent)]" />
          <span className="font-semibold text-[var(--marketplace-ai-accent)] text-xs">
            {isEn ? "AI-powered" : "Con IA"}
          </span>
        </div>

        <h2 className="font-medium font-serif text-3xl text-[var(--marketplace-text)] tracking-tight sm:text-4xl">
          {isEn
            ? "Let AI find your ideal home"
            : "Dejá que la IA encuentre tu hogar ideal"}
        </h2>
        <p className="mt-3 text-[var(--marketplace-text-muted)]">
          {isEn
            ? "Describe what you're looking for and our AI will match you with the best options."
            : "Describe lo que buscás y nuestra IA te conectará con las mejores opciones."}
        </p>

        <form className="mt-8" onSubmit={handleSubmit}>
          <textarea
            className="h-24 w-full resize-none rounded-xl border border-[var(--marketplace-text)]/8 bg-white/80 p-4 text-[var(--marketplace-text)] shadow-sm backdrop-blur-sm transition-all placeholder:text-[var(--marketplace-text-muted)]/40 focus:border-primary/20 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/8 sm:text-lg"
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isEn
                ? "I want a quiet apartment near downtown with a balcony and parking..."
                : "Quiero un departamento tranquilo cerca del centro con balcón y estacionamiento..."
            }
            value={query}
          />
          <button
            className="mt-4 inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--marketplace-text)] px-8 font-medium text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
            type="submit"
          >
            <Sparkles className="size-4" />
            {isEn ? "Find with AI" : "Buscar con IA"}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <span className="text-[var(--marketplace-text-muted)] text-xs">
            {isEn ? "Try:" : "Prueba:"}
          </span>
          {suggestions.map((suggestion) => (
            <button
              className="rounded-full border border-[var(--marketplace-text)]/8 px-3 py-1 font-medium text-[var(--marketplace-text-muted)] text-xs transition-all hover:border-[var(--marketplace-text)]/20 hover:text-[var(--marketplace-text)]"
              key={suggestion}
              onClick={() => handleSuggestion(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
