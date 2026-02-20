"use client";

import type { Table as ReactTable } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";

import type { DataTableRow } from "./data-table-types";

export function DataTablePagination<TRow extends DataTableRow>({
  table,
  filteredRows,
  totalRows,
  isEn,
}: {
  table: ReactTable<TRow>;
  filteredRows: number;
  totalRows: number;
  isEn: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="text-muted-foreground text-sm">
        {isEn ? (
          <>
            Showing{" "}
            <span className="font-medium text-foreground">{filteredRows}</span>{" "}
            of <span className="font-medium text-foreground">{totalRows}</span>{" "}
            rows
          </>
        ) : (
          <>
            Mostrando{" "}
            <span className="font-medium text-foreground">{filteredRows}</span>{" "}
            de <span className="font-medium text-foreground">{totalRows}</span>{" "}
            filas
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-muted-foreground text-sm">
          {isEn ? "Rows" : "Filas"}
          <select
            className="h-8 rounded-md border bg-background px-2 text-foreground text-sm"
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            value={table.getState().pagination.pageSize}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <Button
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            size="sm"
            variant="outline"
          >
            {isEn ? "Previous" : "Anterior"}
          </Button>
          <Button
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            size="sm"
            variant="outline"
          >
            {isEn ? "Next" : "Siguiente"}
          </Button>
        </div>

        <div className="text-muted-foreground text-sm">
          {isEn ? "Page" : "Página"}{" "}
          <span className="font-medium text-foreground">
            {table.getState().pagination.pageIndex + 1}
          </span>{" "}
          {isEn ? "of" : "de"}{" "}
          <span className="font-medium text-foreground">
            {table.getPageCount()}
          </span>
        </div>
      </div>
    </div>
  );
}
