"use client";

import { useQuery } from "@tanstack/react-query";

type ContextualSuggestion = {
  text: string;
  category?: string;
};

export function useContextualSuggestions(orgId: string, enabled = true) {
  return useQuery<ContextualSuggestion[]>({
    queryKey: ["contextual-prompts", orgId],
    queryFn: async () => {
      const res = await fetch(
        `/api/agent/chats/contextual-prompts?org_id=${encodeURIComponent(orgId)}`,
        { cache: "no-store", headers: { Accept: "application/json" } }
      );
      if (!res.ok) return [];
      const payload = (await res.json()) as { data?: ContextualSuggestion[] };
      return payload.data ?? [];
    },
    staleTime: 120_000,
    enabled: enabled && !!orgId,
    retry: false,
  });
}
