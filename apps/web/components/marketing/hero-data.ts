import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  CalendarCheck,
  CreditCard,
  DoorOpen,
  FileText,
  FolderOpen,
  Home,
  LayoutList,
  Link2,
  PieChart,
  Receipt,
  Users,
  Workflow,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Sidebar navigation                                                 */
/* ------------------------------------------------------------------ */

export type SidebarItem = {
  name: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
};

export type SidebarSection = {
  section: string;
  items: SidebarItem[];
};

export const sidebarNav: SidebarSection[] = [
  {
    section: "PORTFOLIO",
    items: [
      { name: "Properties", icon: Home, badge: "4" },
      { name: "Units", icon: DoorOpen, badge: "12" },
      {
        name: "Channels",
        icon: Link2,
        badge: "SOON",
        badgeColor: "bg-red-100 text-red-600",
      },
    ],
  },
  {
    section: "RENTALS",
    items: [
      { name: "Listings", icon: LayoutList, badge: "3" },
      { name: "Leases", icon: FileText },
      { name: "Reservations", icon: CalendarCheck },
      { name: "Calendar", icon: Calendar },
    ],
  },
  {
    section: "OPERATIONS",
    items: [
      { name: "Operations", icon: CalendarCheck },
      { name: "Automations", icon: Workflow },
      { name: "Guests", icon: Users },
    ],
  },
  {
    section: "FINANCE",
    items: [
      { name: "Income", icon: BarChart3 },
      { name: "Expenses", icon: Receipt },
      { name: "Reports", icon: PieChart },
    ],
  },
  {
    section: "WORKSPACE",
    items: [
      { name: "Documents", icon: FolderOpen },
      { name: "Billing", icon: CreditCard },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Tab icon lookup (for top bar)                                      */
/* ------------------------------------------------------------------ */

export const TAB_ICONS: Record<string, LucideIcon> = Object.fromEntries(
  sidebarNav.flatMap((s) => s.items.map((i) => [i.name, i.icon]))
);

/* ------------------------------------------------------------------ */
/*  Mock data: Properties                                              */
/* ------------------------------------------------------------------ */

export type MockProperty = {
  code: string;
  name: string;
  address: string;
  status: "active" | "inactive";
  health: "healthy" | "watch" | "critical";
  unitCount: number;
  occupancy: number;
  revenue: string;
  tasks: number;
};

export const mockProperties: MockProperty[] = [
  {
    code: "MBY-01",
    name: "Marina Bay Suites",
    address: "Av. Costanera 1200, Asunción",
    status: "active",
    health: "healthy",
    unitCount: 6,
    occupancy: 92,
    revenue: "₲ 48M",
    tasks: 1,
  },
  {
    code: "VDE-02",
    name: "Villa del Este",
    address: "Calle España 445, Encarnación",
    status: "active",
    health: "watch",
    unitCount: 3,
    occupancy: 67,
    revenue: "₲ 22M",
    tasks: 3,
  },
  {
    code: "PAL-03",
    name: "Palms Residence",
    address: "Ruta Transchaco km 12, Luque",
    status: "active",
    health: "healthy",
    unitCount: 2,
    occupancy: 100,
    revenue: "₲ 15M",
    tasks: 0,
  },
  {
    code: "CDE-04",
    name: "Centro Tower",
    address: "Av. San Blas 780, CDE",
    status: "inactive",
    health: "critical",
    unitCount: 1,
    occupancy: 0,
    revenue: "₲ 0",
    tasks: 5,
  },
];

/* ------------------------------------------------------------------ */
/*  Mock data: Reservations                                            */
/* ------------------------------------------------------------------ */

export type MockReservation = {
  guest: string;
  checkIn: string;
  checkOut: string;
  unit: string;
  source: string;
  status: string;
  statusColor: string;
};

export const mockReservations: MockReservation[] = [
  {
    guest: "Lucía Fernández",
    checkIn: "Feb 20",
    checkOut: "Feb 25",
    unit: "MBY-01 · Suite A",
    source: "Airbnb",
    status: "Confirmed",
    statusColor:
      "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
  },
  {
    guest: "James Carter",
    checkIn: "Feb 22",
    checkOut: "Mar 1",
    unit: "VDE-02 · Apt 3B",
    source: "Booking.com",
    status: "Checked In",
    statusColor:
      "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  },
  {
    guest: "Ana Giménez",
    checkIn: "Mar 3",
    checkOut: "Mar 7",
    unit: "PAL-03 · Unit 1",
    source: "Direct",
    status: "Pending",
    statusColor:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
  {
    guest: "Marco Villalba",
    checkIn: "Mar 10",
    checkOut: "Mar 15",
    unit: "MBY-01 · Suite C",
    source: "Airbnb",
    status: "Confirmed",
    statusColor:
      "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
  },
];

/* ------------------------------------------------------------------ */
/*  Mock data: Checklist                                               */
/* ------------------------------------------------------------------ */

export const checklist = [
  { name: "Add your first property", done: true },
  { name: "Register your first unit", done: true },
  { name: "Connect your first channel", action: "Go >" },
  { name: "Create your first reservation", action: "Go >" },
  { name: "Set up a cleaning task", action: "Go >" },
];

/* ------------------------------------------------------------------ */
/*  Generic table configs for Tier 2 modules                           */
/* ------------------------------------------------------------------ */

export type TableConfig = {
  columns: string[];
  rows: string[][];
};

export const MODULE_TABLE_CONFIGS: Record<string, TableConfig> = {
  Units: {
    columns: ["Unit", "Property", "Type", "Status", "Beds"],
    rows: [
      ["Suite A", "Marina Bay Suites", "Studio", "Occupied", "2"],
      ["Suite B", "Marina Bay Suites", "1 Bed", "Vacant", "1"],
      ["Apt 3B", "Villa del Este", "2 Bed", "Occupied", "3"],
      ["Unit 1", "Palms Residence", "Studio", "Occupied", "1"],
    ],
  },
  Listings: {
    columns: ["Title", "Property", "Status", "Price/Night", "Views"],
    rows: [
      [
        "Luxury Suite Downtown",
        "Marina Bay Suites",
        "Published",
        "₲ 450K",
        "342",
      ],
      ["Garden Apartment", "Villa del Este", "Published", "₲ 280K", "189"],
      ["Cozy Studio Luque", "Palms Residence", "Draft", "₲ 180K", "—"],
    ],
  },
  Leases: {
    columns: ["Tenant", "Unit", "Start", "End", "Rent"],
    rows: [
      ["María López", "Suite B · MBY-01", "Jan 2026", "Dec 2026", "₲ 5.5M"],
      ["Carlos Benítez", "Apt 3B · VDE-02", "Mar 2026", "Feb 2027", "₲ 3.2M"],
      ["Sofia Acosta", "Unit 1 · PAL-03", "Jun 2025", "May 2026", "₲ 2.8M"],
    ],
  },
  Expenses: {
    columns: ["Description", "Property", "Category", "Amount", "Date"],
    rows: [
      [
        "Cleaning supplies",
        "Marina Bay Suites",
        "Operations",
        "₲ 820K",
        "Feb 18",
      ],
      ["Plumber repair", "Villa del Este", "Maintenance", "₲ 1.5M", "Feb 15"],
      ["WiFi monthly", "Palms Residence", "Utilities", "₲ 350K", "Feb 1"],
      ["Insurance renewal", "Centro Tower", "Insurance", "₲ 4.2M", "Jan 30"],
    ],
  },
  Guests: {
    columns: ["Name", "Email", "Stays", "Last Visit", "Rating"],
    rows: [
      ["Lucía Fernández", "lucia@email.com", "3", "Feb 2026", "★★★★★"],
      ["James Carter", "james@email.com", "1", "Feb 2026", "★★★★☆"],
      ["Ana Giménez", "ana@email.com", "5", "Jan 2026", "★★★★★"],
      ["Marco Villalba", "marco@email.com", "2", "Dec 2025", "★★★★☆"],
    ],
  },
  Reports: {
    columns: ["Report", "Period", "Type", "Generated", "Status"],
    rows: [
      ["Revenue Summary", "Feb 2026", "Financial", "Feb 19", "Ready"],
      ["Occupancy Analysis", "Jan 2026", "Operations", "Feb 1", "Ready"],
      ["Owner Payout", "Q4 2025", "Statement", "Jan 15", "Sent"],
    ],
  },
  Documents: {
    columns: ["Name", "Type", "Property", "Uploaded", "Size"],
    rows: [
      ["Lease Agreement — López", "Contract", "Marina Bay", "Feb 10", "2.4 MB"],
      ["Insurance Policy 2026", "Insurance", "All", "Jan 5", "1.1 MB"],
      [
        "Fire Inspection Cert",
        "Compliance",
        "Villa del Este",
        "Dec 20",
        "540 KB",
      ],
    ],
  },
  Billing: {
    columns: ["Invoice", "Period", "Amount", "Status", "Due"],
    rows: [
      ["INV-2026-02", "February 2026", "₲ 890K", "Pending", "Mar 1"],
      ["INV-2026-01", "January 2026", "₲ 890K", "Paid", "Feb 1"],
      ["INV-2025-12", "December 2025", "₲ 750K", "Paid", "Jan 1"],
    ],
  },
};
