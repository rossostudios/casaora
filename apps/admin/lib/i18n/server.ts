import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
} from "@/lib/i18n";

export async function getActiveLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE_NAME)?.value;
  return normalizeLocale(raw) ?? DEFAULT_LOCALE;
}
