"use client";

import {
  Clock01Icon,
  Home01Icon,
  Money01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import { Icon } from "@/components/ui/icon";
import { formatCurrency } from "@/lib/format";

type UnitAboutSectionProps = {
  record: Record<string, unknown>;
  isEn: boolean;
  locale: "en-US" | "es-PY";
};

export function UnitAboutSection({
  record,
  isEn,
  locale,
}: UnitAboutSectionProps) {
  const checkIn = String(
    record.check_in_time ?? (isEn ? "Not set" : "No definido")
  );
  const checkOut = String(
    record.check_out_time ?? (isEn ? "Not set" : "No definido")
  );
  const area = record.square_meters ? `${record.square_meters} m²` : null;
  const currency = String(record.currency ?? "PYG");

  const nightlyRate =
    typeof record.default_nightly_rate === "number"
      ? formatCurrency(record.default_nightly_rate, currency, locale)
      : null;

  const cleaningFee =
    typeof record.default_cleaning_fee === "number"
      ? formatCurrency(record.default_cleaning_fee, currency, locale)
      : null;

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-foreground text-xl tracking-tight">
        {isEn ? "About this unit" : "Sobre esta unidad"}
      </h3>
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
        {area && (
          <div className="flex items-start gap-4">
            <Icon
              className="mt-0.5 text-muted-foreground"
              icon={Home01Icon}
              size={24}
            />
            <div>
              <p className="font-semibold text-foreground">
                {isEn ? "Total area" : "Área total"}
              </p>
              <p className="text-muted-foreground">{area}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-4">
          <Icon
            className="mt-0.5 text-muted-foreground"
            icon={Clock01Icon}
            size={24}
          />
          <div>
            <p className="font-semibold text-foreground">
              {isEn ? "Check-in & Check-out" : "Entrada y Salida"}
            </p>
            <p className="text-muted-foreground">
              {checkIn.slice(0, 5)} – {checkOut.slice(0, 5)}
            </p>
          </div>
        </div>

        {nightlyRate && (
          <div className="flex items-start gap-4">
            <Icon
              className="mt-0.5 text-muted-foreground"
              icon={Money01Icon}
              size={24}
            />
            <div>
              <p className="font-semibold text-foreground">
                {isEn ? "Default nightly rate" : "Tarifa por noche"}
              </p>
              <p className="text-muted-foreground">{nightlyRate}</p>
            </div>
          </div>
        )}

        {cleaningFee && (
          <div className="flex items-start gap-4">
            <Icon
              className="mt-0.5 text-muted-foreground"
              icon={SparklesIcon}
              size={24}
            />
            <div>
              <p className="font-semibold text-foreground">
                {isEn ? "Cleaning fee" : "Tarifa de limpieza"}
              </p>
              <p className="text-muted-foreground">{cleaningFee}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
