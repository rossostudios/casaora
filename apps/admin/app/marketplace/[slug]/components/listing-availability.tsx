"use client";

import { Calendar02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";

type ListingAvailabilityProps = {
  availableFrom: string;
  minimumLeaseMonths: number | null;
  isEn: boolean;
};

export function ListingAvailability({
  availableFrom,
  minimumLeaseMonths,
  isEn,
}: ListingAvailabilityProps) {
  if (!availableFrom) return null;

  const availDate = new Date(availableFrom);
  const today = new Date();
  const isAvailableNow = availDate <= today;

  return (
    <section>
      <h2 className="mb-4 font-serif text-xl font-medium tracking-tight text-[var(--marketplace-text)]">
        {isEn ? "Availability" : "Disponibilidad"}
      </h2>
      <div className="h-px bg-[#e8e4df]" />
      <div className="mt-4 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Icon className="text-primary" icon={Calendar02Icon} size={18} />
        </span>
        <div>
          <p className="font-medium text-sm text-[var(--marketplace-text)]">
            {isAvailableNow
              ? isEn
                ? "Available now"
                : "Disponible ahora"
              : isEn
                ? `Available from ${availableFrom}`
                : `Disponible desde ${availableFrom}`}
          </p>
          {minimumLeaseMonths ? (
            <p className="text-xs text-[var(--marketplace-text-muted)]">
              {isEn
                ? `Minimum lease: ${minimumLeaseMonths} months`
                : `Contrato mínimo: ${minimumLeaseMonths} meses`}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
