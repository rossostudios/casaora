"use client";

import {
  type Table as ReactTable,
  flexRender,
} from "@tanstack/react-table";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
} from "@hugeicons/core-free-icons";
import type React from "react";
import { type ReactNode, useEffect, useRef } from "react";

import { Icon } from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { DataTableEmpty } from "./data-table-empty";
import type { DataTableRow, EmptyStateConfig } from "./data-table-types";

function FocusableTableRow({
  isFocused,
  children,
  ...props
}: React.ComponentProps<typeof TableRow> & { isFocused: boolean }) {
  const ref = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isFocused]);

  return (
    <TableRow ref={ref} {...props}>
      {children}
    </TableRow>
  );
}

export function DataTableBody<TRow extends DataTableRow>({
  table,
  dataLength,
  emptyStateConfig,
  rowHrefBase,
  active,
  reset,
  onRowClick,
  focusedRowIndex,
  borderless,
  footer,
  isEn,
}: {
  table: ReactTable<TRow>;
  dataLength: number;
  emptyStateConfig?: EmptyStateConfig;
  rowHrefBase?: string;
  active: boolean;
  reset: () => void;
  onRowClick?: (row: TRow) => void;
  focusedRowIndex: number;
  borderless: boolean;
  footer?: ReactNode;
  isEn: boolean;
}) {
  return (
    <div className={cn("rounded-md border", borderless && "rounded-none border-0")}>
      <Table className="table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const column = header.column;
                const canSort = column.getCanSort();
                const sortState = column.getIsSorted();

                const SortIcon =
                  sortState === "asc"
                    ? ArrowUp01Icon
                    : sortState === "desc"
                      ? ArrowDown01Icon
                      : ArrowUpDownIcon;

                return (
                  <TableHead className="whitespace-nowrap" key={header.id}>
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        className="inline-flex items-center gap-1 hover:underline"
                        onClick={column.getToggleSortingHandler()}
                        type="button"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        <Icon
                          className="text-muted-foreground"
                          icon={SortIcon}
                          size={14}
                        />
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => {
              const isFocused = focusedRowIndex >= 0 && row.index === focusedRowIndex;
              return (
                <FocusableTableRow
                  className={cn(
                    onRowClick ? "cursor-pointer hover:bg-muted/30" : "",
                    isFocused ? "ring-2 ring-primary/30 bg-primary/[0.03]" : ""
                  )}
                  isFocused={isFocused}
                  key={row.id}
                  onClick={(event) => {
                    if (!onRowClick) return;
                    const target = event.target as HTMLElement | null;
                    if (
                      target?.closest(
                        'a,button,input,select,textarea,label,[role="button"],[data-row-click="ignore"]'
                      )
                    ) {
                      return;
                    }
                    onRowClick(row.original);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      className="max-w-72 break-words align-top"
                      key={cell.id}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </FocusableTableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                className="p-0"
                colSpan={table.getAllLeafColumns().length}
              >
                <DataTableEmpty
                  active={active}
                  dataLength={dataLength}
                  emptyStateConfig={emptyStateConfig}
                  isEn={isEn}
                  reset={reset}
                  rowHrefBase={rowHrefBase}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {footer}
      </Table>
    </div>
  );
}
