"use client";

import { ChatThread } from "@/components/agent/chat-thread";
import { Sheet } from "@/components/ui/sheet";
import type { Locale } from "@/lib/i18n";

type AIChatPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string | null;
  locale: Locale;
};

export function AIChatPanel({
  open,
  onOpenChange,
  orgId,
  locale,
}: AIChatPanelProps) {
  return (
    <Sheet
      contentClassName="w-[min(96vw,28rem)]"
      headerless
      onOpenChange={onOpenChange}
      open={open}
      side="right"
    >
      {orgId ? (
        <ChatThread
          locale={locale}
          mode="embedded"
          onClose={() => onOpenChange(false)}
          orgId={orgId}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          {locale === "en-US"
            ? "Select an organization to use AI."
            : "Selecciona una organización para usar IA."}
        </div>
      )}
    </Sheet>
  );
}
