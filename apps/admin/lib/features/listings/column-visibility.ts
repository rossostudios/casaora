const STORAGE_KEY = "pa-listings-column-visibility";

export type ColumnVisibilityMap = Record<string, boolean>;

export function readColumnVisibility(): ColumnVisibilityMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function writeColumnVisibility(map: ColumnVisibilityMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable
  }
}
