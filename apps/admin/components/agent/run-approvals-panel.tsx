"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  approveAgentRun,
  reviewAgentApproval,
  type AgentApproval,
} from "@/lib/api";
import { humanizeKey, toRelativeTimeIntl } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { ApprovalOriginLinks } from "@/components/agent/approval-origin-links";

type RunApprovalsPanelProps = {
  approvals: AgentApproval[];
  locale: Locale;
  orgId: string;
  runId: string;
  unavailableMessage?: string | null;
};

function approvalTone(status: AgentApproval["status"]): StatusTone {
  switch (status) {
    case "executed":
      return "success";
    case "rejected":
    case "execution_failed":
      return "danger";
    case "approved":
      return "info";
    case "pending":
    default:
      return "warning";
  }
}

function executionErrorMessage(
  executionResult: AgentApproval["execution_result"]
): string {
  if (!executionResult || typeof executionResult !== "object") return "";
  const error = executionResult.error;
  return typeof error === "string" ? error.trim() : "";
}

export function RunApprovalsPanel({
  approvals,
  locale,
  orgId,
  runId,
  unavailableMessage,
}: RunApprovalsPanelProps) {
  "use no memo";
  const isEn = locale === "en-US";
  const router = useRouter();
  const [pendingRefresh, startRefresh] = useTransition();
  const [runReviewNote, setRunReviewNote] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const pendingApprovals = approvals.filter(
    (approval) => approval.status === "pending"
  );

  const refreshPage = () => {
    startRefresh(() => {
      router.refresh();
    });
  };

  const handleApproveRun = async () => {
    setBulkBusy(true);
    try {
      await approveAgentRun(
        orgId,
        runId,
        runReviewNote.trim() ? runReviewNote.trim() : null
      );
      toast.success(
        isEn
          ? "Run approvals processed."
          : "Las aprobaciones de la ejecucion fueron procesadas."
      );
      refreshPage();
    } catch (error) {
      toast.error(
        isEn
          ? "Could not approve pending actions."
          : "No se pudieron aprobar las acciones pendientes.",
        {
          description:
            error instanceof Error ? error.message : String(error),
        }
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const handleReview = async (
    approvalId: string,
    action: "approve" | "reject"
  ) => {
    const note = reviewNotes[approvalId]?.trim() ?? "";
    setBusyById((prev) => ({ ...prev, [approvalId]: true }));
    try {
      await reviewAgentApproval(
        orgId,
        approvalId,
        action,
        note ? note : null
      );
      toast.success(
        action === "approve"
          ? isEn
            ? "Approval executed."
            : "Aprobacion ejecutada."
          : isEn
            ? "Approval rejected."
            : "Aprobacion rechazada."
      );
      refreshPage();
    } catch (error) {
      toast.error(
        action === "approve"
          ? isEn
            ? "Could not approve action."
            : "No se pudo aprobar la accion."
          : isEn
            ? "Could not reject action."
            : "No se pudo rechazar la accion.",
        {
          description:
            error instanceof Error ? error.message : String(error),
        }
      );
    } finally {
      setBusyById((prev) => ({ ...prev, [approvalId]: false }));
    }
  };

  return (
    <Card data-testid="agent-run-approvals">
      <CardHeader>
        <CardTitle>{isEn ? "Approval decisions" : "Decisiones de aprobacion"}</CardTitle>
        <CardDescription>
          {unavailableMessage
            ? unavailableMessage
            : isEn
              ? "Review every approval tied to this run without leaving the timeline."
              : "Revisa cada aprobacion asociada a esta ejecucion sin salir de la linea de tiempo."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unavailableMessage ? (
          <p className="text-muted-foreground text-sm">{unavailableMessage}</p>
        ) : approvals.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {isEn
              ? "No approval records are linked to this run."
              : "No hay registros de aprobacion vinculados a esta ejecucion."}
          </p>
        ) : (
          <>
            {pendingApprovals.length > 0 ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">
                      {isEn
                        ? `${pendingApprovals.length} pending action${
                            pendingApprovals.length === 1 ? "" : "s"
                          }`
                        : `${pendingApprovals.length} accion${
                            pendingApprovals.length === 1 ? "" : "es"
                          } pendiente${pendingApprovals.length === 1 ? "" : "s"}`}
                    </p>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {isEn
                        ? "Approve everything queued for this run in one step, or review items individually below."
                        : "Aprueba todo lo encolado para esta ejecucion en un solo paso, o revisa cada elemento abajo."}
                    </p>
                  </div>
                  <Button
                    disabled={bulkBusy || pendingRefresh}
                    onClick={() => void handleApproveRun()}
                    size="sm"
                  >
                    {bulkBusy || pendingRefresh
                      ? isEn
                        ? "Processing..."
                        : "Procesando..."
                      : isEn
                        ? "Approve all pending"
                        : "Aprobar todo lo pendiente"}
                  </Button>
                </div>
                <Textarea
                  className="mt-3 min-h-[84px]"
                  onChange={(event) => setRunReviewNote(event.target.value)}
                  placeholder={
                    isEn
                      ? "Optional note applied to all pending approvals"
                      : "Nota opcional aplicada a todas las aprobaciones pendientes"
                  }
                  value={runReviewNote}
                />
              </div>
            ) : null}

            <div className="space-y-3">
              {approvals.map((approval) => {
                const executionError = executionErrorMessage(
                  approval.execution_result
                );
                const reviewNote = reviewNotes[approval.id] ?? "";
                const busy = !!busyById[approval.id] || pendingRefresh;
                return (
                  <div
                    className="scroll-mt-24 rounded-xl border border-border/60 bg-card/60 p-4"
                    id={`approval-${approval.id}`}
                    key={approval.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-sm">
                            {humanizeKey(approval.tool_name)}
                          </p>
                          <StatusBadge
                            tone={approvalTone(approval.status)}
                            value={approval.status}
                          />
                          {approval.delivery_status ? (
                            <StatusBadge value={approval.delivery_status} />
                          ) : null}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {approval.reason?.trim()
                            ? approval.reason
                            : isEn
                              ? `${approval.agent_slug} requested this action.`
                              : `${approval.agent_slug} solicito esta accion.`}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{toRelativeTimeIntl(approval.created_at, locale)}</p>
                        {approval.priority ? (
                          <p className="mt-1">{humanizeKey(approval.priority)}</p>
                        ) : null}
                      </div>
                    </div>

                    {approval.review_note?.trim() ? (
                      <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                        <p className="font-medium">
                          {isEn ? "Review note" : "Nota de revision"}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {approval.review_note}
                        </p>
                      </div>
                    ) : null}

                    {approval.chat_id ? (
                      <div className="mt-3">
                        <ApprovalOriginLinks
                          approval={approval}
                          isEn={isEn}
                          showRunLink={false}
                        />
                      </div>
                    ) : null}

                    {executionError ? (
                      <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm">
                        <p className="font-medium text-red-700 dark:text-red-300">
                          {isEn ? "Execution issue" : "Problema de ejecucion"}
                        </p>
                        <p className="mt-1 text-red-700/80 dark:text-red-300/80">
                          {executionError}
                        </p>
                      </div>
                    ) : null}

                    {approval.status === "pending" ? (
                      <div className="mt-4 space-y-3">
                        <Textarea
                          className="min-h-[84px]"
                          onChange={(event) =>
                            setReviewNotes((prev) => ({
                              ...prev,
                              [approval.id]: event.target.value,
                            }))
                          }
                          placeholder={
                            isEn
                              ? "Optional note for this approval"
                              : "Nota opcional para esta aprobacion"
                          }
                          value={reviewNote}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void handleReview(approval.id, "approve")
                            }
                            size="sm"
                          >
                            {busy
                              ? isEn
                                ? "Saving..."
                                : "Guardando..."
                              : isEn
                                ? "Approve"
                                : "Aprobar"}
                          </Button>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void handleReview(approval.id, "reject")
                            }
                            size="sm"
                            variant="outline"
                          >
                            {isEn ? "Reject" : "Rechazar"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
