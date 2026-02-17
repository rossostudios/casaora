"use client";

import { CasaoraLogo } from "@/components/ui/casaora-logo";
import { formatCurrency } from "@/lib/format";

type LineItem = {
  id: string;
  label: string;
  amount: number;
};

type StatementPrintViewProps = {
  orgName: string;
  periodLabel: string;
  generatedAt: string;
  currency: string;
  locale: string;
  collections: LineItem[];
  expenses: LineItem[];
  totalRevenue: number;
  totalExpenses: number;
  netPayout: number;
};

export function StatementPrintView({
  orgName,
  periodLabel,
  generatedAt,
  currency,
  locale,
  collections,
  expenses,
  totalRevenue,
  totalExpenses,
  netPayout,
}: StatementPrintViewProps) {
  const isEn = locale === "en-US";
  const fmt = (v: number) => formatCurrency(v, currency, locale);

  return (
    <div className="statement-print mx-auto max-w-3xl p-8 font-sans text-sm text-gray-900">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .statement-print { max-width: 100%; padding: 24px; }
        }
      `}</style>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-3">
          <CasaoraLogo className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-bold">Casaora</h1>
            <p className="text-xs text-gray-500">{orgName}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-base font-semibold">
            {isEn ? "Owner Statement" : "Estado de Cuenta"}
          </h2>
          <p className="text-xs text-gray-500">{periodLabel}</p>
          <p className="text-xs text-gray-400">
            {isEn ? "Generated" : "Generado"}: {generatedAt}
          </p>
        </div>
      </div>

      {/* Revenue / Collections */}
      <section className="mb-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {isEn ? "Revenue / Collections" : "Ingresos / Cobros"}
        </h3>
        {collections.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="pb-1 font-medium">
                  {isEn ? "Description" : "Descripcion"}
                </th>
                <th className="pb-1 text-right font-medium">
                  {isEn ? "Amount" : "Monto"}
                </th>
              </tr>
            </thead>
            <tbody>
              {collections.map((item) => (
                <tr className="border-b border-gray-100" key={item.id}>
                  <td className="py-1.5">{item.label}</td>
                  <td className="py-1.5 text-right">{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="pt-2">
                  {isEn ? "Total Revenue" : "Total Ingresos"}
                </td>
                <td className="pt-2 text-right">{fmt(totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="text-gray-400">
            {isEn
              ? "No collections this period."
              : "Sin cobros en este periodo."}
          </p>
        )}
      </section>

      {/* Expenses */}
      <section className="mb-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {isEn ? "Expenses" : "Gastos"}
        </h3>
        {expenses.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="pb-1 font-medium">
                  {isEn ? "Description" : "Descripcion"}
                </th>
                <th className="pb-1 text-right font-medium">
                  {isEn ? "Amount" : "Monto"}
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((item) => (
                <tr className="border-b border-gray-100" key={item.id}>
                  <td className="py-1.5">{item.label}</td>
                  <td className="py-1.5 text-right text-red-600">
                    -{fmt(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="pt-2">
                  {isEn ? "Total Expenses" : "Total Gastos"}
                </td>
                <td className="pt-2 text-right text-red-600">
                  -{fmt(totalExpenses)}
                </td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="text-gray-400">
            {isEn
              ? "No expenses this period."
              : "Sin gastos en este periodo."}
          </p>
        )}
      </section>

      {/* Net Payout */}
      <section className="rounded-lg border-2 border-gray-900 p-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold">
            {isEn ? "Net Payout" : "Pago Neto"}
          </span>
          <span className="text-xl font-bold">{fmt(netPayout)}</span>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-8 border-t pt-4 text-center text-xs text-gray-400">
        <p>Casaora &middot; casaora.co</p>
        <p>
          {isEn
            ? "This document is for informational purposes only."
            : "Este documento es solo para fines informativos."}
        </p>
      </div>
    </div>
  );
}
