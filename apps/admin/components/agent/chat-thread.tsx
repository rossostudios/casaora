"use client";

import { PlusSignIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StructuredContent } from "@/components/agent/action-card";
import { AutonomyIndicator } from "@/components/agent/autonomy-indicator";
import { ChatEmptyState } from "@/components/agent/chat-empty-state";
import { MorningBriefing } from "@/components/agent/briefing";
import { ChatHeader } from "@/components/agent/chat-header";
import { ChatInputBar } from "@/components/agent/chat-input-bar";
import {
  ChatMessage,
  type DisplayMessage,
} from "@/components/agent/chat-message";
import {
  fetchThread,
  MESSAGE_SKELETON_KEYS,
  normalizeAgents,
  normalizeChat,
  QUICK_PROMPTS,
  type ThreadData,
} from "@/components/agent/chat-thread-types";
import {
  ChatToolEventStrip,
  type StreamToolEvent,
} from "@/components/agent/chat-tool-event";
import type { ExplanationPayload } from "@/components/agent/explainability-panel";
import {
  type DataUIPart,
  isTextUIPart,
  type UIDataTypes,
  type UIMessage,
  useAgentChatStream,
} from "@/components/agent/use-agent-chat-stream";
import { useChatAttachments } from "@/components/agent/use-chat-attachments";
import { useContextualSuggestions } from "@/components/agent/use-contextual-suggestions";
import { useVoiceChat } from "@/components/agent/use-voice-chat";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/conversation";
import { Icon } from "@/components/ui/icon";
import { Message, MessageContent } from "@/components/ui/message";
import { Skeleton } from "@/components/ui/skeleton";
import {
  stripAIContextEnvelope,
  summarizeAIContext,
  wrapMessageWithAIContext,
} from "@/lib/ai-context";
import type {
  AIContextPayload,
} from "@/lib/workspace-types";
import {
  type AutonomyLevel,
  deriveAutonomyLevel,
} from "@/lib/agents/autonomy-level";
import type {
  AgentChatMessage,
  AgentChatSummary,
  AgentDefinition,
  AgentModelOption,
} from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type StreamMeta = {
  agent_run_id?: string | null;
  trace_id?: string | null;
  model_used?: string | null;
  fallback_used?: boolean;
  tool_trace?: AgentChatMessage["tool_trace"];
  structured_content?: StructuredContent | null;
  explanation?: ExplanationPayload | null;
};

function normalizeModels(payload: unknown): AgentModelOption[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown[] }).data;
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const models: AgentModelOption[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const model =
      typeof item.model === "string"
        ? item.model.trim()
        : typeof item.id === "string"
          ? item.id.trim()
          : "";
    if (!model || seen.has(model)) continue;
    seen.add(model);
    models.push({ model, is_primary: item.is_primary === true });
  }
  return models;
}

function extractUiMessageText(message: UIMessage | undefined): string {
  if (!message) return "";
  const chunks: string[] = [];
  for (const part of message.parts) {
    if (!isTextUIPart(part)) continue;
    const text = part.text.trim();
    if (text) chunks.push(text);
  }
  return chunks.join("").trim();
}

// ---------------------------------------------------------------------------
// ChatThread — orchestrator
// ---------------------------------------------------------------------------

