"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { transitionReservationStatusAction } from "@/app/(admin)/module/reservations/actions";
import {
  asNumber,
  asString,
  daysBetween,
  localizedActionLabel,
  statusActions,
} from "@/app/(admin)/module/reservations/reservations-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableRow } from "@/components/ui/data-table";
import { Form } from "@/components/ui/form";
import { NotionDataTable } from "@/components/ui/notion-data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { useActiveLocale } from "@/lib/i18n/client";

function ReservationRowActions({ row }: { row: DataTableRow }) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  const id = asString(row.id).trim();
  const status = asString(row.status).trim();
  if (!(id && status)) return null;

  const actions = statusActions(status);
  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap justify-end gap-2" data-row-click="ignore">
      {actions.map((action) => (
        <Form action={transitionReservationStatusAction} key={action.next}>
          <input name="reservation_id" type="hidden" value={id} />
          <input name="status" type="hidden" value={action.next} />
          <Button size="sm" type="submit" variant="outline">
            {localizedActionLabel(isEn, action.next)}
          </Button>
        </Form>
      ))}
    </div>
  );
}

export function ReservationsTable({
  bulkActionPending,
  filteredRows,
  isEn,
  locale,
  onBulkAction,
  onClearSelection,
  onRowClick,
  onSelectionChange,
  selectedRows,
}: {
  bulkActionPending: boolean;
  filteredRows: DataTableRow[];
  isEn: boolean;
  locale: string;
  onBulkAction: (targetStatus: string) => void;
  onClearSelection: () => void;
  onRowClick: (row: DataTableRow) => void;
  onSelectionChange: (rows: DataTableRow[]) => void;
  selectedRows: DataTableRow[];
}) {
  const reservationColumns = useMemo<ColumnDef<DataTableRow>[]>(
    () => [
      {
        accessorKey: "status",
        header: isEn ? "Status" : "Estado",
        size: 120,
        cell: ({ getValue }) => <StatusBadge value={asString(getValue())} />,
      },
      {
        accessorKey: "check_in_date",
        header: "Check-in",
        size: 110,
      },
      {
        accessorKey: "check_out_date",
        header: "Check-out",
        size: 110,
      },
      {
        id: "nights",
        header: isEn ? "Nights" : "Noches",
        size: 70,
        cell: ({ row }) => {
          const nights = daysBetween(
            asString(row.original.check_in_date),
            asString(row.original.check_out_date)
          );
          return nights != null ? (
            <span className="text-sm tabular-nums">{nights}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: "guest_name",
        header: isEn ? "Guest" : "Hu\u00e9sped",
        size: 180,
        cell: ({ row }) => {
          const name = asString(row.original.guest_name).trim();
          const adults = asNumber(row.original.adults) ?? 0;
          const children = asNumber(row.original.children) ?? 0;

          if (!name) {
            return <span className="text-muted-foreground">-</span>;
          }

          const comp =
            adults > 0 || children > 0
              ? [adults > 0 && `${adults}A`, children > 0 && `${children}C`]
                  .filter(Boolean)
                  .join(" ")
              : null;

          return (
            <div className="flex items-center gap-2">
              <span className="truncate">{name}</span>
              {comp ? (
                <Badge
                  className="shrink-0 px-1.5 py-0 text-[10px]"
                  variant="secondary"
                >
                  {comp}
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "unit_name",
        header: isEn ? "Unit" : "Unidad",
        size: 130,
        cell: ({ getValue }) => {
          const name = asString(getValue()).trim();
          return name || <span className="text-muted-foreground">-</span>;
        },
      },
      {
        id: "channel",
        header: isEn ? "Channel" : "Canal",
        size: 110,
        cell: ({ row }) => {
          const channel = asString(row.original.channel_name).trim();
          const integration = asString(row.original.integration_name).trim();
          const display = channel || integration;
          if (!display) return <span className="text-muted-foreground">-</span>;
          return (
            <Badge className="px-1.5 py-0 text-[10px]" variant="outline">
              {display}
            </Badge>
          );
        },
      },
      {
        id: "source",
        header: isEn ? "Source" : "Origen",
        size: 110,
        cell: ({ row }) => {
          const source = asString(row.original.source).trim().toLowerCase();
          if (!source || source === "manual") {
            return (
              <Badge className="border-0 bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">
                Manual
              </Badge>
            );
          }
          if (source === "direct_booking") {
            return (
              <Badge className="border-0 bg-primary/10 px-1.5 py-0 text-[10px] text-primary">
                Marketplace
              </Badge>
            );
          }
          return (
            <Badge className="px-1.5 py-0 text-[10px]" variant="outline">
              {source}
            </Badge>
          );
        },
      },
      {
        id: "payment",
        header: isEn ? "Payment" : "Pago",
        size: 90,
        cell: ({ row }) => {
          const total = asNumber(row.original.total_amount);
          const paid = asNumber(row.original.amount_paid);
          if (total == null || total === 0) {
            return <span className="text-muted-foreground">-</span>;
          }
          const paidAmount = paid ?? 0;
          const ratio = Math.min(1, paidAmount / total);

          if (ratio >= 1) {
            return (
              <Badge className="border-0 bg-emerald-100 px-1.5 py-0 text-[10px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {isEn ? "Paid" : "Pagado"}
              </Badge>
            );
          }
          if (ratio <= 0) {
            return (
              <Badge className="border-0 bg-red-100 px-1.5 py-0 text-[10px] text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {isEn ? "Unpaid" : "Sin pago"}
              </Badge>
            );
          }
          return (
            <Badge className="border-0 bg-amber-100 px-1.5 py-0 text-[10px] text-amber-700 tabular-nums dark:bg-amber-900/30 dark:text-amber-400">
              {Math.round(ratio * 100)}%
            </Badge>
          );
        },
      },
      {
        accessorKey: "total_amount",
        header: isEn ? "Amount" : "Monto",
        size: 130,
        cell: ({ row }) => {
          const amount = asNumber(row.original.total_amount);
          const currency = asString(row.original.currency).trim() || "PYG";
          return amount != null ? (
            <span className="text-sm tabular-nums">
              {formatCurrency(amount, currency, locale)}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
    ],
    [isEn, locale]
  );

  const footerRow = useMemo(() => {
    let sum = 0;
    let currency = "PYG";
    for (const row of filteredRows) {
      const amount = asNumber(row.total_amount);
      if (amount != null) sum += amount;
      const cur = asString(row.currency).trim();
      if (cur) currency = cur;
    }
    if (sum === 0) return null;
    return { sum, currency };
  }, [filteredRows]);

  return (
    <>
      {selectedRows.length > 0 ? (
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
          <span className="font-medium text-sm">
            {selectedRows.length} {isEn ? "selected" : "seleccionados"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              disabled={bulkActionPending}
              onClick={() => onBulkAction("confirmed")}
              size="sm"
              variant="outline"
            >
              {isEn ? "Confirm All" : "Confirmar todos"}
            </Button>
            <Button
              disabled={bulkActionPending}
              onClick={() => onBulkAction("cancelled")}
              size="sm"
              variant="outline"
            >
              {isEn ? "Cancel All" : "Cancelar todos"}
            </Button>
            <Button onClick={onClearSelection} size="sm" variant="ghost">
              {isEn ? "Clear" : "Limpiar"}
            </Button>
          </div>
        </div>
      ) : null}

      <NotionDataTable
        columns={reservationColumns}
        data={filteredRows}
        enableSelection
        footer={
          footerRow ? (
            <TableRow>
              <TableCell className="py-2 font-semibold text-xs" colSpan={9}>
                {isEn ? "Total" : "Total"}
              </TableCell>
              <TableCell className="py-2 text-right font-semibold text-xs tabular-nums">
                {formatCurrency(footerRow.sum, footerRow.currency, locale)}
              </TableCell>
            </TableRow>
          ) : undefined
        }
        getRowId={(row) => asString(row.id)}
        hideSearch
        isEn={isEn}
        onRowClick={onRowClick}
        onSelectionChange={onSelectionChange}
        renderRowActions={(row) => <ReservationRowActions row={row} />}
        rowActionsHeader={isEn ? "Actions" : "Acciones"}
      />
    </>
  );
}
