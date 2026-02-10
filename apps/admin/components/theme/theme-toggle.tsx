"use client";

import { Moon01Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";
import { useActiveLocale } from "@/lib/i18n/client";

type Theme = "light" | "dark";

const STORAGE_KEY = "pa-theme";

function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

function getSystemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

type ThemeToggleProps = {
  locale?: Locale;
};

export function ThemeToggle({ locale: localeProp }: ThemeToggleProps) {
  const activeLocale = useActiveLocale();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setMounted(true);
    const initial = getStoredTheme() ?? getSystemTheme();
    applyTheme(initial);
    setTheme(initial);
  }, []);

  // Use the server-provided locale for SSR + hydration to avoid mismatches.
  // After mount, prefer the active locale (storage/context) so toggles feel instant.
  const locale = mounted ? activeLocale : (localeProp ?? activeLocale);
  const isEn = locale === "en-US";

  const toggle = () => {
    const next: Theme =
      (theme ?? getSystemTheme()) === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    setTheme(next);
  };

  const icon = (theme ?? "dark") === "dark" ? Moon01Icon : Sun01Icon;
  const label =
    (theme ?? "dark") === "dark"
      ? isEn
        ? "Dark mode"
        : "Modo oscuro"
      : isEn
        ? "Light mode"
        : "Modo claro";

  return (
    <Button
      aria-label={isEn ? "Toggle theme" : "Cambiar tema"}
      onClick={toggle}
      size="icon"
      title={label}
      variant="outline"
    >
      <Icon icon={icon} size={18} />
    </Button>
  );
}
