"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type RealtimeInsertPayload<T = Record<string, unknown>> = {
  new: T;
  old: Record<string, unknown>;
  eventType: "INSERT";
};

type UseRealtimeSubscriptionOptions = {
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  schema?: string;
  enabled?: boolean;
  onInsert?: (payload: RealtimeInsertPayload) => void;
  onUpdate?: (payload: {
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => void;
  onDelete?: (payload: { old: Record<string, unknown> }) => void;
};

export function useRealtimeSubscription({
  table,
  event = "*",
  filter,
  schema = "public",
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseBrowserClient();
    const channelName = `realtime-${table}-${Date.now()}`;

    const channel = supabase.channel(channelName);

    const postgresChangesFilter: {
      event: "INSERT" | "UPDATE" | "DELETE" | "*";
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema,
      table,
    };

    if (filter) {
      postgresChangesFilter.filter = filter;
    }

    channel
      .on(
        "postgres_changes" as never,
        postgresChangesFilter as never,
        (payload: {
          eventType: string;
          new: Record<string, unknown>;
          old: Record<string, unknown>;
        }) => {
          if (payload.eventType === "INSERT" && onInsert) {
            onInsert(payload as RealtimeInsertPayload);
          } else if (payload.eventType === "UPDATE" && onUpdate) {
            onUpdate({ new: payload.new, old: payload.old });
          } else if (payload.eventType === "DELETE" && onDelete) {
            onDelete({ old: payload.old });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [table, event, filter, schema, enabled, onInsert, onUpdate, onDelete]);
}
