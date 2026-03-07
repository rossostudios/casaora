import Link from "next/link";

import type { AgentApproval } from "@/lib/api";
import { Button } from "@/components/ui/button";

type ApprovalOriginLinksProps = {
  approval: Pick<AgentApproval, "id" | "chat_id" | "agent_run_id" | "run">;
  isEn: boolean;
  showRunLink?: boolean;
  showChatLink?: boolean;
};

export function ApprovalOriginLinks({
  approval,
  isEn,
  showRunLink = true,
  showChatLink = true,
}: ApprovalOriginLinksProps) {
  const runHref = approval.agent_run_id
    ? `/module/agent-dashboard/runs/${approval.agent_run_id}#approval-${approval.id}`
    : null;
  const chatId =
    approval.chat_id ??
    (approval.run?.chat_id && typeof approval.run.chat_id === "string"
      ? approval.run.chat_id
      : null);
  const chatHref = chatId ? `/app/chats/${chatId}` : null;

  if ((!showRunLink || !runHref) && (!showChatLink || !chatHref)) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid={`approval-origin-links-${approval.id}`}
    >
      {showRunLink && runHref ? (
        <Button asChild size="sm" variant="outline">
          <Link href={runHref}>{isEn ? "Open run" : "Abrir ejecucion"}</Link>
        </Button>
      ) : null}
      {showChatLink && chatHref ? (
        <Button asChild size="sm" variant="outline">
          <Link href={chatHref}>{isEn ? "Open chat" : "Abrir chat"}</Link>
        </Button>
      ) : null}
    </div>
  );
}
