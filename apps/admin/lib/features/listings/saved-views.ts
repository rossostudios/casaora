import type { SortingState } from "@tanstack/react-table";

const STORAGE_KEY = "pa-listings-saved-views";

export type SavedView = {
  id: string;
  name: string;
  globalFilter: string;
  statusFilter: string;
  readinessFilter: string;
  sorting: SortingState;
  preset?: boolean;
};

export const PRESET_VIEWS: SavedView[] = [
  {
    id: "all",
    name: "All listings",
    globalFilter: "",
    statusFilter: "all",
    readinessFilter: "all",
    sorting: [{ id: "created_at", desc: true }],
    preset: true,
  },
  {
    id: "published",
    name: "Published",
    globalFilter: "",
    statusFilter: "published",
    readinessFilter: "all",
    sorting: [{ id: "created_at", desc: true }],
    preset: true,
  },
  {
    id: "drafts",
    name: "Drafts",
    globalFilter: "",
    statusFilter: "draft",
    readinessFilter: "all",
    sorting: [{ id: "created_at", desc: true }],
    preset: true,
  },
  {
    id: "needs_attention",
    name: "Needs attention",
    globalFilter: "",
    statusFilter: "all",
    readinessFilter: "not_ready",
    sorting: [{ id: "created_at", desc: true }],
    preset: true,
  },
];

export const PRESET_VIEWS_ES: Record<string, string> = {
  all: "Todos",
  published: "Publicados",
  drafts: "Borradores",
  needs_attention: "Requiere atención",
};

function readCustomViews(): SavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCustomViews(views: SavedView[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    // localStorage unavailable
  }
}

export function getCustomViews(): SavedView[] {
  return readCustomViews();
}

export function saveCustomView(view: Omit<SavedView, "id">): SavedView {
  const views = readCustomViews();
  const newView: SavedView = {
    ...view,
    id: `custom_${Date.now()}`,
  };
  views.push(newView);
  writeCustomViews(views);
  return newView;
}

export function deleteCustomView(id: string): void {
  const views = readCustomViews().filter((v) => v.id !== id);
  writeCustomViews(views);
}

export function getAllViews(): SavedView[] {
  return [...PRESET_VIEWS, ...readCustomViews()];
}
