"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import { generatePaymentLinkAction } from "@/app/(admin)/module/collections/actions";
import { Button } from "@/components/ui/button";
import { type DataTableRow } from "@/components/ui/data-table";
import { NotionDataTable } from "@/components/ui/notion-data-table";
import { Form } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";

import { asNumber, asString, type CollectionRow } from "./collections-utils";

export function CollectionsListTable({
  rows,
  isEn,
  locale,
  nextPath,
  onMarkPaid,
}: {
  rows: CollectionRow[];
  isEn: boolean;
  locale: string;
  nextPath: string;
  onMarkPaid: (id: string) => void;
}) {
  const columns = useMemo<ColumnDef<DataTableRow>[]>(() => {
    return [
      {
        accessorKey: "due_date",
        header: isEn ? "Due date" : "Vencimiento",
        cell: ({ row, getValue }) => {
          const due = asString(getValue());
          const days = asNumber(row.original.overdue_days);
          return (
            <div className="space-y-1">
              <p>{due || "-"}</p>
              {days > 0 ? (
                <StatusBadge
                  className="text-[11px]"
                  label={isEn ? `${days}d overdue` : `${days}d atrasado`}
                  tone="danger"
                  value="late"
                />
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "tenant_full_name",
        header: isEn ? "Tenant" : "Inquilino",
        cell: ({ row, getValue }) => {
          const tenant = asString(getValue()).trim() || "-";
          const leaseId = asString(row.original.lease_id).trim();
          return (
            <div className="space-y-1">
              <p className="font-medium">{tenant}</p>
              <p className="font-mono text-muted-foreground text-xs">
                {leaseId}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "status_label",
        header: isEn ? "Status" : "Estado",
        cell: ({ row, getValue }) => {
          const value = asString(getValue());
          const raw = asString(row.original.status).trim().toLowerCase();
          return <StatusBadge label={value} value={raw} />;
        },
      },
      {
        accessorKey: "amount",
        header: isEn ? "Amount" : "Monto",
        cell: ({ row, getValue }) =>
          formatCurrency(
            asNumber(getValue()),
            asString(row.original.currency),
            locale
          ),
      },
      {
        accessorKey: "payment_method",
        header: isEn ? "Payment method" : "Metodo de pago",
      },
      {
        accessorKey: "paid_at",
        header: isEn ? "Paid at" : "Pagado en",
      },
    ];
  }, [isEn, locale]);

  return (
    <NotionDataTable
      columns={columns}
      data={rows}
      hideSearch
      isEn={isEn}
      renderRowActions={(row) => {
        const id = asString(row.id);
        const status = asString(row.status).trim().toLowerCase();
        if (status === "paid") {
          return (
            <StatusBadge label={isEn ? "Paid" : "Pagado"} value="paid" />
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Form action={generatePaymentLinkAction}>
              <input name="collection_id" type="hidden" value={id} />
              <input name="next" type="hidden" value={nextPath} />
              <Button size="sm" type="submit" variant="outline">
                {isEn ? "Payment link" : "Link de pago"}
              </Button>
            </Form>
            <Button
              onClick={() => onMarkPaid(id)}
              size="sm"
              type="button"
              variant="secondary"
            >
              {isEn ? "Mark paid" : "Marcar pagado"}
            </Button>
          </div>
        );
      }}
    />
  );
}
