"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/lib/i18n";

type Policy = {
  tool_name: string;
  approval_mode: "required" | "auto" | "confidence";
  auto_approve_threshold?: number;
  enabled: boolean;
};

type ApprovalPoliciesProps = {
  orgId: string;
  locale: Locale;
};

const TOOL_LABELS: Record<string, { "en-US": string; "es-PY": string }> = {
  create_row: {
    "en-US": "Create records",
    "es-PY": "Crear registros",
  },
  update_row: {
    "en-US": "Update records",
    "es-PY": "Actualizar registros",
  },
  delete_row: {
    "en-US": "Delete records",
    "es-PY": "Eliminar registros",
  },
  apply_pricing_recommendation: {
    "en-US": "Apply pricing",
    "es-PY": "Aplicar precios",
  },
  send_message: {
    "en-US": "Send messages",
    "es-PY": "Enviar mensajes",
  },
  advance_application_stage: {
    "en-US": "Advance applications",
    "es-PY": "Avanzar solicitudes",
  },
};

const MODE_CYCLE: Policy["approval_mode"][] = [
  "required",
  "confidence",
  "auto",
];

function normalizePolicies(payload: unknown): Policy[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown[] }).data;
  if (!Array.isArray(data)) return [];

  return data
    .filter((row): row is Record<string, unknown> =>
      Boolean(row && typeof row === "object")
    )
    .map((row) => {
      const toolName = String(row.tool_name ?? "");
      const modeValue = String(row.approval_mode ?? "required");
      const mode: Policy["approval_mode"] =
        modeValue === "auto"
          ? "auto"
          : modeValue === "confidence"
            ? "confidence"
            : "required";
      const threshold =
        typeof row.auto_approve_threshold === "number"
          ? row.auto_approve_threshold
          : typeof row.auto_approve_threshold === "string"
            ? parseFloat(row.auto_approve_threshold)
            : 0.85;
      return {
        tool_name: toolName,
        approval_mode: mode,
        auto_approve_threshold: threshold,
        enabled: row.enabled !== false,
      };
    });
}

function nextMode(
  current: Policy["approval_mode"]
): Policy["approval_mode"] {
  const idx = MODE_CYCLE.indexOf(current);
  return MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
}

function modeLabel(
  mode: Policy["approval_mode"],
  isEn: boolean,
  threshold?: number
): string {
  switch (mode) {
    case "auto":
      return isEn ? "Auto execute" : "Ejecucion automatica";
    case "confidence":
      return isEn
        ? `Confidence ≥ ${Math.round((threshold ?? 0.85) * 100)}%`
        : `Confianza ≥ ${Math.round((threshold ?? 0.85) * 100)}%`;
    default:
      return isEn ? "Approval required" : "Aprobacion requerida";
  }
}

function ThresholdSlider({
  disabled,
  toolName,
  value,
  onCommit,
}: {
  disabled: boolean;
  toolName: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [local, setLocal] = useState(Math.round(value * 100));
  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        className="h-1.5 w-32 cursor-pointer accent-primary"
        disabled={disabled}
        max={100}
        min={50}
        onChange={(e) => setLocal(parseInt(e.target.value, 10))}
        onPointerUp={() => onCommit(local / 100)}
        step={5}
        type="range"
        value={local}
      />
      <span className="text-muted-foreground text-xs tabular-nums">
        {local}%
      </span>
    </div>
  );
}

export function ApprovalPolicies({ orgId, locale }: ApprovalPoliciesProps) {
  const isEn = locale === "en-US";
  const queryClient = useQueryClient();

  const policiesQuery = useQuery<Policy[], Error>({
    queryKey: ["agent-approval-policies", orgId],
    queryFn: async () => {
      const response = await fetch(
        `/api/agent/approval-policies?org_id=${encodeURIComponent(orgId)}`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }
      );
      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        const fallback = isEn
          ? "Could not load approval policies."
          : "No se pudieron cargar las politicas de aprobacion.";
        const msg =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: unknown }).error)
            : fallback;
        throw new Error(msg);
      }

      return normalizePolicies(payload);
    },
  });

  const updateMutation = useMutation<
    unknown,
    Error,
    {
      toolName: string;
      patch: Partial<
        Pick<Policy, "approval_mode" | "enabled" | "auto_approve_threshold">
      >;
    }
  >({
    mutationFn: async ({ toolName, patch }) => {
      const response = await fetch(
        `/api/agent/approval-policies/${encodeURIComponent(toolName)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ org_id: orgId, ...patch }),
        }
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        const fallback = isEn
          ? "Policy update failed."
          : "Fallo la actualizacion de la politica.";
        throw new Error(payload.error || fallback);
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-approval-policies", orgId],
      });
    },
  });

  const policies = policiesQuery.data ?? [];
  const busyTool = updateMutation.isPending
    ? updateMutation.variables?.toolName
    : null;
  const error =
    policiesQuery.error?.message ?? updateMutation.error?.message ?? null;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>
          {isEn ? "Approval policies" : "Politicas de aprobacion"}
        </CardTitle>
        <CardDescription>
          {isEn
            ? "Control when AI write tools require human review."
            : "Controla cuando las herramientas de escritura de IA requieren revision humana."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>
              {isEn ? "Request failed" : "Solicitud fallida"}
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {policiesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {policies.map((policy) => {
              const label =
                TOOL_LABELS[policy.tool_name]?.[locale] ??
                policy.tool_name.replace(/_/g, " ");
              return (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                  key={policy.tool_name}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-sm">{label}</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={policy.enabled ? "secondary" : "outline"}
                      >
                        {policy.enabled
                          ? isEn
                            ? "Enabled"
                            : "Activo"
                          : isEn
                            ? "Disabled"
                            : "Inactivo"}
                      </Badge>
                      <Badge variant="outline">
                        {modeLabel(
                          policy.approval_mode,
                          isEn,
                          policy.auto_approve_threshold
                        )}
                      </Badge>
                    </div>
                    {policy.approval_mode === "confidence" && (
                      <ThresholdSlider
                        disabled={busyTool === policy.tool_name}
                        toolName={policy.tool_name}
                        value={policy.auto_approve_threshold ?? 0.85}
                        onCommit={(value) =>
                          updateMutation.mutate({
                            toolName: policy.tool_name,
                            patch: { auto_approve_threshold: value },
                          })
                        }
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      disabled={busyTool === policy.tool_name}
                      onClick={() => {
                        updateMutation.mutate({
                          toolName: policy.tool_name,
                          patch: {
                            approval_mode: nextMode(policy.approval_mode),
                          },
                        });
                      }}
                      size="sm"
                      variant="outline"
                    >
                      {isEn ? "Toggle mode" : "Cambiar modo"}
                    </Button>
                    <Button
                      disabled={busyTool === policy.tool_name}
                      onClick={() => {
                        updateMutation.mutate({
                          toolName: policy.tool_name,
                          patch: { enabled: !policy.enabled },
                        });
                      }}
                      size="sm"
                      variant="outline"
                    >
                      {policy.enabled
                        ? isEn
                          ? "Disable"
                          : "Desactivar"
                        : isEn
                          ? "Enable"
                          : "Activar"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
