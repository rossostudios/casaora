"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AgentInbox } from "@/components/agent/agent-inbox";
import { ApprovalPolicies } from "@/components/agent/approval-policies";
import { ApprovalQueue } from "@/components/agent/approval-queue";
import { ChatHistory } from "@/components/agent/chat-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/lib/i18n";

type GovernancePolicy = {
  tool_name: "create_row" | "update_row" | "delete_row";
  approval_mode: "required" | "auto";
  enabled: boolean;
};

export function ChatsWorkspace({
  orgId,
  locale,
  defaultArchived,
}: {
  orgId: string;
  locale: Locale;
  defaultArchived: boolean;
}) {
  const isEn = locale === "en-US";
  const router = useRouter();

  const pendingApprovalsQuery = useQuery<number, Error>({
    queryKey: ["agent-approvals-count", orgId],
    queryFn: async () => {
      const response = await fetch(
        `/api/agent/approvals?org_id=${encodeURIComponent(orgId)}`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }
      );
      const payload = (await response.json()) as {
        data?: Array<{ status?: string }>;
      };
      if (!response.ok) {
        return 0;
      }
      return (payload.data ?? []).filter((row) => row.status === "pending")
        .length;
    },
    staleTime: 30_000,
  });

  const policySummaryQuery = useQuery<
    { required: number; auto: number; disabled: number },
    Error
  >({
    queryKey: ["agent-policy-summary", orgId],
    queryFn: async () => {
      const response = await fetch(
        `/api/agent/approval-policies?org_id=${encodeURIComponent(orgId)}`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }
      );
      const payload = (await response.json()) as { data?: GovernancePolicy[] };
      if (!response.ok) {
        return { required: 0, auto: 0, disabled: 0 };
      }
      const data = payload.data ?? [];
      return {
        required: data.filter(
          (row) => row.enabled !== false && row.approval_mode === "required"
        ).length,
        auto: data.filter(
          (row) => row.enabled !== false && row.approval_mode === "auto"
        ).length,
        disabled: data.filter((row) => row.enabled === false).length,
      };
    },
    staleTime: 30_000,
  });

  const pendingCount = pendingApprovalsQuery.data ?? 0;
  const summary = policySummaryQuery.data ?? {
    required: 0,
    auto: 0,
    disabled: 0,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>
            {isEn ? "Governance snapshot" : "Resumen de gobernanza"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {isEn
              ? `${pendingCount} pending approvals`
              : `${pendingCount} aprobaciones pendientes`}
          </Badge>
          <Badge variant="outline">
            {isEn
              ? `${summary.required} require approval`
              : `${summary.required} requieren aprobación`}
          </Badge>
          <Badge variant="outline">
            {isEn
              ? `${summary.auto} auto execute`
              : `${summary.auto} auto ejecución`}
          </Badge>
          <Badge variant="outline">
            {isEn
              ? `${summary.disabled} disabled`
              : `${summary.disabled} inactivas`}
          </Badge>
          <Button
            className="ml-auto"
            onClick={() => {
              router.push("/app/agents?new=1");
            }}
            size="sm"
          >
            {isEn ? "New chat" : "Nuevo chat"}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="history">
        <TabsList className="w-full justify-start" variant="line">
          <TabsTrigger value="history">
            {isEn ? "History" : "Historial"}
          </TabsTrigger>
          <TabsTrigger value="approvals">
            {isEn ? "Approvals" : "Aprobaciones"}
          </TabsTrigger>
          <TabsTrigger value="policies">
            {isEn ? "Policies" : "Políticas"}
          </TabsTrigger>
          <TabsTrigger value="inbox">{isEn ? "Inbox" : "Bandeja"}</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="history">
          <ChatHistory
            defaultArchived={defaultArchived}
            locale={locale}
            orgId={orgId}
          />
        </TabsContent>

        <TabsContent className="space-y-4" value="approvals">
          <ApprovalQueue locale={locale} orgId={orgId} />
        </TabsContent>

        <TabsContent className="space-y-4" value="policies">
          <ApprovalPolicies locale={locale} orgId={orgId} />
        </TabsContent>

        <TabsContent className="space-y-4" value="inbox">
          <AgentInbox locale={locale} orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
