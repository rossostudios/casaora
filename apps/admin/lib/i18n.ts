export type Locale = "es-PY" | "en-US";

export const DEFAULT_LOCALE: Locale = "es-PY";

export const LOCALE_COOKIE_NAME = "pa-locale";
export const LOCALE_STORAGE_KEY = "pa-locale";

export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "es" || trimmed === "es-PY") return "es-PY";
  if (trimmed === "en" || trimmed === "en-US") return "en-US";
  return null;
}

export function localeLabel(locale: Locale): string {
  return locale === "en-US" ? "English" : "Español (Paraguay)";
}
