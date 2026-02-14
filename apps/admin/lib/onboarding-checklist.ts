import type { RentalMode } from "@/app/(admin)/setup/setup-components";

export type ChecklistItem = {
  id: string;
  labelEn: string;
  labelEs: string;
  href: string;
  isDone: boolean;
};

type EntityCounts = {
  channels: number;
  listings: number;
  reservations: number;
  tasks: number;
  expenses: number;
  pricing: number;
  marketplaceListings: number;
  applications: number;
  leases: number;
  collections: number;
};

const STR_ITEMS: Omit<ChecklistItem, "isDone">[] = [
  {
    id: "str-channels",
    labelEn: "Connect your first channel",
    labelEs: "Conecta tu primer canal",
    href: "/module/channels",
  },
  {
    id: "str-listings",
    labelEn: "Create a listing with iCal sync",
    labelEs: "Crea un anuncio con sync iCal",
    href: "/setup?tab=listings",
  },
  {
    id: "str-reservations",
    labelEn: "Create your first reservation",
    labelEs: "Crea tu primera reserva",
    href: "/module/reservations",
  },
  {
    id: "str-tasks",
    labelEn: "Set up a cleaning task",
    labelEs: "Configura una tarea de limpieza",
    href: "/module/tasks",
  },
  {
    id: "str-expenses",
    labelEn: "Record your first expense",
    labelEs: "Registra tu primer gasto",
    href: "/module/expenses",
  },
];

const LTR_ITEMS: Omit<ChecklistItem, "isDone">[] = [
  {
    id: "ltr-pricing",
    labelEn: "Create a pricing template",
    labelEs: "Crea una plantilla de precios",
    href: "/module/pricing",
  },
  {
    id: "ltr-marketplace",
    labelEn: "Publish a marketplace listing",
    labelEs: "Publica un anuncio en el marketplace",
    href: "/module/marketplace-listings",
  },
  {
    id: "ltr-applications",
    labelEn: "Process your first application",
    labelEs: "Procesa tu primera aplicación",
    href: "/module/applications",
  },
  {
    id: "ltr-leases",
    labelEn: "Create a lease",
    labelEs: "Crea un contrato",
    href: "/module/leases",
  },
  {
    id: "ltr-collections",
    labelEn: "Set up collections",
    labelEs: "Configura cobranzas",
    href: "/module/collections",
  },
];

function isDoneForId(id: string, counts: EntityCounts): boolean {
  switch (id) {
    case "str-channels":
      return counts.channels > 0;
    case "str-listings":
      return counts.listings > 0;
    case "str-reservations":
      return counts.reservations > 0;
    case "str-tasks":
      return counts.tasks > 0;
    case "str-expenses":
      return counts.expenses > 0;
    case "ltr-pricing":
      return counts.pricing > 0;
    case "ltr-marketplace":
      return counts.marketplaceListings > 0;
    case "ltr-applications":
      return counts.applications > 0;
    case "ltr-leases":
      return counts.leases > 0;
    case "ltr-collections":
      return counts.collections > 0;
    default:
      return false;
  }
}

export function getChecklistItems(
  rentalMode: RentalMode | null,
  counts: EntityCounts
): ChecklistItem[] {
  const mode = rentalMode ?? "both";
  const templates =
    mode === "str"
      ? STR_ITEMS
      : mode === "ltr"
        ? LTR_ITEMS
        : [...STR_ITEMS, ...LTR_ITEMS];

  return templates.map((item) => ({
    ...item,
    isDone: isDoneForId(item.id, counts),
  }));
}
