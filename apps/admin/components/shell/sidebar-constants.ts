import {
  AlertDiamondIcon,
  ArtificialIntelligence02Icon,
  Building01Icon,
  CalendarCheckIn01Icon,
  ChartIcon,
  CheckmarkCircle02Icon,
  CreditCardIcon,
  Home01Icon,
  InboxIcon,
  MailReply01Icon,
  Message01Icon,
  Notification03Icon,
  SparklesIcon,
  Task01Icon,
  WorkflowSquare03Icon,
} from "@hugeicons/core-free-icons";
import type { PrimaryTabKey, RouteLinkDef, SectionDef } from "./sidebar-types";

export const PRIMARY_TABS: Array<{
  key: PrimaryTabKey;
  href: string;
  icon: typeof Home01Icon;
  label: { "es-PY": string; "en-US": string };
}> = [
  {
    key: "today",
    href: "/app",
    icon: Home01Icon,
    label: { "es-PY": "Hoy", "en-US": "Today" },
  },
  {
    key: "portfolio",
    href: "/app/portfolio",
    icon: Building01Icon,
    label: { "es-PY": "Portafolio", "en-US": "Portfolio" },
  },
  {
    key: "leasing",
    href: "/module/applications",
    icon: CalendarCheckIn01Icon,
    label: { "es-PY": "Leasing", "en-US": "Leasing" },
  },
  {
    key: "operations",
    href: "/module/operations",
    icon: Task01Icon,
    label: { "es-PY": "Operaciones", "en-US": "Operations" },
  },
  {
    key: "finance",
    href: "/module/reports/finance",
    icon: CreditCardIcon,
    label: { "es-PY": "Finanzas", "en-US": "Finance" },
  },
  {
    key: "conversations",
    href: "/module/action-center",
    icon: InboxIcon,
    label: { "es-PY": "Conversaciones", "en-US": "Conversations" },
  },
  {
    key: "ai",
    href: "/app/agents",
    icon: ArtificialIntelligence02Icon,
    label: { "es-PY": "IA", "en-US": "AI" },
  },
];

export const CHAT_LINKS: RouteLinkDef[] = [
  {
    href: "/app/agents",
    icon: SparklesIcon,
    label: { "es-PY": "Agentes", "en-US": "Agents" },
  },
  {
    href: "/app/chats",
    icon: InboxIcon,
    label: { "es-PY": "Historial de chats", "en-US": "Chat history" },
  },
  {
    href: "/module/governance",
    icon: CheckmarkCircle02Icon,
    label: { "es-PY": "Config. IA", "en-US": "AI Settings" },
    roles: ["owner_admin"],
  },
];

export const INBOX_STATUS_LINKS: RouteLinkDef[] = [
  {
    href: "/module/action-center",
    icon: InboxIcon,
    label: { "es-PY": "Centro de acción", "en-US": "Action Center" },
  },
  {
    href: "/module/action-center?source=approval",
    icon: CheckmarkCircle02Icon,
    label: { "es-PY": "Aprobaciones", "en-US": "Approvals" },
  },
  {
    href: "/module/action-center?source=message",
    icon: MailReply01Icon,
    label: { "es-PY": "Esperando respuesta", "en-US": "Awaiting Reply" },
  },
  {
    href: "/module/action-center?source=notification",
    icon: Notification03Icon,
    label: { "es-PY": "Notificaciones", "en-US": "Notifications" },
  },
  {
    href: "/module/action-center?source=anomaly",
    icon: AlertDiamondIcon,
    label: { "es-PY": "Anomalías", "en-US": "Anomalies" },
  },
];

export const INBOX_SEGMENT_LINKS: RouteLinkDef[] = [
  {
    href: "/module/messaging",
    icon: Message01Icon,
    label: { "es-PY": "Bandeja de mensajes", "en-US": "Messaging inbox" },
  },
  {
    href: "/module/notifications",
    icon: Notification03Icon,
    label: { "es-PY": "Notificaciones", "en-US": "Notifications" },
  },
  {
    href: "/module/governance",
    icon: CheckmarkCircle02Icon,
    label: { "es-PY": "Gobernanza IA", "en-US": "AI Governance" },
  },
];

export const SECTIONS: SectionDef[] = [
  {
    key: "portfolio",
    label: {
      "es-PY": "Portafolio",
      "en-US": "Portfolio",
    },
    routeLinks: [
      {
        href: "/app/portfolio",
        icon: ChartIcon,
        label: { "es-PY": "Análisis", "en-US": "Analytics" },
        roles: ["owner_admin", "operator"],
      },
    ],
    moduleSlugs: ["properties", "units", "integrations"],
    roles: ["owner_admin", "operator"],
  },
  {
    key: "rentals",
    label: {
      "es-PY": "Alquileres",
      "en-US": "Rentals",
    },
    moduleSlugs: [
      "applications",
      "listings",
      "leases",
      "reservations",
      "reviews",
    ],
    roles: ["owner_admin", "operator"],
  },
  {
    key: "operations",
    label: {
      "es-PY": "Operaciones",
      "en-US": "Operations",
    },
    routeLinks: [
      {
        href: "/module/operations",
        icon: Task01Icon,
        label: { "es-PY": "Operaciones", "en-US": "Operations" },
      },
      {
        href: "/module/automations?tab=rules",
        icon: WorkflowSquare03Icon,
        label: { "es-PY": "Automatizaciones", "en-US": "Automations" },
        roles: ["owner_admin", "operator"],
      },
    ],
    moduleSlugs: ["guests"],
    roles: ["owner_admin", "operator", "cleaner"],
  },
  {
    key: "finance",
    label: {
      "es-PY": "Finanzas",
      "en-US": "Finance",
    },
    routeLinks: [
      {
        href: "/module/reports/finance",
        icon: ChartIcon,
        label: { "es-PY": "Ingresos", "en-US": "Income" },
      },
    ],
    moduleSlugs: ["expenses", "reports"],
    roles: ["owner_admin", "accountant"],
  },
  {
    key: "workspace",
    label: {
      "es-PY": "Espacio de trabajo",
      "en-US": "Workspace",
    },
    moduleSlugs: ["documents", "billing"],
    roles: ["owner_admin"],
  },
];

export const COLLAPSED_SECTIONS_KEY = "pa-sidebar-collapsed-sections";
export const APPLE_DEVICE_REGEX = /Mac|iPhone|iPad/i;

export const HOME_TAB_HIDDEN_MODULE_SLUGS = new Set([
  "applications",
  "collections",
  "maintenance",
  "action-center",
  "messaging",
  "notification-rules",
  "notifications",
  "transparency-summary",
  "organizations",
  "integration-events",
  "audit-logs",
  "sequences",
  "tasks",
  "workflow-rules",
  "owner-statements",
  "pricing",
  "knowledge",
  "agent-dashboard",
  "agent-config",
  "agent-playground",
  "governance",
  "calendar",
]);
