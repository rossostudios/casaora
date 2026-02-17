import type { MarketplaceListingViewModel } from "@/lib/features/marketplace/view-model";

type ListingFeesCardProps = {
  isEn: boolean;
  listing: MarketplaceListingViewModel;
};

export function ListingFeesCard({ isEn, listing }: ListingFeesCardProps) {
  const oneTimeFees = listing.feeLines.filter(
    (l) => l.feeType === "one_time" || l.feeType === "deposit" || l.feeType === "move_in"
  );
  const recurringFees = listing.feeLines.filter(
    (l) => l.feeType === "recurring" || l.feeType === "monthly"
  );
  const otherFees = listing.feeLines.filter(
    (l) =>
      !oneTimeFees.includes(l) && !recurringFees.includes(l)
  );

  const canCategorize = oneTimeFees.length > 0 || recurringFees.length > 0;

  return (
    <section>
      <h2 className="mb-4 font-serif text-xl font-medium tracking-tight text-[var(--marketplace-text)]">
        {isEn ? "Fee breakdown" : "Desglose de costos"}
      </h2>
      <div className="h-px bg-[#e8e4df]" />

      <div className="mt-5 space-y-6">
        {canCategorize ? (
          <>
            {oneTimeFees.length > 0 ? (
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--marketplace-text-muted)]">
                  {isEn ? "Move-in costs" : "Costos de ingreso"}
                </p>
                <div className="space-y-2">
                  {oneTimeFees.map((line) => (
                    <FeeLineRow
                      key={line.key}
                      label={line.label}
                      amount={line.amountLabel}
                      feeType={line.feeType}
                      isEn={isEn}
                    />
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t border-[#e8e4df] pt-3 text-sm font-semibold text-[var(--marketplace-text)]">
                  <span>{isEn ? "Move-in total" : "Total ingreso"}</span>
                  <span>{listing.totalMoveInLabel}</span>
                </div>
              </div>
            ) : null}

            {recurringFees.length > 0 ? (
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--marketplace-text-muted)]">
                  {isEn ? "Monthly" : "Mensual"}
                </p>
                <div className="space-y-2">
                  {recurringFees.map((line) => (
                    <FeeLineRow
                      key={line.key}
                      label={line.label}
                      amount={line.amountLabel}
                      feeType={line.feeType}
                      isEn={isEn}
                    />
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t border-[#e8e4df] pt-3 text-sm font-semibold text-[var(--marketplace-text)]">
                  <span>{isEn ? "Monthly total" : "Total mensual"}</span>
                  <span>{listing.monthlyRecurringLabel}</span>
                </div>
              </div>
            ) : null}

            {otherFees.length > 0 ? (
              <div className="space-y-2">
                {otherFees.map((line) => (
                  <FeeLineRow
                    key={line.key}
                    label={line.label}
                    amount={line.amountLabel}
                    feeType={line.feeType}
                    isEn={isEn}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <>
            {listing.feeLines.map((line) => (
              <FeeLineRow
                key={line.key}
                label={line.label}
                amount={line.amountLabel}
                feeType={line.feeType}
                isEn={isEn}
              />
            ))}
            {listing.feeLines.length === 0 ? (
              <p className="text-sm text-[var(--marketplace-text-muted)]">
                {isEn
                  ? "No fee lines configured yet."
                  : "Todavía no hay líneas de costo configuradas."}
              </p>
            ) : null}
          </>
        )}

        <div className="rounded-xl bg-[var(--marketplace-bg-muted)] p-4">
          <p className="mb-3 font-serif text-sm font-medium text-[var(--marketplace-text)]">
            {isEn ? "Rental details" : "Detalles del alquiler"}
          </p>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className="text-[var(--marketplace-text-muted)]">
              {isEn ? "Property type" : "Tipo"}:{" "}
              <span className="text-[var(--marketplace-text)]">
                {listing.propertyType || (isEn ? "Not set" : "Sin definir")}
              </span>
            </p>
            <p className="text-[var(--marketplace-text-muted)]">
              {isEn ? "Furnished" : "Amoblado"}:{" "}
              <span className="text-[var(--marketplace-text)]">
                {listing.furnished ? (isEn ? "Yes" : "Sí") : isEn ? "No" : "No"}
              </span>
            </p>
            <p className="text-[var(--marketplace-text-muted)]">
              {isEn ? "Parking spaces" : "Estacionamiento"}:{" "}
              <span className="text-[var(--marketplace-text)]">{listing.parkingSpaces ?? 0}</span>
            </p>
            <p className="text-[var(--marketplace-text-muted)]">
              {isEn ? "Minimum lease" : "Contrato mínimo"}:{" "}
              <span className="text-[var(--marketplace-text)]">
                {listing.minimumLeaseMonths
                  ? `${listing.minimumLeaseMonths} ${isEn ? "months" : "meses"}`
                  : isEn
                    ? "Not set"
                    : "Sin definir"}
              </span>
            </p>
            <p className="text-[var(--marketplace-text-muted)]">
              {isEn ? "Available from" : "Disponible desde"}:{" "}
              <span className="text-[var(--marketplace-text)]">
                {listing.availableFrom || (isEn ? "Not set" : "Sin definir")}
              </span>
            </p>
            <p className="text-[var(--marketplace-text-muted)]">
              {isEn ? "Pet policy" : "Mascotas"}:{" "}
              <span className="text-[var(--marketplace-text)]">
                {listing.petPolicy || (isEn ? "Not set" : "Sin definir")}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeeLineRow({
  label,
  amount,
  feeType,
  isEn,
}: {
  label: string;
  amount: string;
  feeType: string;
  isEn: boolean;
}) {
  const isRefundable = feeType === "deposit";

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-1.5 text-sm">
      <div className="min-w-0">
        <p className="line-clamp-2 font-medium text-[var(--marketplace-text)]">{label}</p>
        {isRefundable ? (
          <span className="text-[10px] font-medium text-emerald-600">
            {isEn ? "Refundable" : "Reembolsable"}
          </span>
        ) : null}
      </div>
      <p className="shrink-0 text-right font-medium tabular-nums text-[var(--marketplace-text)]">{amount}</p>
    </div>
  );
}
