import { createPropertyFromPropertiesModuleAction } from "@/app/(admin)/module/properties/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, FieldGroup } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CreatePropertySheetProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  orgId: string;
  isEn: boolean;
  returnTo: string;
};

export function CreatePropertySheet({
  open,
  onOpenChange,
  orgId,
  isEn,
  returnTo,
}: CreatePropertySheetProps) {
  return (
    <Drawer
      closeLabel={isEn ? "Close property form" : "Cerrar formulario"}
      description={
        isEn
          ? "Add the core portfolio record first. You can refine operations and integrations after save."
          : "Crea primero el registro base del portafolio. Luego puedes completar operaciones e integraciones."
      }
      onOpenChange={onOpenChange}
      open={open}
      side="right"
      title={isEn ? "Create property" : "Crear propiedad"}
      className="w-[min(94vw,38rem)]"
    >
      <Form
        action={createPropertyFromPropertiesModuleAction}
        className="space-y-6 px-4 py-5 sm:px-6"
      >
        <input name="organization_id" type="hidden" value={orgId} />
        <input name="return_to" type="hidden" value={returnTo} />

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-base">
              {isEn ? "Property basics" : "Datos básicos"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "Set the portfolio identity and the operational status operators will recognize."
                : "Define la identidad del activo y el estado operativo que verá el equipo."}
            </p>
          </div>

          <FieldGroup>
            <Field
              htmlFor="property-name"
              label={isEn ? "Property name" : "Nombre de la propiedad"}
              required
            >
              <Input
                id="property-name"
                name="name"
                placeholder={isEn ? "Casaora Centro" : "Casaora Centro"}
                required
              />
            </Field>
            <Field
              htmlFor="property-code"
              label={isEn ? "Internal code" : "Código interno"}
            >
              <Input
                id="property-code"
                name="code"
                placeholder={isEn ? "CTR-01" : "CTR-01"}
              />
            </Field>
            <Field htmlFor="property-status" label={isEn ? "Status" : "Estado"}>
              <Select defaultValue="active" id="property-status" name="status">
                <option value="active">{isEn ? "Active" : "Activa"}</option>
                <option value="inactive">{isEn ? "Inactive" : "Inactiva"}</option>
              </Select>
            </Field>
            <Field
              htmlFor="property-type"
              label={isEn ? "Property type" : "Tipo de propiedad"}
            >
              <Select defaultValue="" id="property-type" name="property_type">
                <option value="">
                  {isEn ? "Select type" : "Seleccionar tipo"}
                </option>
                <option value="apartment_building">
                  {isEn ? "Apartment building" : "Edificio de apartamentos"}
                </option>
                <option value="co_living_house">
                  {isEn ? "Co-living house" : "Casa co-living"}
                </option>
                <option value="hotel">{isEn ? "Hotel" : "Hotel"}</option>
                <option value="single_family">
                  {isEn ? "Single family" : "Vivienda unifamiliar"}
                </option>
                <option value="multi_family">
                  {isEn ? "Multi family" : "Vivienda multifamiliar"}
                </option>
                <option value="hostel">{isEn ? "Hostel" : "Hostal"}</option>
                <option value="mixed_use">
                  {isEn ? "Mixed use" : "Uso mixto"}
                </option>
              </Select>
            </Field>
          </FieldGroup>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-base">
              {isEn ? "Location" : "Ubicación"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "This powers Portfolio search, hierarchy, and unit navigation."
                : "Esto alimenta la búsqueda del portafolio, la jerarquía y la navegación entre unidades."}
            </p>
          </div>

          <FieldGroup className="md:grid-cols-1">
            <Field
              htmlFor="property-address-1"
              label={isEn ? "Address line 1" : "Dirección línea 1"}
            >
              <Input
                id="property-address-1"
                name="address_line1"
                placeholder={isEn ? "Av. España 1234" : "Av. España 1234"}
              />
            </Field>
            <Field
              htmlFor="property-address-2"
              label={isEn ? "Address line 2" : "Dirección línea 2"}
            >
              <Input
                id="property-address-2"
                name="address_line2"
                placeholder={isEn ? "Tower B, floor 4" : "Torre B, piso 4"}
              />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field htmlFor="property-neighborhood" label={isEn ? "Neighborhood" : "Barrio"}>
              <Input id="property-neighborhood" name="neighborhood" />
            </Field>
            <Field htmlFor="property-city" label={isEn ? "City" : "Ciudad"}>
              <Input id="property-city" name="city" placeholder="Asuncion" />
            </Field>
            <Field htmlFor="property-region" label={isEn ? "Region / State" : "Región / Departamento"}>
              <Input id="property-region" name="region" />
            </Field>
            <Field htmlFor="property-country" label={isEn ? "Country code" : "Código país"}>
              <Input
                autoCapitalize="characters"
                defaultValue="PY"
                id="property-country"
                maxLength={2}
                name="country_code"
                placeholder="PY"
              />
            </Field>
          </FieldGroup>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-base">
              {isEn ? "Operator notes" : "Notas operativas"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "Optional details that help the team complete setup faster."
                : "Detalles opcionales para acelerar la configuración operativa."}
            </p>
          </div>

          <FieldGroup className="md:grid-cols-1">
            <Field
              htmlFor="property-amenities"
              description={
                isEn
                  ? "Separate values with commas."
                  : "Separa los valores con comas."
              }
              label={isEn ? "Building amenities" : "Amenidades del edificio"}
            >
              <Textarea
                id="property-amenities"
                name="building_amenities"
                placeholder={
                  isEn
                    ? "pool, coworking, elevator"
                    : "piscina, coworking, ascensor"
                }
              />
            </Field>
            <Field
              htmlFor="property-access"
              label={isEn ? "Access instructions" : "Instrucciones de acceso"}
            >
              <Textarea
                id="property-access"
                name="access_instructions"
                placeholder={
                  isEn
                    ? "Gate code, concierge hours, arrival notes"
                    : "Código de acceso, horario de portería, notas de ingreso"
                }
              />
            </Field>
          </FieldGroup>
        </section>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            {isEn ? "Cancel" : "Cancelar"}
          </Button>
          <Button type="submit">
            {isEn ? "Create property" : "Crear propiedad"}
          </Button>
        </div>
      </Form>
    </Drawer>
  );
}
