"use client";

import Link from "next/link";

import { setApplicationStatusAction } from "@/app/(admin)/module/applications/actions";
import { useApplicationColumns } from "@/app/(admin)/module/applications/columns";
import { ConvertToLeaseInlineForm } from "@/components/applications/convert-to-lease-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { buildMessageLinks } from "@/lib/features/applications/messaging";
import type {
  ApplicationRow,
  MessageTemplateOption,
} from "@/lib/features/applications/types";
import {
  canConvert,
  canMoveToQualified,
  canMoveToScreening,
} from "@/lib/features/applications/utils";
import { cn } from "@/lib/utils";
import type { OptimisticAction } from "./use-applications-data";

export function ApplicationsTable({
  isEn,
  locale,
  nextPath,
  today,
  filteredRows,
  templateOptions,
  queueOptimisticRowUpdate,
}: {
  isEn: boolean;
  locale: "es-PY" | "en-US";
  nextPath: string;
  today: string;
  filteredRows: ApplicationRow[];
  templateOptions: MessageTemplateOption[];
  queueOptimisticRowUpdate: (action: OptimisticAction) => void;
}) {
  const columns = useApplicationColumns(isEn, locale);

  return (
    <DataTable
      columns={columns}
      data={filteredRows}
      renderRowActions={(rowData) => {
        const row = rowData as ApplicationRow;
        const id = row.id;
        const status = row.status;
        const { emailHref, whatsappHref } = buildMessageLinks(
          row,
          templateOptions,
          isEn,
          locale
        );

        return (
          <div className="flex flex-wrap justify-end gap-2">
            {whatsappHref ? (
              <Link
                className={cn(
                  buttonVariants({ size: "sm", variant: "secondary" })
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
                  buttonVariants({ size: "sm", variant: "outline" })
                )}
                href={emailHref}
                prefetch={false}
              >
                Email
              </Link>
            ) : null}

            {canMoveToScreening(status) ? (
              <form
                action={setApplicationStatusAction}
                onSubmit={() =>
                  queueOptimisticRowUpdate({
                    type: "set-status",
                    applicationId: id,
                    nextStatus: "screening",
                  })
                }
              >
                <input name="application_id" type="hidden" value={id} />
                <input name="status" type="hidden" value="screening" />
                <input name="note" type="hidden" value="Manual screening" />
                <input name="next" type="hidden" value={nextPath} />
                <Button size="sm" type="submit" variant="outline">
                  {isEn ? "To screening" : "A evaluación"}
                </Button>
              </form>
            ) : null}

            {canMoveToQualified(status) ? (
              <form
                action={setApplicationStatusAction}
                onSubmit={() =>
                  queueOptimisticRowUpdate({
                    type: "set-status",
                    applicationId: id,
                    nextStatus: "qualified",
                  })
                }
              >
                <input name="application_id" type="hidden" value={id} />
                <input name="status" type="hidden" value="qualified" />
                <input name="note" type="hidden" value="Qualified" />
                <input name="next" type="hidden" value={nextPath} />
                <Button size="sm" type="submit" variant="secondary">
                  {isEn ? "Qualify" : "Calificar"}
                </Button>
              </form>
            ) : null}

            {canConvert(status) ? (
              <ConvertToLeaseInlineForm
                applicationId={id}
                defaultStartDate={today}
                isEn={isEn}
                locale={locale}
                nextPath={nextPath}
                onOptimisticConvert={() =>
                  queueOptimisticRowUpdate({
                    type: "set-status",
                    applicationId: id,
                    nextStatus: "contract_signed",
                  })
                }
              />
            ) : null}

            {!canConvert(status) && status !== "contract_signed" ? (
              <form
                action={setApplicationStatusAction}
                onSubmit={() =>
                  queueOptimisticRowUpdate({
                    type: "set-status",
                    applicationId: id,
                    nextStatus: "lost",
                  })
                }
              >
                <input name="application_id" type="hidden" value={id} />
                <input name="status" type="hidden" value="lost" />
                <input name="note" type="hidden" value="Marked as lost" />
                <input name="next" type="hidden" value={nextPath} />
                <Button size="sm" type="submit" variant="ghost">
                  {isEn ? "Mark lost" : "Marcar perdido"}
                </Button>
              </form>
            ) : null}
          </div>
        );
      }}
    />
  );
}
