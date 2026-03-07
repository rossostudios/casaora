import type { AgentApproval } from "@/lib/api";
import { humanizeKey, toRelativeTimeIntl } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { StatusBadge } from "@/components/ui/status-badge";
import { agentRunStatusTone } from "@/components/agent/run-utils";

type ApprovalRunSummaryProps = {
  approval: Pick<AgentApproval, "run">;
  isEn: boolean;
  locale: Locale;
};

export function ApprovalRunSummary({
  approval,
  isEn,
  locale,
}: ApprovalRunSummaryProps) {
  const run = approval.run;
  if (!run) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          tone={agentRunStatusTone(run.status)}
          value={run.status}
        />
        <span className="font-medium text-xs">
          {humanizeKey(run.mode)}
        </span>
        <span className="text-muted-foreground text-xs">
          {toRelativeTimeIntl(run.created_at, locale)}
        </span>
      </div>
      <p className="mt-2 font-medium text-sm">{run.task}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
        <span>
          {run.provider && run.model
            ? `${run.provider}:${run.model}`
            : isEn
              ? "Default model"
              : "Modelo por defecto"}
        </span>
        <span>{isEn ? "Linked run context" : "Contexto de ejecucion vinculado"}</span>
      </div>
    </div>
  );
}
