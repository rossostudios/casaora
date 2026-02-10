"use client";

export type ShortcutItem = {
  href: string;
  label: string;
  meta?: string;
  at: number; // epoch ms
};

const RECENTS_KEY = "pa-recents";
const PINS_KEY = "pa-pins";
const MAX_RECENTS = 16;
const MAX_PINS = 16;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function notify() {
  window.dispatchEvent(new Event("pa:shortcuts"));
}

export function getRecents(): ShortcutItem[] {
  const parsed = safeParse<ShortcutItem[]>(localStorage.getItem(RECENTS_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

export function getPins(): ShortcutItem[] {
  const parsed = safeParse<ShortcutItem[]>(localStorage.getItem(PINS_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

export function addRecent(item: Omit<ShortcutItem, "at"> & { at?: number }) {
  const next: ShortcutItem = { ...item, at: item.at ?? Date.now() };
  const existing = getRecents().filter((it) => it.href !== next.href);
  existing.unshift(next);
  localStorage.setItem(
    RECENTS_KEY,
    JSON.stringify(existing.slice(0, MAX_RECENTS))
  );
  notify();
}

export function togglePin(item: Omit<ShortcutItem, "at"> & { at?: number }): {
  pinned: boolean;
} {
  const next: ShortcutItem = { ...item, at: item.at ?? Date.now() };
  const pins = getPins();
  const exists = pins.some((it) => it.href === next.href);
  const updated = exists
    ? pins.filter((it) => it.href !== next.href)
    : [next, ...pins].slice(0, MAX_PINS);
  localStorage.setItem(PINS_KEY, JSON.stringify(updated));
  notify();
  return { pinned: !exists };
}

export function subscribeShortcuts(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === RECENTS_KEY || event.key === PINS_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("pa:shortcuts", callback as EventListener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pa:shortcuts", callback as EventListener);
  };
}
