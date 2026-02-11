"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import {
  convertApplicationToLeaseAction,
  setApplicationStatusAction,
} from "@/app/(admin)/module/applications/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableRow } from "@/components/ui/data-table";
import { useActiveLocale } from "@/lib/i18n/client";

function asString(value: unknown): string {
  return typeof value === "string" ? value : value ? String(value) : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusLabel(value: string, isEn: boolean): string {
  const normalized = value.trim().toLowerCase();
  if (isEn) return normalized || "unknown";

  if (normalized === "new") return "Nuevo";
  if (normalized === "screening") return "Evaluación";
  if (normalized === "qualified") return "Calificado";
  if (normalized === "visit_scheduled") return "Visita agendada";
  if (normalized === "offer_sent") return "Oferta enviada";
  if (normalized === "contract_signed") return "Contrato firmado";
  if (normalized === "rejected") return "Rechazado";
  if (normalized === "lost") return "Perdido";
  return normalized || "desconocido";
}

function canConvert(status: string): boolean {
  return ["qualified", "visit_scheduled", "offer_sent"].includes(
    status.trim().toLowerCase()
  );
}

function canMoveToScreening(status: string): boolean {
  return status.trim().toLowerCase() === "new";
}

function canMoveToQualified(status: string): boolean {
  return ["screening", "visit_scheduled"].includes(status.trim().toLowerCase());
}

export function ApplicationsManager({
  applications,
}: {
  applications: Record<string, unknown>[];
}) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const suffix = searchParams.toString();
    return suffix ? `${pathname}?${suffix}` : pathname;
  }, [pathname, searchParams]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const rows = useMemo(() => {
    return applications.map((application) => {
      const status = asString(application.status).trim();
      return {
        id: asString(application.id).trim(),
        full_name: asString(application.full_name).trim(),
        email: asString(application.email).trim(),
        phone_e164: asString(application.phone_e164).trim() || null,
        status,
        status_label: statusLabel(status, isEn),
        marketplace_listing_title: asString(
          application.marketplace_listing_title
        ).trim(),
        monthly_income: asNumber(application.monthly_income),
        first_response_minutes: asNumber(application.first_response_minutes),
        created_at: asString(application.created_at).trim(),
      } satisfies DataTableRow;
    });
  }, [applications, isEn]);

  const columns = useMemo<ColumnDef<DataTableRow>[]>(() => {
    return [
      {
        accessorKey: "full_name",
        header: isEn ? "Applicant" : "Solicitante",
        cell: ({ row, getValue }) => {
          const name = asString(getValue()).trim();
          const email = asString(row.original.email).trim();
          const phone = asString(row.original.phone_e164).trim();
          return (
            <div className="space-y-1">
              <p className="font-medium">{name}</p>
              <p className="text-muted-foreground text-xs">{email}</p>
              {phone ? (
                <p className="text-muted-foreground text-xs">{phone}</p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "status_label",
        header: isEn ? "Status" : "Estado",
        cell: ({ getValue }) => (
          <Badge variant="outline">{asString(getValue())}</Badge>
        ),
      },
      {
        accessorKey: "marketplace_listing_title",
        header: isEn ? "Listing" : "Anuncio",
      },
      {
        accessorKey: "monthly_income",
        header: isEn ? "Income" : "Ingreso",
      },
      {
        accessorKey: "first_response_minutes",
        header: isEn ? "First response (min)" : "Primera respuesta (min)",
      },
      {
        accessorKey: "created_at",
        header: isEn ? "Created" : "Creado",
      },
    ];
  }, [isEn]);

  return (
    <DataTable
      columns={columns}
      data={rows}
      renderRowActions={(row) => {
        const id = asString(row.id);
        const status = asString(row.status);

        return (
          <div className="flex flex-wrap justify-end gap-2">
            {canMoveToScreening(status) ? (
              <form action={setApplicationStatusAction}>
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
              <form action={setApplicationStatusAction}>
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
              <form action={convertApplicationToLeaseAction}>
                <input name="application_id" type="hidden" value={id} />
                <input name="starts_on" type="hidden" value={today} />
                <input name="platform_fee" type="hidden" value="0" />
                <input name="next" type="hidden" value={nextPath} />
                <Button size="sm" type="submit" variant="outline">
                  {isEn ? "Convert to lease" : "Convertir a contrato"}
                </Button>
              </form>
            ) : null}

            {!canConvert(status) && status !== "contract_signed" ? (
              <form action={setApplicationStatusAction}>
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
