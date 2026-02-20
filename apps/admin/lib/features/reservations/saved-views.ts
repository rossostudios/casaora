const STORAGE_KEY = "pa-reservations-saved-views";

export type ReservationSavedView = {
  id: string;
  name: string;
  statusFilter: string;
  sourceFilter: string;
  unitId: string;
  quickFilter: string;
  preset?: boolean;
};

export const PRESET_VIEWS: ReservationSavedView[] = [
  {
    id: "all",
    name: "All",
    statusFilter: "all",
    sourceFilter: "all",
    unitId: "all",
    quickFilter: "all",
    preset: true,
  },
  {
    id: "marketplace",
    name: "Marketplace Bookings",
    statusFilter: "all",
    sourceFilter: "direct_booking",
    unitId: "all",
    quickFilter: "all",
    preset: true,
  },
  {
    id: "pending_review",
    name: "Pending Review",
    statusFilter: "all",
    sourceFilter: "all",
    unitId: "all",
    quickFilter: "pending",
    preset: true,
  },
  {
    id: "in_house",
    name: "In-House Now",
    statusFilter: "all",
    sourceFilter: "all",
    unitId: "all",
    quickFilter: "in_house",
    preset: true,
  },
  {
    id: "arrivals_week",
    name: "Arrivals Today",
    statusFilter: "all",
    sourceFilter: "all",
    unitId: "all",
    quickFilter: "arrivals_today",
    preset: true,
  },
];

export const PRESET_VIEWS_ES: Record<string, string> = {
  all: "Todas",
  marketplace: "Reservas Marketplace",
  pending_review: "Pendientes",
  in_house: "In-house ahora",
  arrivals_week: "Llegadas hoy",
};

function readCustomViews(): ReservationSavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCustomViews(views: ReservationSavedView[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    // localStorage unavailable
  }
}

export function getCustomViews(): ReservationSavedView[] {
  return readCustomViews();
}

export function saveCustomView(
  view: Omit<ReservationSavedView, "id">
): ReservationSavedView {
  const views = readCustomViews();
  const newView: ReservationSavedView = {
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

export function getAllViews(): ReservationSavedView[] {
  return [...PRESET_VIEWS, ...readCustomViews()];
}
