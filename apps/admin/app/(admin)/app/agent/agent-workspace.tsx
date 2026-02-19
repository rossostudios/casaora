"use client";

import { SparklesIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type AgentWorkspaceProps = {
  orgId: string;
  locale: Locale;
  startFresh: boolean;
};

type Role = "user" | "assistant";

type ToolTraceItem = {
  tool?: string;
  ok?: boolean;
  preview?: string;
  args?: Record<string, unknown>;
};

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  toolTrace?: ToolTraceItem[];
};

type AgentReply = {
  reply?: string;
  tool_trace?: ToolTraceItem[];
};

const STARTER_PROMPTS = {
  "en-US": [
    "Show me operations bottlenecks this week.",
    "List overdue tasks and suggest actions.",
    "Find leases with late collections.",
    "Create a high-priority task for tomorrow at 9 AM.",
  ],
  "es-PY": [
    "Muéstrame cuellos de botella operativos esta semana.",
    "Lista tareas vencidas y sugiere acciones.",
    "Busca contratos con cobranzas atrasadas.",
    "Crea una tarea urgente para mañana a las 9 AM.",
  ],
};

function nowIso(): string {
  return new Date().toISOString();
}

function fromStorage(key: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const rows: ChatMessage[] = [];
    parsed.forEach((item, index) => {
      if (!item) return;
      if (typeof item !== "object") return;
      const record = item as Record<string, unknown>;
      let role: Role;
      if (record.role === "user") {
        role = "user";
      } else {
        role = "assistant";
      }
      let content: string;
      if (typeof record.content === "string") {
        content = record.content.trim();
      } else {
        content = "";
      }
      if (!content) return;

      let id: string;
      if (typeof record.id === "string") {
        if (record.id) {
          id = record.id;
        } else {
          id = `${role}-restored-${index + 1}`;
        }
      } else {
        id = `${role}-restored-${index + 1}`;
      }

      let createdAt: string;
      if (typeof record.createdAt === "string") {
        if (record.createdAt) {
          createdAt = record.createdAt;
        } else {
          createdAt = nowIso();
        }
      } else {
        createdAt = nowIso();
      }

      let toolTrace: ToolTraceItem[] | undefined;
      if (Array.isArray(record.toolTrace)) {
        toolTrace = record.toolTrace as ToolTraceItem[];
      } else {
        toolTrace = undefined;
      }

      rows.push({
        id,
        role,
        content,
        createdAt,
        toolTrace,
      });
    });
    return rows;
  } catch {
    return [];
  }
}

function toStorage(key: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(messages));
  } catch {
    // Ignore storage failures.
  }
}

