import {
  CarParking01Icon,
  Dumbbell01Icon,
  SecurityCheckIcon,
  Tick01Icon,
  WashingMachineIcon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { Icon } from "@/components/ui/icon";

const AMENITY_ICON_MAP: Record<string, IconSvgElement> = {
  wifi: Wifi01Icon,
  internet: Wifi01Icon,
  gym: Dumbbell01Icon,
  gymnasium: Dumbbell01Icon,
  parking: CarParking01Icon,
  estacionamiento: CarParking01Icon,
  laundry: WashingMachineIcon,
  lavanderia: WashingMachineIcon,
  security: SecurityCheckIcon,
  seguridad: SecurityCheckIcon,
  vigilancia: SecurityCheckIcon,
};

function getAmenityIcon(amenity: string): IconSvgElement {
  const key = amenity.toLowerCase().trim();
  for (const [pattern, icon] of Object.entries(AMENITY_ICON_MAP)) {
    if (key.includes(pattern)) return icon;
  }
  return Tick01Icon;
}

type ListingAmenitiesProps = {
  amenities: string[];
  isEn: boolean;
};

export function ListingAmenities({ amenities, isEn }: ListingAmenitiesProps) {
  if (!amenities.length) return null;

  const visible = amenities.slice(0, 12);

  return (
    <section>
      <h2 className="mb-4 font-medium font-serif text-[var(--marketplace-text)] text-xl tracking-tight">
        {isEn ? "Amenities" : "Amenidades"}
      </h2>
      <div className="h-px bg-[#e8e4df]" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((amenity) => (
          <div
            className="inline-flex items-center gap-3 py-2 text-sm"
            key={amenity}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--marketplace-bg-muted)]">
              <Icon
                className="text-[var(--marketplace-text-muted)]"
                icon={getAmenityIcon(amenity)}
                size={14}
              />
            </span>
            <span className="text-[var(--marketplace-text)]">{amenity}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