export function ChatThread({
  orgId,
  locale,
  chatId,
  defaultAgentSlug,
  mode = "full",
  freshKey,
  firstName,
  dashboardStats,
  initialPrompt,
  aiContext,
  onClose,
}: {
  orgId: string;
  locale: Locale;
  chatId?: string;
  defaultAgentSlug?: string;
  mode?: "full" | "embedded" | "hero";
  freshKey?: string;
  firstName?: string;
  dashboardStats?: Record<string, unknown>;
  initialPrompt?: string;
  aiContext?: AIContextPayload | null;
  onClose?: () => void;
}) {
  const isEn = locale === "en-US";
  const isEmbedded = mode === "embedded";
  const isHero = mode === "hero";
  const isChatDetailRoute = Boolean(chatId);
  const router = useRouter();
  const queryClient = useQueryClient();

  // --- state ---------------------------------------------------------------
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(chatId);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [localChat, setLocalChat] = useState<AgentChatSummary | null>(null);
  const [streamToolEvents, setStreamToolEvents] = useState<StreamToolEvent[]>(
    []
  );
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamMetaByMessageId, setStreamMetaByMessageId] = useState<
    Record<string, StreamMeta>
  >({});
  const [selectedAgentSlug, setSelectedAgentSlug] = useState<string>(
    defaultAgentSlug || "guest-concierge"
  );
  const [feedbackConfirmedIds, setFeedbackConfirmedIds] = useState<Set<string>>(
    new Set()
  );

  // Pre-fill draft from initialPrompt (one-time on mount)
  useEffect(() => {
    if (initialPrompt) setDraft(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeChatIdRef = useRef<string | undefined>(chatId);
  const pendingSendRef = useRef<{
    chatId: string;
    message: string;
    fallbackAttempted: boolean;
  } | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // --- agent definitions query --------------------------------------------
  const agentsQuery = useQuery<AgentDefinition[], Error>({
    queryKey: ["agents", orgId],
    queryFn: async () => {
      const res = await fetch(
        `/api/agent/agents?org_id=${encodeURIComponent(orgId)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }
      );
      const payload = (await res.json()) as unknown;
      if (!res.ok) return [];
      return normalizeAgents(payload);
    },
    staleTime: 60_000,
    enabled: !!orgId,
    retry: false,
  });

  const activeAgents = useMemo(
    () => (agentsQuery.data ?? []).filter((a) => a.is_active !== false),
    [agentsQuery.data]
  );

  // --- autonomy level -------------------------------------------------------
  const approvalPoliciesQuery = useQuery({
    queryKey: ["approval-policies", orgId],
    queryFn: async () => {
      const res = await fetch(
        `/api/agent/approval-policies?org_id=${encodeURIComponent(orgId)}`,
        { cache: "no-store", headers: { Accept: "application/json" } }
      );
      if (!res.ok) return [];
      const payload = (await res.json()) as {
        data?: Array<{
          tool_name: string;
          approval_mode: string;
          enabled: boolean;
        }>;
      };
      return payload.data ?? [];
    },
    staleTime: 120_000,
    enabled: !!orgId,
    retry: false,
  });

  const autonomyLevel: AutonomyLevel = useMemo(
    () => deriveAutonomyLevel(approvalPoliciesQuery.data ?? []),
    [approvalPoliciesQuery.data]
  );

  // --- contextual suggestions -----------------------------------------------
  const contextualSuggestionsQuery = useContextualSuggestions(
    orgId,
    !activeChatId && !!orgId
  );

  // --- daily summary (proactive briefing) ------------------------------------
  const dailySummaryQuery = useQuery({
    queryKey: ["daily-summary", orgId],
    queryFn: async () => {
      const res = await fetch(
        `/api/agent/daily-summary?org_id=${encodeURIComponent(orgId)}`,
        { cache: "no-store", headers: { Accept: "application/json" } }
      );
      if (!res.ok) return [];
      const payload = (await res.json()) as {
        data?: Array<{ label: string; count: number; urgent?: boolean }>;
      };
      return payload.data ?? [];
    },
    staleTime: 300_000,
    enabled: !activeChatId && !!orgId,
    retry: false,
  });

  // Keep one visible assistant in the UI while still falling back safely if
  // the supervisor agent is unavailable in a given environment.
  useEffect(() => {
    if (activeAgents.length === 0) return;
    const currentExists = activeAgents.some(
      (a) => a.slug === selectedAgentSlug
    );
    if (!currentExists) {
      const preferred = activeAgents.find((a) => a.slug === "supervisor");
      setSelectedAgentSlug(preferred?.slug ?? activeAgents[0].slug);
    }
  }, [activeAgents, selectedAgentSlug]);

  // --- queries -------------------------------------------------------------
  const threadQuery = useQuery<ThreadData, Error>({
    queryKey: ["agent-thread", activeChatId, orgId],
    queryFn: () => {
      if (!activeChatId)
        throw new Error(isEn ? "Missing chat id." : "Falta id de chat.");
      return fetchThread(activeChatId, orgId);
    },
    enabled: !!activeChatId,
  });

  // Model options — fail silently (no error banners)
  const modelOptionsQuery = useQuery<AgentModelOption[], Error>({
    queryKey: ["agent-model-options", orgId],
    queryFn: async () => {
      const res = await fetch(
        `/api/agent/models?org_id=${encodeURIComponent(orgId)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }
      );
      const payload = (await res.json()) as unknown;
      if (!res.ok) return [];
      return normalizeModels(payload);
    },
    staleTime: 60_000,
    enabled: !!orgId,
    retry: false,
  });

  // --- voice chat ----------------------------------------------------------
  const handleVoiceSend = useCallback((text: string) => {
    if (!text.trim()) return;
    setDraft("");
    handleSendRef.current(text);
  }, []);

  const voice = useVoiceChat(handleVoiceSend);

  // --- attachments ---------------------------------------------------------
  const attachmentHook = useChatAttachments(orgId, isEn);

  const {
    messages: liveMessages,
    sendMessage,
    stop,
    setMessages: setLiveMessages,
    status,
    error: chatError,
    clearError,
  } = useAgentChatStream({
    prepareRequest: ({ text }) => {
      const cid = activeChatIdRef.current;
      if (!cid)
        throw new Error(isEn ? "Missing chat id." : "Falta id de chat.");
      if (!text.trim())
        throw new Error(
          isEn ? "Missing message content." : "Falta contenido del mensaje."
        );
      return {
        api: `/api/agent/chats/${encodeURIComponent(cid)}/messages/stream?org_id=${encodeURIComponent(orgId)}`,
        body: { org_id: orgId, message: text },
      };
    },
    onData: (part: DataUIPart<UIDataTypes>) => {
      const typed = part as { type: string; data?: unknown };
      if (typed.type === "data-casaora-status") {
        if (typed.data && typeof typed.data === "object") {
          const msg = (typed.data as { message?: unknown }).message;
          if (typeof msg === "string" && msg.trim())
            setStreamStatus(msg.trim());
        }
        return;
      }
      if (typed.type === "data-casaora-tool") {
        if (typed.data && typeof typed.data === "object") {
          const d = typed.data as {
            phase?: unknown;
            tool_name?: unknown;
            tool_call_id?: unknown;
            ok?: unknown;
            preview?: unknown;
          };
          setStreamToolEvents((prev) => [
            ...prev,
            {
              phase: d.phase === "result" ? "result" : "call",
              tool_name:
                typeof d.tool_name === "string" && d.tool_name.trim()
                  ? d.tool_name.trim()
                  : "tool",
              tool_call_id:
                typeof d.tool_call_id === "string" && d.tool_call_id.trim()
                  ? d.tool_call_id.trim()
                  : `tool-${Date.now()}`,
              ok: typeof d.ok === "boolean" ? d.ok : undefined,
              preview: typeof d.preview === "string" ? d.preview : undefined,
            },
          ]);
        }
        return;
      }
      if (typed.type === "data-casaora-structured") {
        if (typed.data && typeof typed.data === "object") {
          const d = typed.data as {
            messageId?: unknown;
            structured_content?: unknown;
          };
          const mid = typeof d.messageId === "string" ? d.messageId : "";
          if (!(mid && d.structured_content)) return;
          setStreamMetaByMessageId((prev) => ({
            ...prev,
            [mid]: {
              ...(prev[mid] ?? {}),
              structured_content: d.structured_content as StructuredContent,
            },
          }));
        }
        return;
      }
      if (
        typed.type === "data-casaora-meta" &&
        typed.data &&
        typeof typed.data === "object"
      ) {
        const d = typed.data as {
          messageId?: unknown;
          run_id?: unknown;
          trace_id?: unknown;
          model_used?: unknown;
          fallback_used?: unknown;
          tool_trace?: unknown;
          explanation?: unknown;
        };
        const mid = typeof d.messageId === "string" ? d.messageId : "";
        if (!mid) return;
        setStreamMetaByMessageId((prev) => ({
          ...prev,
          [mid]: {
            ...(prev[mid] ?? {}),
            agent_run_id: typeof d.run_id === "string" ? d.run_id : null,
            trace_id: typeof d.trace_id === "string" ? d.trace_id : null,
            model_used: typeof d.model_used === "string" ? d.model_used : null,
            fallback_used:
              typeof d.fallback_used === "boolean" ? d.fallback_used : false,
            tool_trace: Array.isArray(d.tool_trace)
              ? (d.tool_trace as AgentChatMessage["tool_trace"])
              : [],
            explanation:
              d.explanation && typeof d.explanation === "object"
                ? (d.explanation as ExplanationPayload)
                : null,
          },
        }));
      }
    },
    onFinish: () => {
      pendingSendRef.current = null;
      const current = activeChatIdRef.current;
      if (!current) return;
      const sync = async () => {
        await queryClient.invalidateQueries({
          queryKey: ["agent-thread", current, orgId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["agent-runs", orgId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["agent-chats", orgId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["sidebar-chat-data", orgId],
        });
        // NOTE: Do NOT clear liveMessages here.  The server-side
        // onFinish persistence may not have completed yet (or may have
        // failed entirely if the backend does not support persist_only).
        // Keeping live messages ensures the streamed assistant response
        // remains visible.  Content-based dedup in displayMessages
        // prevents duplicates once the server catches up.
        setStreamToolEvents([]);
        setStreamStatus(null);
        setStreamMetaByMessageId({});
        setLocalChat(null);
      };
      sync().catch(() => undefined);
    },
    onError: (incomingError) => {
      const pending = pendingSendRef.current;
      if (!pending || pending.fallbackAttempted) {
        setError(incomingError.message);
        return;
      }
      pending.fallbackAttempted = true;
      const runFallback = async () => {
        try {
          await sendMessageFallback(pending.chatId, pending.message);
          pendingSendRef.current = null;
          clearError();
          setError(null);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
      };
      runFallback().catch(() => undefined);
    },
  });

  // --- derived data --------------------------------------------------------
  const modelOptions = modelOptionsQuery.data ?? [];
  const primaryModel =
    modelOptions.find((i) => i.is_primary)?.model ??
    modelOptions[0]?.model ??
    "";
  const chat = localChat ?? threadQuery.data?.chat ?? null;
  const serverMessages = threadQuery.data?.messages ?? [];
  const loading = !!activeChatId && threadQuery.isLoading;
  const isSending = status === "submitted" || status === "streaming";
  const initialContextSummary = aiContext
    ? summarizeAIContext(aiContext, isEn)
    : null;

  // --- model preference ----------------------------------------------------
  const updatePreferredModel = useCallback(
    async (nextModel: string) => {
      setSelectedModel(nextModel);
      const cid = activeChatIdRef.current;
      if (!cid) return;
      setError(null);
      try {
        const res = await fetch(
          `/api/agent/chats/${encodeURIComponent(cid)}/preferences`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ org_id: orgId, preferred_model: nextModel }),
          }
        );
        const payload = (await res.json()) as {
          error?: string;
          chat?: unknown;
        };
        if (!res.ok)
          throw new Error(
            payload.error ||
              (isEn
                ? "Could not update model preference."
                : "No se pudo actualizar el modelo.")
          );
        const normalized = normalizeChat(payload.chat);
        if (normalized) setLocalChat(normalized);
        await queryClient.invalidateQueries({
          queryKey: ["agent-thread", cid, orgId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["agent-chats", orgId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["sidebar-chat-data", orgId],
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [isEn, orgId, queryClient]
  );

  // --- sync effects --------------------------------------------------------
  useEffect(() => {
    setActiveChatId(chatId);
    activeChatIdRef.current = chatId;
    setDeleteArmed(false);
    setError(null);
    setDraft("");
    setEditingSourceId(null);
    setLiveMessages([]);
    setStreamToolEvents([]);
    setStreamStatus(null);
    setStreamMetaByMessageId({});
    setLocalChat(null);
  }, [chatId, setLiveMessages]);

  useEffect(() => {
    if (!freshKey || isChatDetailRoute) return;
    setActiveChatId(undefined);
    activeChatIdRef.current = undefined;
    setDeleteArmed(false);
    setError(null);
    setDraft("");
    setEditingSourceId(null);
    setLiveMessages([]);
    setStreamToolEvents([]);
    setStreamStatus(null);
    setStreamMetaByMessageId({});
    setLocalChat(null);
  }, [freshKey, isChatDetailRoute, setLiveMessages]);

  useEffect(() => {
    const preferred = chat?.preferred_model?.trim();
    if (preferred) {
      setSelectedModel(preferred);
      return;
    }
    if (activeChatId && primaryModel && selectedModel !== primaryModel) {
      setSelectedModel(primaryModel);
      return;
    }
    if (!selectedModel && primaryModel) setSelectedModel(primaryModel);
  }, [activeChatId, chat?.preferred_model, primaryModel, selectedModel]);

  useEffect(() => {
    if (!(selectedModel && modelOptions.length && primaryModel)) return;
    if (modelOptions.some((o) => o.model === selectedModel)) return;
    setSelectedModel(primaryModel);
    const cid = activeChatIdRef.current;
    if (cid) updatePreferredModel(primaryModel).catch(() => undefined);
  }, [modelOptions, primaryModel, selectedModel, updatePreferredModel]);

  // --- display messages ----------------------------------------------------
  const serverDisplayMessages = useMemo<DisplayMessage[]>(
    () =>
      serverMessages.map((m) => {
        const parsed =
          m.role === "user"
            ? stripAIContextEnvelope(m.content)
            : { context: null, message: m.content };

        return {
          id: m.id,
          role: m.role,
          content: parsed.message,
          agent_run_id: m.agent_run_id ?? null,
          model_used: m.model_used ?? null,
          tool_trace: m.tool_trace,
          feedback_rating: m.feedback_rating ?? null,
          source: "server",
        };
      }),
    [serverMessages]
  );

  const liveDisplayMessages = useMemo<DisplayMessage[]>(() => {
    const next: DisplayMessage[] = [];
    for (const m of liveMessages) {
      if (m.role !== "user" && m.role !== "assistant") continue;
      const rawContent = extractUiMessageText(m);
      const parsed =
        m.role === "user"
          ? stripAIContextEnvelope(rawContent)
          : { context: null, message: rawContent };
      const content = parsed.message;
      if (!content && m.role === "assistant") continue;
      const meta = streamMetaByMessageId[m.id];
      next.push({
        id: m.id,
        role: m.role,
        content,
        agent_run_id: meta?.agent_run_id ?? null,
        model_used: meta?.model_used ?? null,
        tool_trace: meta?.tool_trace,
        structured_content: meta?.structured_content ?? null,
        explanation: meta?.explanation ?? null,
        source: "live",
      });
    }
    return next;
  }, [liveMessages, streamMetaByMessageId]);

  const displayMessages = useMemo<DisplayMessage[]>(() => {
    const ids = new Set(serverDisplayMessages.map((i) => i.id));
    // Content-based dedup: when persistence hasn't completed yet,
    // server messages and live messages will have different IDs for
    // the same user message.  Deduplicate by matching role + content.
    const serverUserContents = new Set(
      serverDisplayMessages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
    );
    return [
      ...serverDisplayMessages,
      ...liveDisplayMessages.filter((i) => {
        if (ids.has(i.id)) return false;
        if (i.role === "user" && serverUserContents.has(i.content))
          return false;
        return true;
      }),
    ];
  }, [liveDisplayMessages, serverDisplayMessages]);

  const activeAIContext = useMemo(() => {
    if (aiContext) return aiContext;

    for (const message of serverMessages) {
      if (message.role !== "user") continue;
      const parsed = stripAIContextEnvelope(message.content);
      if (parsed.context) return parsed.context;
    }

    for (const message of liveMessages) {
      if (message.role !== "user") continue;
      const parsed = stripAIContextEnvelope(extractUiMessageText(message));
      if (parsed.context) return parsed.context;
    }

    return null;
  }, [aiContext, liveMessages, serverMessages]);

  // --- auto-speak for voice mode -------------------------------------------
  const lastSpokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!voice.voiceModeActive) return;
    const lastAssistant = [...displayMessages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant || lastAssistant.id === lastSpokenRef.current) return;
    if (isSending) return; // wait until message is complete
    lastSpokenRef.current = lastAssistant.id;
    voice.speak(lastAssistant.content);
  }, [displayMessages, isSending, voice]);

  // --- quick prompts -------------------------------------------------------
  const quickPrompts = QUICK_PROMPTS[locale];

  // --- actions -------------------------------------------------------------
  const ensureChatId = async (): Promise<string> => {
    if (activeChatIdRef.current) return activeChatIdRef.current;
    const res = await fetch("/api/agent/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: orgId,
        agent_slug: selectedAgentSlug,
        preferred_model: selectedModel || null,
      }),
    });
    const payload = (await res.json()) as { id?: string; error?: string };
    if (!(res.ok && payload.id))
      throw new Error(
        payload.error ||
          (isEn ? "Failed to create chat." : "No se pudo crear el chat.")
      );
    const nextId = String(payload.id);
    activeChatIdRef.current = nextId;
    setActiveChatId(nextId);
    const normalized = normalizeChat(payload);
    if (normalized) setLocalChat(normalized);
    return nextId;
  };

  const sendMessageFallback = async (targetChatId: string, message: string) => {
    const res = await fetch(
      `/api/agent/chats/${encodeURIComponent(targetChatId)}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ org_id: orgId, message }),
      }
    );
    const payload = (await res.json()) as { error?: string };
    if (!res.ok)
      throw new Error(
        payload.error ||
          (isEn ? "Message failed to send." : "No se pudo enviar el mensaje.")
      );
    await queryClient.invalidateQueries({
      queryKey: ["agent-thread", targetChatId, orgId],
    });
    await queryClient.invalidateQueries({ queryKey: ["agent-runs", orgId] });
    await queryClient.invalidateQueries({ queryKey: ["agent-chats", orgId] });
    await queryClient.invalidateQueries({
      queryKey: ["sidebar-chat-data", orgId],
    });
    setLiveMessages([]);
    setStreamToolEvents([]);
    setStreamStatus(null);
    setStreamMetaByMessageId({});
    setLocalChat(null);
  };

  const handleSend = async (value?: string) => {
    const message = (value ?? draft).trim();
    if (!message || isSending) return;

    // Include attachment URLs if any
    let fullMessage = message;
    const urls = attachmentHook.getReadyUrls();
    if (urls.length > 0) {
      fullMessage = `${message}\n\n[Attachments]\n${urls.join("\n")}`;
    }

    const hasUserMessages =
      serverMessages.some((item) => item.role === "user") ||
      liveDisplayMessages.some((item) => item.role === "user");
    if (!hasUserMessages && aiContext) {
      fullMessage = wrapMessageWithAIContext(fullMessage, aiContext);
    }

    setError(null);
    clearError();
    try {
      const finalChatId = await ensureChatId();
      pendingSendRef.current = {
        chatId: finalChatId,
        message: fullMessage,
        fallbackAttempted: false,
      };
      setDraft("");
      setEditingSourceId(null);
      setStreamToolEvents([]);
      setStreamStatus(null);
      attachmentHook.clearAttachments();
      await sendMessage({ text: fullMessage });
    } catch (err) {
      const fb = pendingSendRef.current;
      if (fb && !fb.fallbackAttempted) {
        fb.fallbackAttempted = true;
        try {
          await sendMessageFallback(fb.chatId, fb.message);
          pendingSendRef.current = null;
          return;
        } catch (fe) {
          setError(fe instanceof Error ? fe.message : String(fe));
          return;
        }
      }
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Stable ref for voice callback
  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;

  const handleRetryAssistant = async (messageId: string) => {
    if (isSending) return;
    const idx = displayMessages.findIndex((m) => m.id === messageId);
    if (idx <= 0) return;
    for (let i = idx - 1; i >= 0; i -= 1) {
      if (displayMessages[i].role === "user") {
        await handleSend(displayMessages[i].content);
        return;
      }
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      /* ignore */
    }
  };

  // --- feedback on assistant messages ------------------------------------
  const [feedbackOverrides, setFeedbackOverrides] = useState<
    Record<string, "positive" | "negative">
  >({});

  const handleFeedback = useCallback(
    async (
      messageId: string,
      rating: "positive" | "negative",
      reason?: string
    ) => {
      const cid = activeChatIdRef.current;
      if (!cid) return;

      // Optimistic update
      setFeedbackOverrides((prev) => ({ ...prev, [messageId]: rating }));

      try {
        const res = await fetch(
          `/api/agent/chats/${encodeURIComponent(cid)}/messages/${encodeURIComponent(messageId)}/feedback?org_id=${encodeURIComponent(orgId)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ rating, reason }),
          }
        );
        if (res.ok) {
          // Mark feedback as confirmed
          setFeedbackConfirmedIds((prev) => new Set([...prev, messageId]));
        } else {
          // Revert on failure
          setFeedbackOverrides((prev) => {
            const next = { ...prev };
            delete next[messageId];
            return next;
          });
        }
      } catch {
        setFeedbackOverrides((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
      }
    },
    [orgId]
  );

  const resetToFreshThread = () => {
    setActiveChatId(undefined);
    activeChatIdRef.current = undefined;
    setDeleteArmed(false);
    setError(null);
    setDraft("");
    setEditingSourceId(null);
    setLocalChat(null);
    setLiveMessages([]);
    setStreamToolEvents([]);
    setFeedbackOverrides({});
    setFeedbackConfirmedIds(new Set());
    setStreamStatus(null);
    setStreamMetaByMessageId({});
    attachmentHook.clearAttachments();
    if (primaryModel) setSelectedModel(primaryModel);
  };

  const mutateChat = async (action: "archive" | "restore" | "delete") => {
    if (!activeChatIdRef.current) return;
    const cid = activeChatIdRef.current;
    setBusy(true);
    setError(null);
    const fallbackMsg = isEn
      ? "Chat update failed."
      : "La actualización del chat falló.";
    try {
      let res: Response;
      if (action === "delete") {
        res = await fetch(
          `/api/agent/chats/${encodeURIComponent(cid)}?org_id=${encodeURIComponent(orgId)}`,
          { method: "DELETE", headers: { Accept: "application/json" } }
        );
      } else {
        res = await fetch(`/api/agent/chats/${encodeURIComponent(cid)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ org_id: orgId, action }),
        });
      }
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error || fallbackMsg);
        setBusy(false);
        return;
      }
      if (action === "delete") {
        setBusy(false);
        if (isChatDetailRoute) {
          router.push("/app/chats");
          router.refresh();
          return;
        }
        resetToFreshThread();
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["agent-thread", cid, orgId],
      });
      await queryClient.invalidateQueries({ queryKey: ["agent-chats", orgId] });
      await queryClient.invalidateQueries({
        queryKey: ["sidebar-chat-data", orgId],
      });
      setBusy(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const displayError =
    error ?? threadQuery.error?.message ?? chatError?.message ?? null;

  // --- render --------------------------------------------------------------
  return (
    <div
      className={cn(
        "relative flex h-full flex-col",
        isHero
          ? "overflow-hidden bg-background"
          : isEmbedded
            ? "overflow-hidden bg-background"
            : "min-h-[calc(100vh-4rem)] bg-background"
      )}
    >
      {/* Header */}
      {isHero && displayMessages.length === 0 ? null : isHero ? (
        <div className="glass-chrome sticky top-0 z-10 flex shrink-0 items-center justify-between px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-casaora-gradient text-white shadow-casaora">
              <Icon className="h-3 w-3" icon={SparklesIcon} />
            </div>
            <h2 className="truncate font-semibold text-[13.5px] tracking-tight">
              {chat?.title || (isEn ? "Casaora AI" : "IA Casaora")}
            </h2>

            <AutonomyIndicator isEn={isEn} level={autonomyLevel} />
          </div>

          <div className="flex items-center gap-1">
            <Button
              className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground"
              disabled={isSending}
              onClick={() => resetToFreshThread()}
              size="icon"
              variant="ghost"
            >
              <Icon className="h-3.5 w-3.5" icon={PlusSignIcon} />
              <span className="sr-only">
                {isEn ? "New thread" : "Nuevo hilo"}
              </span>
            </Button>
          </div>
        </div>
      ) : (
        <ChatHeader
          busy={busy}
          chatTitle={chat?.title}
          deleteArmed={deleteArmed}
          isArchived={chat?.is_archived}
          isChatDetailRoute={isChatDetailRoute}
          isEmbedded={isEmbedded}
          isEn={isEn}
          isSending={isSending}
          loading={loading}
          modelOptions={modelOptions}
          onArchiveToggle={() => {
            const action = chat?.is_archived ? "restore" : "archive";
            mutateChat(action).catch(() => undefined);
            setDeleteArmed(false);
          }}
          onClose={onClose}
          onDeleteArm={() => setDeleteArmed(true)}
          onDeleteCancel={() => setDeleteArmed(false)}
          onDeleteConfirm={() => {
            mutateChat("delete").catch(() => undefined);
            setDeleteArmed(false);
          }}
          onHistoryClick={() => router.push("/app/chats")}
          onModelChange={(model) => {
            updatePreferredModel(model).catch(() => undefined);
          }}
          onNewThread={() => resetToFreshThread()}
          selectedModel={selectedModel}
        />
      )}

      {/* Message area — Conversation auto-scroll wrapper */}
      <Conversation
        className={cn(
          "flex-1 p-0",
          isHero ? "pb-48" : isEmbedded ? "pb-52" : "pb-48"
        )}
      >
        <ConversationContent
          className={cn(
            "mx-auto flex flex-col space-y-5 p-4 sm:p-6",
            isHero
              ? "max-w-2xl"
              : isEmbedded
                ? "max-w-4xl"
                : "max-w-3xl"
          )}
        >
          {/* Error — only real errors, no agent/model banners */}
          {displayError ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          ) : null}

          {activeAIContext ? (
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {initialContextSummary ||
                        summarizeAIContext(activeAIContext, isEn)}
                    </Badge>
                    <Badge variant="outline">
                      {isEn ? "Return path saved" : "Ruta de regreso guardada"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {activeAIContext.summary}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href={activeAIContext.returnPath}>
                    {isEn ? "Back to workspace" : "Volver al espacio"}
                  </a>
                </Button>
              </div>
            </div>
          ) : null}

          {/* Body */}
          {loading ? (
            MESSAGE_SKELETON_KEYS.map((key, i) => (
              <div
                className={cn(
                  "flex",
                  i % 2 === 0 ? "justify-end" : "justify-start"
                )}
                key={key}
              >
                <Skeleton className="h-16 w-[70%] rounded-2xl" />
              </div>
            ))
          ) : displayMessages.length === 0 ? (
            isHero && dashboardStats ? (
              <MorningBriefing
                disabled={isSending}
                firstName={firstName}
                locale={locale}
                onSend={(msg) => {
                  handleSend(msg).catch(() => undefined);
                }}
                stats={dashboardStats as unknown as import("@/components/agent/briefing/helpers").Stats}
              />
            ) : (
              <ChatEmptyState
                agentDescription={
                  isEn
                    ? "One assistant for operations, leasing, finance, and guest workflows."
                    : "Un asistente para operaciones, leasing, finanzas y flujos de huéspedes."
                }
                agentName={isEn ? "Casaora AI" : "IA Casaora"}
                contextualSuggestions={
                  contextualSuggestionsQuery.data?.map((s) => s.text) ?? []
                }
                dailySummary={dailySummaryQuery.data}
                disabled={isSending}
                firstName={isHero ? firstName : undefined}
                isEmbedded={isEmbedded}
                isEn={isEn}
                onSendPrompt={(prompt) => {
                  handleSend(prompt).catch(() => undefined);
                }}
                quickPrompts={quickPrompts}
              />
            )
          ) : (
            displayMessages.map((msg) => {
              const feedbackMsg =
                feedbackOverrides[msg.id] !== undefined
                  ? {
                      ...msg,
                      feedback_rating: feedbackOverrides[msg.id],
                      feedbackConfirmed: feedbackConfirmedIds.has(msg.id),
                    }
                  : {
                      ...msg,
                      feedbackConfirmed: feedbackConfirmedIds.has(msg.id),
                    };
              return (
                <ChatMessage
                  isEn={isEn}
                  isSending={isSending}
                  key={msg.id}
                  message={feedbackMsg}
                  onCopy={(content) => {
                    handleCopyMessage(content).catch(() => undefined);
                  }}
                  onEdit={(_, content) => {
                    setDraft(content);
                    setEditingSourceId(msg.id);
                  }}
                  onFeedback={
                    msg.role === "assistant" && msg.source === "server"
                      ? (id, rating, reason) => {
                          handleFeedback(id, rating, reason).catch(
                            () => undefined
                          );
                        }
                      : undefined
                  }
                  onQuickReply={(suggestion) => {
                    handleSend(suggestion).catch(() => undefined);
                  }}
                  onRegenerate={
                    msg.role === "assistant" && msg.source === "server"
                      ? (id) => {
                          handleRetryAssistant(id).catch(() => undefined);
                        }
                      : undefined
                  }
                  onRetry={(id) => {
                    handleRetryAssistant(id).catch(() => undefined);
                  }}
                  onSpeak={
                    voice.isSupported
                      ? (content) => voice.speak(content)
                      : undefined
                  }
                />
              );
            })
          )}

          {/* Streaming indicator — min-height prevents CLS */}
          {isSending ? (
            <Message
              className="items-start py-3"
              from="assistant"
              style={
                { minHeight: 56, contain: "layout" } as React.CSSProperties
              }
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-casaora-gradient text-white shadow-casaora">
                <Icon
                  className="h-3.5 w-3.5 animate-pulse"
                  icon={SparklesIcon}
                />
              </div>
              <MessageContent variant="flat">
                <div className="min-w-0 flex-1 space-y-2 py-0.5">
                  {streamStatus ? (
                    <p
                      className="animate-[statusFade_0.3s_ease-out] text-[12px] text-muted-foreground/70"
                      key={streamStatus}
                    >
                      {streamStatus}
                    </p>
                  ) : null}

                  {streamToolEvents.length > 0 ? (
                    <ChatToolEventStrip events={streamToolEvents} isEn={isEn} />
                  ) : null}

                  {streamToolEvents.length === 0 && !streamStatus ? (
                    <p className="flex items-center gap-2.5 text-[13px] text-muted-foreground/60">
                      <span className="flex gap-1">
                        <span
                          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--sidebar-primary)]/60"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--sidebar-primary)]/60"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--sidebar-primary)]/60"
                          style={{ animationDelay: "300ms" }}
                        />
                      </span>
                      {isEn
                        ? "Casaora AI is thinking..."
                        : "Casaora AI está pensando..."}
                    </p>
                  ) : null}
                </div>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      {/* Input bar */}
      <ChatInputBar
        agentName={isEn ? "Casaora AI" : "IA Casaora"}
        attachments={attachmentHook.attachments}
        attachmentsReady={attachmentHook.allReady}
        draft={draft}
        editingSourceId={editingSourceId}
        hasMessages={displayMessages.length > 0}
        isEmbedded={isEmbedded}
        isEn={isEn}
        isHero={isHero}
        isListening={voice.isListening}
        isSending={isSending}
        onAddFiles={(files) => attachmentHook.addFiles(files)}
        onCancelEdit={() => setEditingSourceId(null)}
        onDraftChange={setDraft}
        onRemoveAttachment={attachmentHook.removeAttachment}
        onSend={(value) => {
          handleSend(value).catch(() => undefined);
        }}
        onStop={() => stop()}
        onToggleVoice={voice.toggleVoiceMode}
        voiceModeActive={voice.voiceModeActive}
        voiceSupported={voice.isSupported}
        voiceTranscript={voice.transcript}
      />
    </div>
  );
}