export function AgentWorkspace({
  orgId,
  locale,
  startFresh,
}: AgentWorkspaceProps) {
  const isEn = locale === "en-US";
  const storageKey = `pa-agent-chat:${orgId}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (startFresh) return [];
    if (typeof window === "undefined") return [];
    return fromStorage(`pa-agent-chat:${orgId}`);
  });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowMutations, setAllowMutations] = useState(false);

  const messageCounter = useRef(0);

  const [prevStorageKey, setPrevStorageKey] = useState(storageKey);
  const [prevStartFresh, setPrevStartFresh] = useState(startFresh);
  if (storageKey !== prevStorageKey || startFresh !== prevStartFresh) {
    setPrevStorageKey(storageKey);
    setPrevStartFresh(startFresh);
    if (startFresh) {
      setMessages([]);
    } else {
      setMessages(fromStorage(storageKey));
    }
  }

  useEffect(() => {
    if (startFresh) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore storage failures.
      }
    }
  }, [startFresh, storageKey]);

  useEffect(() => {
    toStorage(storageKey, messages);
  }, [messages, storageKey]);

  const prompts = STARTER_PROMPTS[locale] ?? STARTER_PROMPTS["es-PY"];

  const nextMessageId = (role: Role): string => {
    messageCounter.current += 1;
    return `${role}-${messageCounter.current}`;
  };

  const createMessage = (
    role: Role,
    content: string,
    toolTrace?: ToolTraceItem[]
  ): ChatMessage => ({
    id: nextMessageId(role),
    role,
    content,
    createdAt: nowIso(),
    toolTrace,
  });

  const conversation = messages.slice(-12).map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));

  const sendMessage = async (inputOverride?: string) => {
    const raw = typeof inputOverride === "string" ? inputOverride : draft;
    const message = raw.trim();
    if (!message || sending) return;

    const userMessage = createMessage("user", message);

    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");

    const defaultErrorDetail = isEn
      ? "Agent request failed."
      : "La solicitud al agente falló.";
    const defaultReply = isEn
      ? "No response generated."
      : "No se generó respuesta.";
    const failureReply = isEn
      ? "I could not complete that request. Please try again."
      : "No pude completar esa solicitud. Intenta de nuevo.";

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          org_id: orgId,
          message,
          conversation,
          allow_mutations: allowMutations,
        }),
      });

      const payload = (await response.json()) as AgentReply & {
        error?: string;
      };

      if (!response.ok) {
        let detail: string;
        if (typeof payload.error === "string") {
          if (payload.error) {
            detail = payload.error;
          } else {
            detail = defaultErrorDetail;
          }
        } else {
          detail = defaultErrorDetail;
        }
        setError(detail);
        setMessages((prev) => [
          ...prev,
          createMessage("assistant", failureReply),
        ]);
        setSending(false);
        return;
      }

      let reply: string;
      if (typeof payload.reply === "string") {
        if (payload.reply.trim()) {
          reply = payload.reply.trim();
        } else {
          reply = defaultReply;
        }
      } else {
        reply = defaultReply;
      }
      let toolTrace: ToolTraceItem[] | undefined;
      if (Array.isArray(payload.tool_trace)) {
        toolTrace = payload.tool_trace;
      } else {
        toolTrace = undefined;
      }

      setMessages((prev) => [
        ...prev,
        createMessage("assistant", reply, toolTrace),
      ]);
      setSending(false);
    } catch (err) {
      let detail: string;
      if (err instanceof Error) {
        detail = err.message;
      } else {
        detail = String(err);
      }
      setError(detail);
      setMessages((prev) => [
        ...prev,
        createMessage("assistant", failureReply),
      ]);
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {isEn ? "AI Agent" : "Agente IA"}
                </Badge>
                <Badge variant={allowMutations ? "default" : "outline"}>
                  {allowMutations
                    ? isEn
                      ? "Read + write"
                      : "Lectura + escritura"
                    : isEn
                      ? "Read-only"
                      : "Solo lectura"}
                </Badge>
              </div>
              <CardTitle className="text-2xl">
                {isEn ? "Operations Copilot" : "Copiloto de Operaciones"}
              </CardTitle>
              <CardDescription>
                {isEn
                  ? "Ask questions, analyze bottlenecks, and execute database-backed actions."
                  : "Haz preguntas, analiza cuellos de botella y ejecuta acciones con acceso a base de datos."}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setMessages([]);
                  setDraft("");
                  setError(null);
                }}
                variant="outline"
              >
                {isEn ? "New chat" : "Nuevo chat"}
              </Button>
              <Button
                onClick={() => setAllowMutations((value) => !value)}
                variant={allowMutations ? "default" : "secondary"}
              >
                {allowMutations
                  ? isEn
                    ? "Writes enabled"
                    : "Escritura habilitada"
                  : isEn
                    ? "Enable writes"
                    : "Habilitar escritura"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={allowMutations ? "warning" : "info"}>
            <AlertTitle>
              {allowMutations
                ? isEn
                  ? "Write mode active"
                  : "Modo escritura activo"
                : isEn
                  ? "Read-only mode"
                  : "Modo solo lectura"}
            </AlertTitle>
            <AlertDescription>
              {allowMutations
                ? isEn
                  ? "The agent can run create/update/delete operations in your organization scope."
                  : "El agente puede ejecutar operaciones de crear/actualizar/eliminar dentro de tu organización."
                : isEn
                  ? "The agent can inspect and analyze data without mutating records."
                  : "El agente puede inspeccionar y analizar datos sin modificar registros."}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="max-h-[52vh] space-y-3 overflow-y-auto rounded-xl border bg-background/70 p-3">
              {messages.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-muted-foreground text-sm">
                  {isEn
                    ? "Start by asking the agent about tasks, applications, leases, collections, or marketplace performance."
                    : "Comienza preguntando por tareas, aplicaciones, contratos, cobranzas o rendimiento del marketplace."}
                </div>
              ) : (
                messages.map((entry) => (
                  <div
                    className={cn(
                      "flex",
                      entry.role === "user" ? "justify-end" : "justify-start"
                    )}
                    key={entry.id}
                  >
                    <div
                      className={cn(
                        "max-w-[92%] rounded-2xl border px-3 py-2",
                        entry.role === "user"
                          ? "border-primary/25 bg-primary/10"
                          : "border-border/60 bg-card"
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wide">
                        {entry.role === "user"
                          ? isEn
                            ? "You"
                            : "Tú"
                          : isEn
                            ? "Agent"
                            : "Agente"}
                      </div>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                        {entry.content}
                      </p>

                      {entry.role === "assistant" && entry.toolTrace?.length ? (
                        <Collapsible>
                          <CollapsibleTrigger className="mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                            <Icon icon={SparklesIcon} size={12} />
                            {isEn ? "Tool trace" : "Traza de herramientas"}
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 space-y-1 rounded-lg border bg-muted/20 p-2">
                              {entry.toolTrace.map((tool) => (
                                <div
                                  className="flex items-center justify-between gap-2 rounded-md bg-background/80 px-2 py-1"
                                  key={`${entry.id}-${tool.tool ?? "tool"}-${tool.preview ?? ""}-${String(tool.ok)}`}
                                >
                                  <span className="font-mono text-[11px]">
                                    {tool.tool || "tool"}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {tool.preview || (tool.ok ? "ok" : "error")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : null}
                    </div>
                  </div>
                ))
              )}

              {sending ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border bg-card px-3 py-2 text-muted-foreground text-sm">
                    {isEn
                      ? "Agent is thinking..."
                      : "El agente está pensando..."}
                  </div>
                </div>
              ) : null}
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {isEn ? "Request failed" : "Solicitud fallida"}
                </AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <Button
                  className="h-8 rounded-full px-3 text-[12px]"
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  size="sm"
                  variant="outline"
                >
                  {prompt}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Textarea
                maxLength={4000}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    event.preventDefault();
                    sendMessage().catch(() => undefined);
                  }
                }}
                placeholder={
                  isEn
                    ? "Ask the AI agent anything about your operations..."
                    : "Pregunta al agente IA sobre tus operaciones..."
                }
                rows={4}
                value={draft}
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {isEn
                    ? "Send with Cmd/Ctrl + Enter"
                    : "Enviar con Cmd/Ctrl + Enter"}
                </span>
                <Button
                  disabled={sending || !draft.trim()}
                  onClick={() => {
                    sendMessage().catch(() => undefined);
                  }}
                >
                  <Icon icon={Tick01Icon} size={14} />
                  {isEn ? "Send" : "Enviar"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
