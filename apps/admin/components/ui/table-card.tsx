"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, type DataTableRow } from "@/components/ui/data-table";
import { useActiveLocale } from "@/lib/i18n/client";

type TableCardProps = {
  title: string;
  subtitle: string;
  rows: DataTableRow[];
  rowHrefBase?: string;
};

export function TableCard({
  title,
  subtitle,
  rows,
  rowHrefBase,
}: TableCardProps) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardDescription>{subtitle}</CardDescription>
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          {rows.length} {isEn ? "records" : "registros"}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <DataTable
          data={rows}
          rowHrefBase={rowHrefBase}
          searchPlaceholder={isEn ? "Filter rows..." : "Filtrar filas..."}
        />
      </CardContent>
    </Card>
  );
}
