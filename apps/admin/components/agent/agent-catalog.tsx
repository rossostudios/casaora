"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { AgentDefinition } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

function normalizeAgents(payload: unknown): AgentDefinition[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown[] }).data;
  if (!Array.isArray(data)) return [];
  return data
    .filter((item): item is AgentDefinition =>
      Boolean(item && typeof item === "object")
    )
    .map((item) => ({
      id: String(item.id ?? ""),
      slug: String(item.slug ?? ""),
      name: String(item.name ?? ""),
      description: String(item.description ?? ""),
      icon_key: typeof item.icon_key === "string" ? item.icon_key : undefined,
      is_active: Boolean(item.is_active ?? true),
    }))
    .filter((item) => item.id && item.slug && item.name);
}

const AGENT_SKELETON_KEYS = [
  "agent-skeleton-1",
  "agent-skeleton-2",
  "agent-skeleton-3",
  "agent-skeleton-4",
  "agent-skeleton-5",
  "agent-skeleton-6",
];

export function AgentCatalog({
  orgId,
  locale,
  autoStart,
  initialAgentSlug,
}: {
  orgId: string;
  locale: Locale;
  autoStart: boolean;
  initialAgentSlug?: string;
}) {
  const isEn = locale === "en-US";
  const router = useRouter();
  const autoStartTriggered = useRef<boolean>(false);

  const targetAgentSlug = useMemo(
    () => initialAgentSlug?.trim() || null,
    [initialAgentSlug]
  );

  const agentsQuery = useQuery({
    queryKey: ["agents", orgId],
    queryFn: async () => {
      const fallbackMsg = isEn
        ? "Could not load agents."
        : "No se pudieron cargar los agentes.";

      const response = await fetch(
        `/api/agent/agents?org_id=${encodeURIComponent(orgId)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        let message = fallbackMsg;
        if (payload != null && typeof payload === "object" && "error" in payload) {
          message = String((payload as { error?: unknown }).error);
        }
        throw new Error(message);
      }

      return normalizeAgents(payload);
    },
  });

  const agents = agentsQuery.data ?? [];
  const loading = agentsQuery.isLoading;

  const createChatMutation = useMutation({
    mutationFn: async (agentSlug: string) => {
      const fallbackMsg = isEn ? "Could not create chat." : "No se pudo crear el chat.";

      const response = await fetch("/api/agent/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          org_id: orgId,
          agent_slug: agentSlug,
        }),
      });

      const payload = (await response.json()) as {
        id?: string;
        error?: string;
      };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error || fallbackMsg);
      }

      return payload.id;
    },
    onSuccess: (chatId) => {
      router.push(`/app/chats/${encodeURIComponent(chatId)}`);
      router.refresh();
    },
  });

  const error = agentsQuery.error?.message ?? createChatMutation.error?.message ?? null;
  const creatingSlug = createChatMutation.isPending
    ? (createChatMutation.variables ?? null)
    : null;

  useEffect(() => {
    if (!autoStart || loading || autoStartTriggered.current) {
      return;
    }

    if (!agents.length) {
      return;
    }

    const target =
      (targetAgentSlug &&
        agents.find((agent) => agent.slug === targetAgentSlug)) ||
      agents[0];

    if (!target) {
      return;
    }

    autoStartTriggered.current = true;
    createChatMutation.mutate(target.slug, {
      onError: () => {
        autoStartTriggered.current = false;
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, loading, agents, targetAgentSlug]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{isEn ? "Agents" : "Agentes"}</CardTitle>
            <CardDescription>
              {isEn
                ? "Choose a specialized assistant for operations, leasing, finance, and growth."
                : "Elige un asistente especializado para operaciones, leasing, finanzas y crecimiento."}
            </CardDescription>
          </div>
          <Button onClick={() => router.push("/app/chats")} variant="outline">
            {isEn ? "View chats" : "Ver chats"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>
                {isEn ? "Request failed" : "Solicitud fallida"}
              </AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {AGENT_SKELETON_KEYS.map((key) => (
                <Card key={key}>
                  <CardHeader className="space-y-3 pb-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-9 w-28" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => (
                <Card key={agent.id}>
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <Badge variant="secondary">{isEn ? "AI" : "IA"}</Badge>
                    </div>
                    <CardDescription>{agent.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      disabled={creatingSlug !== null}
                      onClick={() => {
                        createChatMutation.reset();
                        createChatMutation.mutate(agent.slug);
                      }}
                    >
                      {creatingSlug === agent.slug
                        ? isEn
                          ? "Opening..."
                          : "Abriendo..."
                        : isEn
                          ? "Start chat"
                          : "Iniciar chat"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
