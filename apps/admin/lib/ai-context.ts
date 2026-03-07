import type { AIContextPayload } from "@/lib/workspace-types";

const CONTEXT_START = "[CasaoraContext]";
const CONTEXT_END = "[/CasaoraContext]";

function isContextSource(value: unknown): value is AIContextPayload["source"] {
  return (
    value === "portfolio" ||
    value === "properties" ||
    value === "units" ||
    value === "listings" ||
    value === "operations" ||
    value === "reservations" ||
    value === "leases" ||
    value === "applications" ||
    value === "knowledge" ||
    value === "finance"
  );
}

export function parseAIContext(raw: string | null | undefined): AIContextPayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const source = parsed.source;
    const entityIds = Array.isArray(parsed.entityIds)
      ? parsed.entityIds.filter((item): item is string => typeof item === "string")
      : [];
    const filters =
      parsed.filters && typeof parsed.filters === "object"
        ? Object.fromEntries(
            Object.entries(parsed.filters as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string"
            )
          )
        : {};
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const returnPath =
      typeof parsed.returnPath === "string" ? parsed.returnPath.trim() : "";

    if (!(isContextSource(source) && summary && returnPath)) {
      return null;
    }

    return {
      source,
      entityIds,
      filters,
      summary,
      returnPath,
      draftPrompt:
        typeof parsed.draftPrompt === "string" ? parsed.draftPrompt.trim() : undefined,
      permissions:
        parsed.permissions &&
        typeof parsed.permissions === "object" &&
        typeof (parsed.permissions as Record<string, unknown>).maySuggest === "boolean" &&
        typeof (parsed.permissions as Record<string, unknown>).mayExecuteLowRisk ===
          "boolean" &&
        typeof (parsed.permissions as Record<string, unknown>).mayExecuteHighRisk ===
          "boolean"
          ? {
              maySuggest: (parsed.permissions as Record<string, boolean>).maySuggest,
              mayExecuteLowRisk: (parsed.permissions as Record<string, boolean>)
                .mayExecuteLowRisk,
              mayExecuteHighRisk: (parsed.permissions as Record<string, boolean>)
                .mayExecuteHighRisk,
            }
          : undefined,
    };
  } catch {
    return null;
  }
}

export function buildAgentContextHref(params: {
  prompt: string;
  context?: AIContextPayload | null;
  agent?: string;
  newChat?: boolean;
}): string {
  const search = new URLSearchParams();
  if (params.prompt.trim()) search.set("prompt", params.prompt.trim());
  if (params.context) search.set("context", JSON.stringify(params.context));
  if (params.agent) search.set("agent", params.agent);
  if (params.newChat !== false) search.set("new", "1");
  return `/app/agents?${search.toString()}`;
}

export function summarizeAIContext(
  context: AIContextPayload,
  isEn: boolean
): string {
  const entityCount = context.entityIds.length;
  const countLabel =
    entityCount > 0
      ? isEn
        ? `${entityCount} ${entityCount === 1 ? "record" : "records"}`
        : `${entityCount} ${entityCount === 1 ? "registro" : "registros"}`
      : isEn
        ? "Current workspace"
        : "Espacio actual";

  switch (context.source) {
    case "portfolio":
      return isEn ? `Portfolio overview · ${countLabel}` : `Resumen de portafolio · ${countLabel}`;
    case "properties":
      return isEn ? `Portfolio context · ${countLabel}` : `Contexto de portafolio · ${countLabel}`;
    case "units":
      return isEn ? `Units context · ${countLabel}` : `Contexto de unidades · ${countLabel}`;
    case "listings":
      return isEn ? `Listings context · ${countLabel}` : `Contexto de anuncios · ${countLabel}`;
    case "operations":
      return isEn ? `Operations context · ${countLabel}` : `Contexto operativo · ${countLabel}`;
    case "reservations":
      return isEn ? `Reservations context · ${countLabel}` : `Contexto de reservas · ${countLabel}`;
    case "leases":
      return isEn ? `Leases context · ${countLabel}` : `Contexto de contratos · ${countLabel}`;
    case "applications":
      return isEn ? `Applications context · ${countLabel}` : `Contexto de aplicaciones · ${countLabel}`;
    case "knowledge":
      return isEn ? `Knowledge context · ${countLabel}` : `Contexto de conocimiento · ${countLabel}`;
    case "finance":
      return isEn ? `Finance context · ${countLabel}` : `Contexto financiero · ${countLabel}`;
    default:
      return countLabel;
  }
}

export function wrapMessageWithAIContext(
  message: string,
  context?: AIContextPayload | null
): string {
  const trimmed = message.trim();
  if (!(trimmed && context)) return trimmed;

  return `${CONTEXT_START}
${JSON.stringify(context)}
${CONTEXT_END}
${trimmed}`;
}

export function stripAIContextEnvelope(content: string): {
  context: AIContextPayload | null;
  message: string;
} {
  if (!content.startsWith(CONTEXT_START)) {
    return { context: null, message: content };
  }

  const endIndex = content.indexOf(CONTEXT_END);
  if (endIndex === -1) {
    return { context: null, message: content };
  }

  const rawContext = content
    .slice(CONTEXT_START.length, endIndex)
    .trim();
  const context = parseAIContext(rawContext);
  const message = content.slice(endIndex + CONTEXT_END.length).trimStart();
  return {
    context,
    message: message || content,
  };
}
