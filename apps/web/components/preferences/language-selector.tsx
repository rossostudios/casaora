"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { LOCALE_STORAGE_KEY, type Locale, localeLabel } from "@/lib/i18n";
import { dispatchLocaleChange, useActiveLocale } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }

  try {
    document.documentElement.lang = locale;
  } catch {
    // ignore
  }
  dispatchLocaleChange(locale);
}

type LanguageSelectorProps = {
  className?: string;
};

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const router = useRouter();
  const locale = useActiveLocale();
  const [, startRefresh] = useTransition();

  const isEn = locale === "en-US";

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Locale;
    if (next === locale) return;

    const previous = locale;
    persistLocale(next);

    const nextIsEn = next === "en-US";
    const successTitle = nextIsEn ? "Language updated" : "Idioma actualizado";
    const errorTitle = isEn
      ? "Could not update language"
      : "No se pudo actualizar el idioma";

    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ locale: next }),
      });

      if (!response.ok) {
        persistLocale(previous);
        toast.error(errorTitle);
        return;
      }

      toast.success(successTitle, { description: localeLabel(next) });
      startRefresh(() => {
        router.refresh();
      });
    } catch {
      persistLocale(previous);
      toast.error(errorTitle);
    }
  };

  return (
    <select
      aria-label={isEn ? "Select language" : "Seleccionar idioma"}
      className={cn(
        "inline-flex items-center rounded-xl border border-[#e8e4df] bg-transparent px-2 py-1.5 text-sm outline-none",
        className
      )}
      onChange={handleChange}
      value={locale}
    >
      <option value="en-US">English (US)</option>
      <option value="es-PY">Español (PY)</option>
    </select>
  );
}
