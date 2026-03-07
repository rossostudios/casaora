import type { AgentRun, AgentRunEvent } from "@/lib/api";
import { humanizeKey } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { StatusTone } from "@/components/ui/status-badge";

export function agentRunStatusTone(status: AgentRun["status"]): StatusTone {
  switch (status) {
    case "completed":
      return "success";
    case "waiting_for_approval":
      return "warning";
    case "failed":
      return "danger";
    case "running":
      return "info";
    case "cancelled":
      return "neutral";
    default:
      return "warning";
  }
}

export function summarizeAgentRunEvent(
  event: AgentRunEvent,
  locale: Locale
): { title: string; body: string } {
  const isEn = locale === "en-US";
  const data = event.data ?? {};

  switch (event.event_type) {
    case "status": {
      const status =
        typeof data.status === "string" ? humanizeKey(data.status) : "Status";
      return {
        title: isEn ? `Status: ${status}` : `Estado: ${status}`,
        body: isEn
          ? "Run state updated."
          : "El estado de la ejecucion fue actualizado.",
      };
    }
    case "tool_call": {
      const toolName =
        typeof data.tool_name === "string" ? data.tool_name : "tool";
      return {
        title: humanizeKey(toolName),
        body: isEn ? "Tool requested." : "Herramienta solicitada.",
      };
    }
    case "tool_result": {
      const toolName =
        typeof data.tool_name === "string" ? data.tool_name : "tool";
      const ok = data.ok === true;
      const status =
        typeof data.status === "string"
          ? data.status.trim().toLowerCase()
          : "";
      if (status === "rejected") {
        return {
          title: humanizeKey(toolName),
          body: isEn
            ? "Approval was rejected by an operator."
            : "La aprobacion fue rechazada por un operador.",
        };
      }
      if (status === "execution_failed") {
        return {
          title: humanizeKey(toolName),
          body: isEn
            ? "Approved action failed during execution."
            : "La accion aprobada fallo durante la ejecucion.",
        };
      }
      return {
        title: humanizeKey(toolName),
        body: ok
          ? isEn
            ? "Tool completed successfully."
            : "La herramienta se completo correctamente."
          : isEn
            ? "Tool execution needs review."
            : "La ejecucion de la herramienta requiere revision.",
      };
    }
    case "approval_required": {
      const count =
        typeof data.count === "number"
          ? data.count
          : Array.isArray(data.approval_ids)
            ? data.approval_ids.length
            : 0;
      return {
        title: isEn ? "Approval required" : "Aprobacion requerida",
        body: isEn
          ? `${count} action${count === 1 ? "" : "s"} waiting for review.`
          : `${count} accion${count === 1 ? "" : "es"} en espera de revision.`,
      };
    }
    case "text_delta": {
      const text = typeof data.text === "string" ? data.text.trim() : "";
      return {
        title: isEn ? "Assistant reply" : "Respuesta del asistente",
        body: text || (isEn ? "Response generated." : "Respuesta generada."),
      };
    }
    case "error": {
      const message =
        typeof data.message === "string"
          ? data.message
          : isEn
            ? "Run failed."
            : "La ejecucion fallo.";
      return {
        title: isEn ? "Run error" : "Error de ejecucion",
        body: message,
      };
    }
    default:
      return {
        title: humanizeKey(event.event_type),
        body: isEn ? "Event recorded." : "Evento registrado.",
      };
  }
}

export function extractAgentRunReplyPreview(run: AgentRun): string {
  if (!run.result || typeof run.result !== "object") return "";
  const reply = run.result.reply;
  return typeof reply === "string" ? reply.trim() : "";
}
