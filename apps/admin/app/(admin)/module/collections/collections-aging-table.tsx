"use client";

import { formatCurrency } from "@/lib/format";

import type { AgingRow } from "./collections-utils";

export function CollectionsAgingTable({
  agingRows,
  isEn,
  locale,
}: {
  agingRows: AgingRow[];
  isEn: boolean;
  locale: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">
              {isEn ? "Tenant" : "Inquilino"}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {isEn ? "Current" : "Vigente"}
            </th>
            <th className="px-3 py-2 text-right font-medium">1-30d</th>
            <th className="px-3 py-2 text-right font-medium">31-60d</th>
            <th className="px-3 py-2 text-right font-medium">61-90d</th>
            <th className="px-3 py-2 text-right font-medium">90+d</th>
            <th className="px-3 py-2 text-right font-medium">
              {isEn ? "Total" : "Total"}
            </th>
          </tr>
        </thead>
        <tbody>
          {agingRows.length === 0 ? (
            <tr>
              <td
                className="px-3 py-6 text-center text-muted-foreground"
                colSpan={7}
              >
                {isEn ? "No outstanding collections" : "Sin cobros pendientes"}
              </td>
            </tr>
          ) : (
            agingRows.map((r) => (
              <tr
                className="border-b last:border-0"
                key={`${r.leaseId}-${r.currency}`}
              >
                <td className="px-3 py-2">
                  <p className="font-medium">{r.tenant}</p>
                  <p className="text-muted-foreground text-xs">{r.currency}</p>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.current > 0
                    ? formatCurrency(r.current, r.currency, locale)
                    : "-"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.d1_30 > 0
                    ? formatCurrency(r.d1_30, r.currency, locale)
                    : "-"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.d31_60 > 0
                    ? formatCurrency(r.d31_60, r.currency, locale)
                    : "-"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.d61_90 > 0
                    ? formatCurrency(r.d61_90, r.currency, locale)
                    : "-"}
                </td>
                <td className="px-3 py-2 text-right text-destructive tabular-nums">
                  {r.d90plus > 0
                    ? formatCurrency(r.d90plus, r.currency, locale)
                    : "-"}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {formatCurrency(r.total, r.currency, locale)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
