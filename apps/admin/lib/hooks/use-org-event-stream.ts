"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * SSE hook for real-time operational events.
 * Connects to `/v1/notifications/stream?org_id=X` and invalidates
 * relevant React Query caches when events arrive, replacing polling.
 */
export function useOrgEventStream({
  orgId,
  apiBaseUrl,
  getAccessToken,
}: {
  orgId: string | null | undefined;
  apiBaseUrl?: string;
  getAccessToken?: () => Promise<string | null>;
}) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!orgId) return;

    const base =
      apiBaseUrl ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8000/v1";
    const url = `${base}/notifications/stream?org_id=${encodeURIComponent(orgId)}`;

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1000;
    const MAX_RECONNECT_DELAY = 30000;

    // Debounce cache invalidations — coalesce events within 500ms
    const pendingKeys = new Set<string>();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleInvalidation(key: string) {
      pendingKeys.add(key);
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        for (const k of pendingKeys) {
          queryClient.invalidateQueries({ queryKey: [k, orgId] });
        }
        pendingKeys.clear();
      }, 500);
    }

    function connect() {
      es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener("notification", (e) => {
        try {
          const data = JSON.parse(e.data);
          const eventType = data?.event_type;

          // Invalidate relevant query caches based on event type
          if (
            eventType === "approval_pending" ||
            eventType === "approval_reviewed"
          ) {
            scheduleInvalidation("agent-approvals");
            scheduleInvalidation("agent-runs");
            scheduleInvalidation("agent-run-events");
            scheduleInvalidation("approvals");
          }

          // Invalidate notifications for any event
          scheduleInvalidation("notifications");
          scheduleInvalidation("unread-count");

          // Agent-related events
          if (
            eventType === "agent_invoked" ||
            eventType === "agent_completed"
          ) {
            scheduleInvalidation("agent-inbox");
            scheduleInvalidation("agent-runs");
            scheduleInvalidation("agent-run-events");
          }
        } catch {
          // Ignore malformed events
        }
      });

      es.addEventListener("connected", () => {
        reconnectDelay = 1000; // Reset backoff on successful connect
      });

      es.onerror = () => {
        es?.close();
        eventSourceRef.current = null;

        // Reconnect with exponential backoff
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
          connect();
        }, reconnectDelay);
      };
    }

    connect();

    return () => {
      es?.close();
      eventSourceRef.current = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [orgId, apiBaseUrl, queryClient, getAccessToken]);
}
