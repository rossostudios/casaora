"use client";

import { Money01Icon } from "@hugeicons/core-free-icons";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatCard } from "@/components/ui/stat-card";
import type { ReservationDetail } from "@/lib/features/reservations/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type FinancialKpiRowProps = {
  reservation: ReservationDetail;
  isEn: boolean;
  locale: string;
};

export function FinancialKpiRow({
  reservation: r,
  isEn,
  locale,
}: FinancialKpiRowProps) {
  const fmt = (v: number) => formatCurrency(v, r.currency, locale);
  const balance = r.total_amount - r.amount_paid;

  const nightsBreakdown = r.nightly_rate
    ? `${fmt(r.nightly_rate)} x ${r.nights} ${isEn ? "nights" : "noches"} + ${isEn ? "fees" : "tarifas"}`
    : "";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        helper={nightsBreakdown}
        icon={Money01Icon}
        label="Total"
        value={fmt(r.total_amount)}
      />
      <StatCard
        helper={r.payment_method ?? undefined}
        icon={Money01Icon}
        label={isEn ? "Paid" : "Pagado"}
        value={fmt(r.amount_paid)}
      />
      <StatCard
        helper={
          balance > 0
            ? isEn
              ? "Balance due"
              : "Saldo pendiente"
            : isEn
              ? "Fully paid"
              : "Pagado completo"
        }
        icon={Money01Icon}
        label={isEn ? "Balance" : "Saldo"}
        value={fmt(balance)}
      />
      <StatCard
        helper={
          r.platform_fee
            ? `${isEn ? "after" : "después de"} ${fmt(r.platform_fee)} ${isEn ? "platform fee" : "comisión"}`
            : undefined
        }
        icon={Money01Icon}
        label={isEn ? "Owner Payout" : "Pago al propietario"}
        value={fmt(r.owner_payout_estimate)}
      />
    </div>
  );
}

type FinancialBreakdownCardProps = {
  reservation: ReservationDetail;
  isEn: boolean;
  locale: string;
};

function Row({
  label,
  amount,
  negative,
  bold,
  muted,
  danger,
}: {
  label: string;
  amount: string;
  negative?: boolean;
  bold?: boolean;
  muted?: boolean;
  danger?: boolean;
}) {
  return (
    <tr className="border-border/30 border-b last:border-b-0">
      <td
        className={cn(
          "py-2 pr-4 text-sm",
          muted && "text-muted-foreground",
          bold && "font-semibold"
        )}
      >
        {label}
      </td>
      <td
        className={cn(
          "py-2 text-right text-sm tabular-nums",
          negative && "text-muted-foreground",
          bold && "font-semibold",
          danger && "font-medium text-destructive"
        )}
      >
        {negative ? `\u2212${amount}` : amount}
      </td>
    </tr>
  );
}

export function FinancialBreakdownCard({
  reservation: r,
  isEn,
  locale,
}: FinancialBreakdownCardProps) {
  const fmt = (v: number) => formatCurrency(Math.abs(v), r.currency, locale);
  const balance = r.total_amount - r.amount_paid;

  const subtotal =
    r.nightly_rate * r.nights +
    r.cleaning_fee +
    r.tax_amount +
    r.extra_fees -
    r.discount_amount;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon
            className="text-muted-foreground"
            icon={Money01Icon}
            size={16}
          />
          {isEn ? "Financial Breakdown" : "Desglose financiero"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full">
          <tbody>
            <Row
              amount={fmt(r.nightly_rate * r.nights)}
              label={`${isEn ? "Nightly rate" : "Tarifa por noche"} x ${r.nights} ${isEn ? "nights" : "noches"}`}
            />
            <Row
              amount={fmt(r.cleaning_fee)}
              label={isEn ? "Cleaning fee" : "Limpieza"}
            />
            <Row amount={fmt(r.tax_amount)} label={isEn ? "Tax" : "Impuesto"} />
            <Row
              amount={fmt(r.extra_fees)}
              label={isEn ? "Extra fees" : "Tarifas extra"}
            />
            {r.discount_amount > 0 ? (
              <Row
                amount={fmt(r.discount_amount)}
                label={isEn ? "Discount" : "Descuento"}
                negative
              />
            ) : (
              <Row
                amount={fmt(0)}
                label={isEn ? "Discount" : "Descuento"}
                muted
              />
            )}

            <tr>
              <td
                className="border-border border-t pt-2 pr-4 font-semibold text-sm"
                colSpan={1}
              >
                Subtotal
              </td>
              <td className="border-border border-t pt-2 text-right font-semibold text-sm tabular-nums">
                {fmt(subtotal)}
              </td>
            </tr>

            {r.platform_fee > 0 ? (
              <Row
                amount={fmt(r.platform_fee)}
                label={isEn ? "Platform fee" : "Comisión plataforma"}
                negative
              />
            ) : (
              <Row
                amount={fmt(0)}
                label={isEn ? "Platform fee" : "Comisión plataforma"}
                muted
              />
            )}

            <tr>
              <td
                className="border-border border-t-2 pt-2 pr-4 font-bold text-sm"
                colSpan={1}
              >
                {isEn ? "Owner payout" : "Pago al propietario"}
              </td>
              <td className="border-border border-t-2 pt-2 text-right font-bold text-sm tabular-nums">
                {fmt(r.owner_payout_estimate)}
              </td>
            </tr>

            <tr>
              <td className="pt-4" colSpan={2}>
                <div className="h-px bg-border" />
              </td>
            </tr>

            <Row
              amount={fmt(r.amount_paid)}
              bold
              label={isEn ? "Amount paid" : "Monto pagado"}
            />
            <Row
              amount={fmt(balance)}
              bold
              danger={balance > 0}
              label={isEn ? "Balance due" : "Saldo pendiente"}
            />
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
