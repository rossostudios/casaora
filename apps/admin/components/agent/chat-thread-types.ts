"use client";

import type { AgentChatMessage, AgentChatSummary } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

export const PROMPTS: Record<string, { "en-US": string[]; "es-PY": string[] }> = {
  "morning-brief": {
    "en-US": [
      "Give me today's top 5 priorities.",
      "Which turnovers are at risk this morning?",
      "What is the biggest operational bottleneck now?",
    ],
    "es-PY": [
      "Dame las 5 prioridades de hoy.",
      "\u00bfQu\u00e9 turnovers est\u00e1n en riesgo esta ma\u00f1ana?",
      "\u00bfCu\u00e1l es el mayor cuello de botella operativo ahora?",
    ],
  },
  "guest-concierge": {
    "en-US": [
      "Draft a check-in message for this week's arrivals.",
      "Show me all guests arriving in the next 7 days.",
      "Write a welcome message for the guest in unit 3.",
    ],
    "es-PY": [
      "Redacta un mensaje de check-in para las llegadas de esta semana.",
      "Mu\u00e9strame todos los hu\u00e9spedes que llegan en los pr\u00f3ximos 7 d\u00edas.",
      "Escribe un mensaje de bienvenida para el hu\u00e9sped de la unidad 3.",
    ],
  },
  "owner-insight": {
    "en-US": [
      "Summarize this month's revenue by property.",
      "Compare revenue vs expenses for the last 3 months.",
      "Flag any unusual expenses this month.",
    ],
    "es-PY": [
      "Resume los ingresos de este mes por propiedad.",
      "Compara ingresos vs gastos de los \u00faltimos 3 meses.",
      "Se\u00f1ala gastos inusuales de este mes.",
    ],
  },
  "price-optimizer": {
    "en-US": [
      "Which units have the lowest occupancy this month?",
      "Identify underpriced units based on market trends.",
      "Suggest seasonal pricing adjustments for next quarter.",
    ],
    "es-PY": [
      "\u00bfQu\u00e9 unidades tienen la ocupaci\u00f3n m\u00e1s baja este mes?",
      "Identifica unidades con precios bajos seg\u00fan tendencias.",
      "Sugiere ajustes de precios estacionales para el pr\u00f3ximo trimestre.",
    ],
  },
  "market-match": {
    "en-US": [
      "Match the latest applicants to available listings.",
      "Which pet-friendly listings are currently available?",
      "Score the top 5 pending applications by fit.",
    ],
    "es-PY": [
      "Empareja los \u00faltimos solicitantes con anuncios disponibles.",
      "\u00bfQu\u00e9 anuncios pet-friendly est\u00e1n disponibles?",
      "Punt\u00faa las 5 mejores solicitudes pendientes por compatibilidad.",
    ],
  },
  "maintenance-triage": {
    "en-US": [
      "Show open maintenance requests sorted by urgency.",
      "Which properties have the most pending repairs?",
      "Estimate repair costs for all open tickets this month.",
    ],
    "es-PY": [
      "Muestra solicitudes de mantenimiento abiertas por urgencia.",
      "\u00bfQu\u00e9 propiedades tienen m\u00e1s reparaciones pendientes?",
      "Estima costos de reparaci\u00f3n para tickets abiertos este mes.",
    ],
  },
  "compliance-guard": {
    "en-US": [
      "Flag any leases expiring in the next 30 days.",
      "Which tenants have overdue payments this month?",
      "Check document expirations across all properties.",
    ],
    "es-PY": [
      "Se\u00f1ala contratos que vencen en los pr\u00f3ximos 30 d\u00edas.",
      "\u00bfQu\u00e9 inquilinos tienen pagos vencidos este mes?",
      "Revisa vencimientos de documentos en todas las propiedades.",
    ],
  },
  default: {
    "en-US": [
      "Summarize the key risks for today.",
      "What should I fix first in operations?",
      "Give me a concise action plan.",
    ],
    "es-PY": [
      "Resume los riesgos clave de hoy.",
      "\u00bfQu\u00e9 debo corregir primero en operaciones?",
      "Dame un plan de acci\u00f3n conciso.",
    ],
  },
};

export const MESSAGE_SKELETON_KEYS = [
  "message-skeleton-1",
  "message-skeleton-2",
  "message-skeleton-3",
  "message-skeleton-4",
  "message-skeleton-5",
];

export interface ThreadData {
  chat: AgentChatSummary | null;
  messages: AgentChatMessage[];
}

export interface StreamingTool {
  name: string;
  preview?: string;
  ok?: boolean;
}

function normalizeChat(payload: unknown): AgentChatSummary | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  if (!(row.id && row.title)) return null;

  return {
    id: String(row.id),
    org_id: String(row.org_id ?? ""),
    agent_id: String(row.agent_id ?? ""),
    agent_slug: String(row.agent_slug ?? ""),
    agent_name: String(row.agent_name ?? ""),
    agent_icon_key:
      typeof row.agent_icon_key === "string" ? row.agent_icon_key : undefined,
    title: String(row.title),
    is_archived: Boolean(row.is_archived),
    last_message_at: String(row.last_message_at ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    latest_message_preview:
      typeof row.latest_message_preview === "string"
        ? row.latest_message_preview
        : null,
  };
}

function normalizeMessages(payload: unknown): AgentChatMessage[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown[] }).data;
  if (!Array.isArray(data)) return [];

  return data
    .filter((row): row is AgentChatMessage =>
      Boolean(row && typeof row === "object")
    )
    .map((row) => {
      const role: "user" | "assistant" =
        row.role === "assistant" ? "assistant" : "user";

      return {
        id: String(row.id ?? ""),
        chat_id: String(row.chat_id ?? ""),
        org_id: String(row.org_id ?? ""),
        role,
        content: String(row.content ?? ""),
        tool_trace: Array.isArray(row.tool_trace)
          ? (row.tool_trace as AgentChatMessage["tool_trace"])
          : undefined,
        model_used:
          typeof row.model_used === "string" ? row.model_used : undefined,
        fallback_used: Boolean(row.fallback_used ?? false),
        created_at: String(row.created_at ?? ""),
      };
    })
    .filter((row) => row.id && row.content);
}

export async function fetchThread(chatId: string, orgId: string): Promise<ThreadData> {
  const [chatRes, messagesRes] = await Promise.all([
    fetch(
      `/api/agent/chats/${encodeURIComponent(chatId)}?org_id=${encodeURIComponent(orgId)}`,
      {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      }
    ),
    fetch(
      `/api/agent/chats/${encodeURIComponent(chatId)}/messages?org_id=${encodeURIComponent(orgId)}&limit=160`,
      {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      }
    ),
  ]);

  const chatPayload = (await chatRes.json()) as unknown;
  const messagesPayload = (await messagesRes.json()) as unknown;

  if (!chatRes.ok) {
    let message = "Could not load chat.";
    if (chatPayload != null && typeof chatPayload === "object" && "error" in chatPayload) {
      message = String((chatPayload as { error?: unknown }).error);
    }
    throw new Error(message);
  }

  if (!messagesRes.ok) {
    let message = "Could not load messages.";
    if (messagesPayload != null && typeof messagesPayload === "object" && "error" in messagesPayload) {
      message = String((messagesPayload as { error?: unknown }).error);
    }
    throw new Error(message);
  }

  return {
    chat: normalizeChat(chatPayload),
    messages: normalizeMessages(messagesPayload),
  };
}
