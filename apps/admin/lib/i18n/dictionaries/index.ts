import type { Locale } from "@/lib/i18n";
import { en } from "./en";
import { es } from "./es";

const dictionaries = {
  "en-US": en,
  "es-PY": es,
};

export const getDictionary = (locale: Locale) => dictionaries[locale] ?? es;
