"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { humanizeKey } from "@/lib/format";
import type { Locale } from "@/lib/i18n";

import { DataCell } from "./data-table-cells";
import type { DataTableRow } from "./data-table-types";
import { firstNonNullValue, keysFromRows } from "./data-table-types";

export function inferColumns(options: {
  rows: DataTableRow[];
  locale: Locale;
  rowHrefBase?: string;
  foreignKeyHrefBaseByKey?: Record<string, string>;
}): ColumnDef<DataTableRow>[] {
  const { rows, locale, rowHrefBase, foreignKeyHrefBaseByKey } = options;
  const keys = keysFromRows(rows);
  return keys.map((key) => {
    const sample = firstNonNullValue(rows, key);
    const isComplex = typeof sample === "object" && sample !== null;

    return {
      accessorKey: key,
      header: humanizeKey(key),
      enableSorting: !isComplex,
      cell: ({ getValue, row }) => (
        <DataCell
          columnKey={key}
          foreignKeyHrefBaseByKey={foreignKeyHrefBaseByKey}
          locale={locale}
          row={row.original}
          rowHrefBase={rowHrefBase}
          value={getValue()}
        />
      ),
    } satisfies ColumnDef<DataTableRow>;
  });
}
