"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useRealtimeSubscription,
  type RealtimeInsertPayload,
} from "@/lib/supabase/use-realtime-subscription";

type UseNewBookingToastOptions = {
  enabled?: boolean;
  isEn?: boolean;
};

export function useNewBookingToast({
  enabled = true,
  isEn = true,
}: UseNewBookingToastOptions = {}) {
  const router = useRouter();

  const handleInsert = useCallback(
    (payload: RealtimeInsertPayload) => {
      const row = payload.new;
      const guestName =
        typeof row.guest_name === "string" ? row.guest_name : "";
      const unitName =
        typeof row.unit_name === "string" ? row.unit_name : "";
      const id = typeof row.id === "string" ? row.id : "";

      const description = [guestName, unitName].filter(Boolean).join(" — ") ||
        (isEn ? "New booking" : "Nueva reserva");

      toast.success(
        isEn ? "New marketplace booking!" : "¡Nueva reserva del marketplace!",
        {
          description,
          action: id
            ? {
                label: isEn ? "View" : "Ver",
                onClick: () => router.push(`/module/reservations/${id}`),
              }
            : undefined,
          duration: 8000,
        },
      );

      router.refresh();
    },
    [isEn, router],
  );

  useRealtimeSubscription({
    table: "reservations",
    event: "INSERT",
    filter: "source=eq.direct_booking",
    enabled,
    onInsert: handleInsert,
  });
}
