"use client";

import { useRouter } from "next/navigation";
import { ListingForm } from "@/components/listings/listing-form";
import { Drawer } from "@/components/ui/drawer";

type Option = {
  id: string;
  label: string;
};

type CreateListingDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  isEn: boolean;
  locale: string;
  propertyOptions: Option[];
  unitOptions: Option[];
  pricingTemplateOptions: Option[];
};

export function CreateListingDrawer({
  open,
  onOpenChange,
  orgId,
  isEn,
  locale,
  propertyOptions,
  unitOptions,
  pricingTemplateOptions,
}: CreateListingDrawerProps) {
  const router = useRouter();

  return (
    <Drawer
      className="w-[min(94vw,42rem)]"
      closeLabel={isEn ? "Close listing form" : "Cerrar formulario"}
      description={
        isEn
          ? "Create a Casaora Marketplace listing from a real rentable unit and return to the queue."
          : "Crea un anuncio del Marketplace de Casaora desde una unidad rentable real y vuelve a la cola."
      }
      onOpenChange={onOpenChange}
      open={open}
      side="right"
      title={isEn ? "Create listing" : "Crear anuncio"}
    >
      <div className="px-4 py-5 sm:px-6">
        <ListingForm
          editing={null}
          isEn={isEn}
          locale={locale}
          onSuccess={() => {
            onOpenChange(false);
            router.refresh();
          }}
          orgId={orgId}
          pricingTemplateOptions={pricingTemplateOptions}
          propertyOptions={propertyOptions}
          requireUnitLink
          unitOptions={unitOptions}
        />
      </div>
    </Drawer>
  );
}
