"use client";

import Link from "next/link";

import { AssignOwnerForm } from "@/components/applications/assign-owner-form";
import { buttonVariants } from "@/components/ui/button";
import type { ComboboxOption } from "@/components/ui/combobox";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildMessageLinks } from "@/lib/features/applications/messaging";
import type {
  ApplicationRow,
  BoardLane,
  MessageTemplateOption,
} from "@/lib/features/applications/types";
import {
  formatDateTimeLabel,
  normalizeSlaStatus,
  qualificationBandClass,
  qualificationBandLabel,
  slaBadgeClass,
  slaBadgeLabel,
  statusBadgeClass,
} from "@/lib/features/applications/utils";
import { cn } from "@/lib/utils";
import type { OptimisticAction } from "./use-applications-data";

export function ApplicationsBoard({
  isEn,
  locale,
  nextPath,
  assignmentOptions,
  templateOptions,
  boardRowsByLane,
  queueOptimisticRowUpdate,
}: {
  isEn: boolean;
  locale: "es-PY" | "en-US";
  nextPath: string;
  assignmentOptions: ComboboxOption[];
  templateOptions: MessageTemplateOption[];
  boardRowsByLane: { lane: BoardLane; rows: ApplicationRow[] }[];
  queueOptimisticRowUpdate: (action: OptimisticAction) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">
          {isEn ? "Assignment + SLA board" : "Tablero de asignación + SLA"}
        </h3>
        <p className="text-muted-foreground text-xs">
          {isEn
            ? "Target first response: under 2h"
            : "Objetivo primera respuesta: menos de 2h"}
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        {boardRowsByLane.map(({ lane, rows: laneRows }) => (
          <article
            className="space-y-2 rounded-2xl border border-border/80 bg-card/80 p-3"
            key={lane.key}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">{lane.label[locale]}</p>
              <StatusBadge
                label={String(laneRows.length)}
                tone="neutral"
                value={lane.key}
              />
            </div>
            <div className="max-h-[25rem] space-y-2 overflow-y-auto pr-1">
              {laneRows.length === 0 ? (
                <p className="rounded-xl border border-border/80 border-dashed px-3 py-2 text-muted-foreground text-xs">
                  {isEn ? "No applications" : "Sin aplicaciones"}
                </p>
              ) : (
                laneRows.map((row) => {
                  const slaStatus = normalizeSlaStatus(row);
                  const slaLabel = slaBadgeLabel(slaStatus, isEn);
                  const assignedLabel =
                    row.assigned_user_name ||
                    (isEn ? "Unassigned" : "Sin asignar");
                  const { emailHref, whatsappHref } = buildMessageLinks(
                    row,
                    templateOptions,
                    isEn,
                    locale
                  );
                  return (
                    <div
                      className="space-y-2 rounded-xl border border-border/80 bg-background/70 p-3"
                      key={row.id}
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{row.full_name}</p>
                        <p className="truncate text-muted-foreground text-xs">
                          {row.listing_title ||
                            (isEn ? "No listing" : "Sin anuncio")}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          label={row.status_label}
                          tone={statusBadgeClass(row.status)}
                          value={row.status}
                        />
                        <StatusBadge
                          label={slaLabel}
                          tone={slaBadgeClass(
                            slaStatus,
                            row.response_sla_alert_level
                          )}
                          value={slaStatus}
                        />
                        <StatusBadge
                          label={`${qualificationBandLabel(row.qualification_band, isEn)} ${row.qualification_score > 0 ? `· ${row.qualification_score}` : ""}`}
                          tone={qualificationBandClass(
                            row.qualification_band
                          )}
                          value={row.qualification_band}
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {isEn ? "Owner" : "Responsable"}: {assignedLabel}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {isEn ? "Created" : "Creado"}:{" "}
                        {formatDateTimeLabel(row.created_at, locale)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {isEn ? "SLA due" : "SLA vence"}:{" "}
                        {row.response_sla_due_at
                          ? formatDateTimeLabel(
                              row.response_sla_due_at,
                              locale
                            )
                          : "-"}
                      </p>
                      <AssignOwnerForm
                        applicationId={row.id}
                        assignedUserId={row.assigned_user_id}
                        assignedUserName={row.assigned_user_name}
                        isEn={isEn}
                        memberOptions={assignmentOptions}
                        nextPath={nextPath}
                        onOptimisticAssign={(assignment) =>
                          queueOptimisticRowUpdate({
                            type: "assign",
                            applicationId: row.id,
                            assignedUserId: assignment.assignedUserId,
                            assignedUserName: assignment.assignedUserName,
                          })
                        }
                        status={row.status}
                      />
                      <div className="flex flex-wrap gap-2">
                        {whatsappHref ? (
                          <Link
                            className={cn(
                              buttonVariants({
                                size: "sm",
                                variant: "secondary",
                              })
                            )}
                            href={whatsappHref}
                            prefetch={false}
                            target="_blank"
                          >
                            WhatsApp
                          </Link>
                        ) : null}
                        {emailHref ? (
                          <Link
                            className={cn(
                              buttonVariants({
                                size: "sm",
                                variant: "outline",
                              })
                            )}
                            href={emailHref}
                            prefetch={false}
                          >
                            Email
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
