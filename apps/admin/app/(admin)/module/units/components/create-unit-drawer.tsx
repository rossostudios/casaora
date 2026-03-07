import { createUnitFromUnitsModuleAction } from "@/app/(admin)/module/units/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, FieldGroup } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type CreateUnitDrawerProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  orgId: string;
  isEn: boolean;
  returnTo: string;
  propertyOptions: Array<{ id: string; name: string }>;
  defaultPropertyId?: string | null;
};

export function CreateUnitDrawer({
  open,
  onOpenChange,
  orgId,
  isEn,
  returnTo,
  propertyOptions,
  defaultPropertyId,
}: CreateUnitDrawerProps) {
  return (
    <Drawer
      closeLabel={isEn ? "Close unit form" : "Cerrar formulario"}
      description={
        isEn
          ? "Create the rentable unit inside an existing property and return to the same portfolio workflow."
          : "Crea la unidad rentable dentro de una propiedad existente y vuelve al mismo flujo del portafolio."
      }
      onOpenChange={onOpenChange}
      open={open}
      side="right"
      title={isEn ? "Create unit" : "Crear unidad"}
      className="w-[min(94vw,36rem)]"
    >
      <Form
        action={createUnitFromUnitsModuleAction}
        className="space-y-6 px-4 py-5 sm:px-6"
      >
        <input name="organization_id" type="hidden" value={orgId} />
        <input name="return_to" type="hidden" value={returnTo} />

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-base">
              {isEn ? "Unit basics" : "Datos de la unidad"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "Choose the parent property first so the unit lands in the right portfolio context."
                : "Elige primero la propiedad madre para que la unidad quede en el contexto correcto del portafolio."}
            </p>
          </div>

          <FieldGroup>
            <Field
              htmlFor="unit-property"
              label={isEn ? "Property" : "Propiedad"}
              required
            >
              <Select
                defaultValue={defaultPropertyId ?? ""}
                id="unit-property"
                name="property_id"
                required
              >
                <option value="">
                  {isEn ? "Select property" : "Seleccionar propiedad"}
                </option>
                {propertyOptions.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="unit-type" label={isEn ? "Unit type" : "Tipo de unidad"}>
              <Select defaultValue="entire_place" id="unit-type" name="unit_type">
                <option value="entire_place">
                  {isEn ? "Entire place" : "Unidad completa"}
                </option>
                <option value="private_room">
                  {isEn ? "Private room" : "Habitación privada"}
                </option>
                <option value="shared_room">
                  {isEn ? "Shared room" : "Habitación compartida"}
                </option>
                <option value="bed">{isEn ? "Bed" : "Cama"}</option>
              </Select>
            </Field>
            <Field htmlFor="unit-code" label={isEn ? "Unit code" : "Código"} required>
              <Input id="unit-code" name="code" placeholder="4B" required />
            </Field>
            <Field htmlFor="unit-name" label={isEn ? "Display name" : "Nombre visible"} required>
              <Input
                id="unit-name"
                name="name"
                placeholder={isEn ? "Apartment 4B" : "Apartamento 4B"}
                required
              />
            </Field>
          </FieldGroup>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-base">
              {isEn ? "Operational defaults" : "Predeterminados operativos"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "These fields drive leasing, turn status, and portfolio health."
                : "Estos campos alimentan leasing, turnos y salud del portafolio."}
            </p>
          </div>

          <FieldGroup>
            <Field htmlFor="unit-condition" label={isEn ? "Condition" : "Condición"}>
              <Select defaultValue="clean" id="unit-condition" name="condition_status">
                <option value="clean">{isEn ? "Clean" : "Limpia"}</option>
                <option value="dirty">{isEn ? "Dirty" : "Sucia"}</option>
                <option value="inspecting">
                  {isEn ? "Inspecting" : "En inspección"}
                </option>
                <option value="out_of_order">
                  {isEn ? "Out of order" : "Fuera de servicio"}
                </option>
              </Select>
            </Field>
            <Field htmlFor="unit-floor" label={isEn ? "Floor" : "Piso"}>
              <Input id="unit-floor" name="floor_level" type="number" />
            </Field>
            <Field htmlFor="unit-guests" label={isEn ? "Max guests" : "Huéspedes máximos"}>
              <Input defaultValue="2" id="unit-guests" name="max_guests" type="number" />
            </Field>
            <Field htmlFor="unit-bedrooms" label={isEn ? "Bedrooms" : "Dormitorios"}>
              <Input defaultValue="1" id="unit-bedrooms" name="bedrooms" type="number" />
            </Field>
            <Field htmlFor="unit-bathrooms" label={isEn ? "Bathrooms" : "Baños"}>
              <Input
                defaultValue="1"
                id="unit-bathrooms"
                name="bathrooms"
                step="0.5"
                type="number"
              />
            </Field>
            <Field htmlFor="unit-rent" label={isEn ? "Base monthly rent" : "Renta mensual base"}>
              <Input
                id="unit-rent"
                min="0"
                name="base_price_monthly"
                step="0.01"
                type="number"
              />
            </Field>
            <Field htmlFor="unit-currency" label={isEn ? "Currency" : "Moneda"}>
              <Select defaultValue="PYG" id="unit-currency" name="currency">
                <option value="PYG">PYG</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
          </FieldGroup>
        </section>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
          <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
            {isEn ? "Cancel" : "Cancelar"}
          </Button>
          <Button type="submit">{isEn ? "Create unit" : "Crear unidad"}</Button>
        </div>
      </Form>
    </Drawer>
  );
}
