import "server-only";

import { buildAgentContextHref } from "@/lib/ai-context";
import {
  fetchAgentApprovals,
  fetchAgentInbox,
  fetchList,
  fetchNotifications,
  fetchPortfolioKpis,
  type AgentApproval,
  type AgentInboxItem,
  type NotificationListItem,
  type PortfolioKpis,
} from "@/lib/api";
import {
  groupByConversation,
  toGuestInfo,
  toMessageLogItem,
} from "@/lib/features/messaging/types";
import type { Locale } from "@/lib/i18n";
import { getOnboardingProgress } from "@/lib/onboarding";
import type {
  ActionCenterItem,
  ActionCenterPriority,
  TodayWorkspaceData,
  WorkspaceMetric,
  WorkspaceRecentActivity,
} from "@/lib/workspace-types";

const PRIORITY_WEIGHT: Record<ActionCenterPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function formatCompactCurrency(
  value: number | null | undefined,
  locale: Locale
): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "PYG",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function formatPercent(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value ?? 0)}%`;
}

function diffHours(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const value = new Date(createdAt).getTime();
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, (Date.now() - value) / 3_600_000);
}

function toPriorityFromNotification(
  severity: string | null | undefined
): ActionCenterPriority {
  switch ((severity ?? "").toLowerCase()) {
    case "critical":
    case "error":
      return "critical";
    case "warning":
    case "high":
      return "high";
    case "low":
      return "low";
    default:
      return "medium";
  }
}

function toPriorityFromAge(createdAt: string | null | undefined): ActionCenterPriority {
  const hours = diffHours(createdAt);
  if (hours >= 24) return "critical";
  if (hours >= 8) return "high";
  if (hours >= 2) return "medium";
  return "low";
}

function summarizeApproval(approval: AgentApproval, isEn: boolean): string {
  const args = approval.tool_args ?? {};
  const preview = Object.entries(args)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");

  if (preview) return preview;
  return isEn ? "Review the requested action details." : "Revisa los detalles de la acción solicitada.";
}

function formatActionDate(date: string, locale: Locale): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.valueOf())) return date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function sortActionCenter(items: ActionCenterItem[]): ActionCenterItem[] {
  return [...items].sort((left, right) => {
    const priorityDelta =
      PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
    if (priorityDelta !== 0) return priorityDelta;

    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    return rightTime - leftTime;
  });
}

function buildRecentActivity(
  notifications: NotificationListItem[],
  locale: Locale,
  isEn: boolean
): WorkspaceRecentActivity[] {
  return notifications.slice(0, 4).map((item) => ({
    id: item.id,
    title: item.title || (isEn ? "System update" : "Actualización del sistema"),
    subtitle: item.body || item.category || item.event_type,
    createdAt: formatActionDate(
      item.occurred_at ?? item.created_at ?? new Date().toISOString(),
      locale
    ),
    href: item.link_path ?? "/module/notifications",
  }));
}

function buildMetrics(
  kpis: PortfolioKpis | null,
  actionCenterCount: number,
  pendingApprovals: number,
  locale: Locale,
  isEn: boolean
): WorkspaceMetric[] {
  return [
    {
      id: "occupancy",
      label: isEn ? "Occupancy" : "Ocupación",
      value: formatPercent(kpis?.occupancy),
      detail: isEn ? "Across all active units" : "En todas las unidades activas",
      tone: "success",
    },
    {
      id: "revenue",
      label: isEn ? "Monthly revenue" : "Ingresos mensuales",
      value: formatCompactCurrency(kpis?.monthly_revenue, locale),
      detail: isEn ? "Net operating view" : "Vista operativa neta",
    },
    {
      id: "attention",
      label: isEn ? "Needs attention" : "Requiere atención",
      value: String(actionCenterCount),
      detail: isEn
        ? `${pendingApprovals} approvals waiting`
        : `${pendingApprovals} aprobaciones pendientes`,
      tone: actionCenterCount > 0 ? "warning" : "success",
    },
    {
      id: "noi",
      label: isEn ? "NOI" : "NOI",
      value: formatCompactCurrency(kpis?.noi, locale),
      detail: isEn ? "Monthly performance" : "Rendimiento mensual",
    },
  ];
}

function approvalToActionItem(
  approval: AgentApproval,
  isEn: boolean
): ActionCenterItem {
  return {
    id: `approval:${approval.id}`,
    source: "approval",
    priority: "high",
    title: isEn
      ? `Approval needed: ${approval.tool_name}`
      : `Aprobación requerida: ${approval.tool_name}`,
    subtitle: summarizeApproval(approval, isEn),
    unread: approval.status === "pending",
    createdAt: approval.created_at,
    entityLabel: isEn ? "Governance" : "Gobernanza",
    entityHref: "/module/governance",
    primaryAction: {
      label: isEn ? "Review approval" : "Revisar aprobación",
      href: "/module/governance",
    },
  };
}

function inboxToActionItem(item: AgentInboxItem, isEn: boolean): ActionCenterItem {
  return {
    id: `inbox:${item.id}`,
    source: item.kind === "anomaly" ? "anomaly" : "notification",
    priority:
      item.priority === "critical" ||
      item.priority === "high" ||
      item.priority === "medium" ||
      item.priority === "low"
        ? item.priority
        : "medium",
    title: item.title,
    subtitle: item.body,
    unread: true,
    createdAt: item.created_at,
    entityHref: item.link_path ?? "/module/agent-dashboard",
    primaryAction: {
      label: isEn ? "Open item" : "Abrir item",
      href: item.link_path ?? "/module/agent-dashboard",
    },
  };
}

function notificationToActionItem(
  item: NotificationListItem,
  isEn: boolean
): ActionCenterItem {
  return {
    id: `notification:${item.id}`,
    source: "notification",
    priority: toPriorityFromNotification(item.severity),
    title: item.title || item.event_type || (isEn ? "Notification" : "Notificación"),
    subtitle: item.body || item.category || "",
    unread: !item.read_at,
    createdAt: item.occurred_at ?? item.created_at ?? new Date().toISOString(),
    entityHref: item.link_path ?? "/module/notifications",
    primaryAction: {
      label: isEn ? "Open notification" : "Abrir notificación",
      href: item.link_path ?? "/module/notifications",
    },
  };
}

async function getReplyNeededItems(
  orgId: string,
  isEn: boolean
): Promise<ActionCenterItem[]> {
  const [logRows, guestRows] = await Promise.all([
    fetchList("/message-logs", orgId, 500),
    fetchList("/guests", orgId, 500),
  ]);

  const guestMap = new Map<string, ReturnType<typeof toGuestInfo>>();
  for (const raw of guestRows as Record<string, unknown>[]) {
    const guest = toGuestInfo(raw);
    if (guest.id) guestMap.set(guest.id, guest);
  }

  const conversations = groupByConversation(
    (logRows as Record<string, unknown>[]).map(toMessageLogItem),
    guestMap
  );

  return conversations
    .filter((conversation) => conversation.lastMessage?.direction === "inbound")
    .map((conversation) => {
      const lastMessage = conversation.lastMessage;
      return {
        id: `message:${conversation.guestId}:${lastMessage?.id ?? "latest"}`,
        source: "message",
        priority: toPriorityFromAge(lastMessage?.created_at),
        title: isEn
          ? `Reply to ${conversation.guestName}`
          : `Responder a ${conversation.guestName}`,
        subtitle:
          lastMessage?.body ||
          lastMessage?.subject ||
          (isEn ? "Guest is waiting for a response." : "El huésped espera respuesta."),
        unread: true,
        createdAt: lastMessage?.created_at ?? new Date().toISOString(),
        entityLabel: isEn ? "Messaging" : "Mensajería",
        entityHref: "/module/messaging?status=awaiting",
        primaryAction: {
          label: isEn ? "Open inbox" : "Abrir bandeja",
          href: "/module/messaging?status=awaiting",
        },
        secondaryAction: {
          label: isEn ? "Ask AI" : "Preguntar a IA",
          href: buildAgentContextHref({
            prompt: isEn
              ? `Draft a response for ${conversation.guestName}.`
              : `Redacta una respuesta para ${conversation.guestName}.`,
            context: {
              source: "operations",
              entityIds: [conversation.guestId],
              filters: { source: "message" },
              summary:
                lastMessage?.body ||
                lastMessage?.subject ||
                (isEn
                  ? "Guest is waiting for a response."
                  : "El huésped espera una respuesta."),
              returnPath: "/module/action-center?source=message",
            },
          }),
        },
      } satisfies ActionCenterItem;
    });
}

export async function getWorkspaceActionCenter(
  orgId: string,
  locale: Locale
): Promise<{ items: ActionCenterItem[]; count: number }> {
  const isEn = locale === "en-US";

  const [approvalsResult, inboxResult, notificationsResult, repliesResult] =
    await Promise.allSettled([
      fetchAgentApprovals(orgId),
      fetchAgentInbox(orgId, 100),
      fetchNotifications(orgId, { limit: 100, status: "all" }),
      getReplyNeededItems(orgId, isEn),
    ]);

  const approvalItems =
    approvalsResult.status === "fulfilled"
      ? (approvalsResult.value.data ?? [])
          .filter((approval) => approval.status === "pending")
          .map((approval) => approvalToActionItem(approval, isEn))
      : [];

  const inboxItems =
    inboxResult.status === "fulfilled"
      ? (inboxResult.value.data ?? [])
          .filter((item) => item.kind !== "approval")
          .map((item) => inboxToActionItem(item, isEn))
      : [];

  const notificationItems =
    notificationsResult.status === "fulfilled"
      ? (notificationsResult.value.data ?? []).map((item) =>
          notificationToActionItem(item, isEn)
        )
      : [];

  const replyItems =
    repliesResult.status === "fulfilled" ? repliesResult.value : [];

  const allItems = sortActionCenter([
    ...approvalItems,
    ...replyItems,
    ...inboxItems,
    ...notificationItems,
  ]);

  return {
    items: allItems,
    count: allItems.length,
  };
}

export async function getTodayWorkspaceData(
  orgId: string,
  locale: Locale
): Promise<TodayWorkspaceData> {
  const isEn = locale === "en-US";

  const [actionCenter, onboarding, kpisResult, notificationsResult] =
    await Promise.all([
      getWorkspaceActionCenter(orgId, locale),
      getOnboardingProgress(orgId),
      fetchPortfolioKpis(orgId).catch(() => null),
      fetchNotifications(orgId, { limit: 6, status: "all" }).catch(() => ({
        data: [],
      })),
    ]);

  const approvalCount = actionCenter.items.filter(
    (item) => item.source === "approval"
  ).length;
  const replyCount = actionCenter.items.filter(
    (item) => item.source === "message"
  ).length;
  const anomalyCount = actionCenter.items.filter(
    (item) => item.source === "anomaly"
  ).length;

  return {
    orgId,
    briefingTitle: isEn ? "Morning briefing" : "Resumen de hoy",
    briefingSummary: isEn
      ? `${approvalCount} approvals, ${replyCount} replies, ${anomalyCount} operational risks need attention.`
      : `${approvalCount} aprobaciones, ${replyCount} respuestas y ${anomalyCount} riesgos operativos requieren atención.`,
    actionCenterItems: actionCenter.items.slice(0, 10),
    actionCenterCount: actionCenter.count,
    metrics: buildMetrics(
      kpisResult,
      actionCenter.count,
      approvalCount,
      locale,
      isEn
    ),
    quickActions: [
      {
        id: "properties",
        title: isEn ? "Review portfolio" : "Revisar portafolio",
        description: isEn
          ? "Open properties, units, and occupancy."
          : "Abrir propiedades, unidades y ocupación.",
        href: "/app/portfolio",
      },
      {
        id: "applications",
        title: isEn ? "Process applications" : "Procesar aplicaciones",
        description: isEn
          ? "Move qualified leads into leases."
          : "Mueve leads calificados hacia contratos.",
        href: "/module/applications",
      },
      {
        id: "messages",
        title: isEn ? "Work the queue" : "Resolver la cola",
        description: isEn
          ? "Start from the unified queue, then drill into messaging when needed."
          : "Empieza por la cola unificada y entra a mensajería solo cuando haga falta.",
        href: "/module/action-center",
      },
      {
        id: "knowledge",
        title: isEn ? "Refresh knowledge" : "Actualizar conocimiento",
        description: isEn
          ? "Keep AI answers current by reviewing content."
          : "Mantén respuestas IA vigentes revisando contenido.",
        href: "/module/knowledge",
      },
    ],
    recentActivity: buildRecentActivity(notificationsResult.data ?? [], locale, isEn),
    onboarding,
  };
}
