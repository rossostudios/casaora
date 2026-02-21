"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";

import {
  Suggestion,
  Suggestions,
} from "@/components/ai-elements/suggestion";
import { Icon } from "@/components/ui/icon";

export function ChatEmptyState({
  quickPrompts,
  onSendPrompt,
  isEn,
  disabled,
  agentName,
  agentDescription,
}: {
  quickPrompts: string[];
  onSendPrompt: (prompt: string) => void;
  isEn: boolean;
  disabled?: boolean;
  agentName?: string;
  agentDescription?: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--sidebar-primary)] to-[var(--sidebar-primary)]/70 text-white shadow-lg">
          <Icon className="h-8 w-8" icon={SparklesIcon} strokeWidth={1.5} />
        </div>

        <div className="space-y-2 text-center">
          <h2 className="font-semibold text-2xl tracking-tight">
            {agentName || (isEn ? "Agent" : "Agente")}
          </h2>
          <p className="mx-auto max-w-md text-muted-foreground text-sm leading-relaxed">
            {agentDescription ||
              (isEn
                ? "Ask me anything about your property operations."
                : "Preguntame lo que necesites sobre tus operaciones.")}
          </p>
        </div>
      </div>

      {quickPrompts.length > 0 ? (
        <Suggestions className="max-w-lg flex-wrap justify-center gap-2">
          {quickPrompts.slice(0, 3).map((prompt) => (
            <Suggestion
              className="h-auto whitespace-normal rounded-xl px-4 py-2.5 text-left text-sm"
              disabled={disabled}
              key={prompt}
              onClick={(p) => onSendPrompt(p)}
              suggestion={prompt}
            />
          ))}
        </Suggestions>
      ) : null}
    </div>
  );
}
