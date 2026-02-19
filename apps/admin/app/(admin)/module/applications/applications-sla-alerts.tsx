"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

import { buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ApplicationRow } from "@/lib/features/applications/types";
import {
  formatDateTimeLabel,
  normalizeSlaStatus,
  slaBadgeClass,
  slaBadgeLabel,
} from "@/lib/features/applications/utils";
import { cn } from "@/lib/utils";

export function ApplicationsSlaAlerts({
  isEn,
  locale,
  slaAlertRows,
}: {
  isEn: boolean;
  locale: "es-PY" | "en-US";
  slaAlertRows: ApplicationRow[];
}) {
  return (
    <Collapsible defaultOpen={slaAlertRows.length > 0}>
      <div className="rounded-2xl border border-border/80 bg-card/80 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">
            {isEn ? "SLA alert center" : "Centro de alertas SLA"}
          </h3>
          <CollapsibleTrigger
            className={(state) =>
              cn(
                buttonVariants({ size: "sm", variant: "ghost" }),
                "h-8 rounded-xl px-2",
                state.open ? "text-foreground" : "text-muted-foreground"
              )
            }
            type="button"
          >
            <Icon icon={ArrowDown01Icon} size={14} />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-3">
          {slaAlertRows.length === 0 ? (
            <p className="rounded-xl border border-border/80 border-dashed px-3 py-2 text-muted-foreground text-xs">
              {isEn
                ? "No warning/critical SLA alerts for the current filter set."
                : "No hay alertas SLA en advertencia/crítico para el filtro actual."}
            </p>
          ) : (
            <div className="grid gap-2 xl:grid-cols-2">
              {slaAlertRows.slice(0, 8).map((row) => {
                const slaStatus = normalizeSlaStatus(row);
                const assignedLabel =
                  row.assigned_user_name ||
                  (isEn ? "Unassigned" : "Sin asignar");
                return (
                  <article
                    className="rounded-xl border border-border/80 bg-background/70 p-3"
                    key={row.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{row.full_name}</p>
                        <p className="text-muted-foreground text-xs">
                          {row.listing_title ||
                            (isEn ? "No listing" : "Sin anuncio")}
                        </p>
                      </div>
                      <StatusBadge
                        label={slaBadgeLabel(slaStatus, isEn)}
                        tone={slaBadgeClass(
                          slaStatus,
                          row.response_sla_alert_level
                        )}
                        value={slaStatus}
                      />
                    </div>
                    <p className="mt-2 text-muted-foreground text-xs">
                      {isEn ? "Assigned" : "Responsable"}: {assignedLabel}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {isEn ? "Due" : "Vence"}:{" "}
                      {row.response_sla_due_at
                        ? formatDateTimeLabel(row.response_sla_due_at, locale)
                        : "-"}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
