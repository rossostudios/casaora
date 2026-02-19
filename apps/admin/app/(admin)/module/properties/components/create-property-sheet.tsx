import { createPropertyFromPropertiesModuleAction } from "@/app/(admin)/module/properties/actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type CreatePropertySheetProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  orgId: string;
  isEn: boolean;
  title: string;
  description: string;
  nameLabel: string;
  codeLabel: string;
  cancelLabel: string;
  createLabel: string;
};

export function CreatePropertySheet({
  open,
  onOpenChange,
  orgId,
  isEn,
  title,
  description,
  nameLabel,
  codeLabel,
  cancelLabel,
  createLabel,
}: CreatePropertySheetProps) {
  const copy = {
    basics: isEn ? "Basic details" : "Datos básicos",
    location: isEn ? "Location" : "Ubicación",
    operations: isEn ? "Operations" : "Operaciones",
    ownership: isEn ? "Ownership" : "Propiedad",
    status: isEn ? "Status" : "Estado",
    propertyType: isEn ? "Property type" : "Tipo de propiedad",
    addressLine1: isEn ? "Address line 1" : "Dirección línea 1",
    addressLine2: isEn ? "Address line 2" : "Dirección línea 2",
    neighborhood: isEn ? "Neighborhood" : "Barrio",
    city: isEn ? "City" : "Ciudad",
    region: isEn ? "Region / State" : "Región / Departamento",
    postalCode: isEn ? "Postal code" : "Código postal",
    countryCode: isEn ? "Country code" : "Código país",
    latitude: isEn ? "Latitude" : "Latitud",
    longitude: isEn ? "Longitude" : "Longitud",
    amenities: isEn ? "Building amenities" : "Amenidades del edificio",
    amenitiesHint: isEn
      ? "Separate values with commas (e.g., pool, gym, elevator)."
      : "Separa valores con comas (ej: piscina, gimnasio, ascensor).",
    accessInstructions: isEn ? "Access instructions" : "Instrucciones de acceso",
    wifiName: isEn ? "Shared WiFi name" : "Nombre WiFi compartido",
    wifiPassword: isEn ? "Shared WiFi password" : "Clave WiFi compartida",
    assetOwnerName: isEn ? "Asset owner name" : "Nombre del titular del activo",
    assetOwnerOrgId: isEn
      ? "Asset owner organization ID"
      : "ID de organización titular",
  };

  return (
    <Sheet
      description={description}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      <Form
        action={createPropertyFromPropertiesModuleAction}
        className="space-y-6"
      >
        <input name="organization_id" type="hidden" value={orgId} />

        <section className="space-y-3 rounded-2xl border border-border/50 bg-card/40 p-4">
          <h3 className="font-medium text-sm">{copy.basics}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {nameLabel}
              </span>
              <Input name="name" placeholder="Edificio Centro" required />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {codeLabel}
              </span>
              <Input name="code" placeholder="CEN-01" />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.status}
              </span>
              <Select defaultValue="active" name="status">
                <option value="active">{isEn ? "Active" : "Activa"}</option>
                <option value="inactive">{isEn ? "Inactive" : "Inactiva"}</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.propertyType}
              </span>
              <Select defaultValue="" name="property_type">
                <option value="">
                  {isEn ? "Select type (optional)" : "Seleccionar tipo (opcional)"}
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
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/50 bg-card/40 p-4">
          <h3 className="font-medium text-sm">{copy.location}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 md:col-span-2">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.addressLine1}
              </span>
              <Input name="address_line1" placeholder="Av. España 1234" />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.addressLine2}
              </span>
              <Input name="address_line2" placeholder="Depto 4B / Torre Norte" />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.neighborhood}
              </span>
              <Input name="neighborhood" placeholder="Villa Morra" />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.city}
              </span>
              <Input name="city" placeholder="Asuncion" />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.region}
              </span>
              <Input name="region" placeholder="Asunción" />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.postalCode}
              </span>
              <Input name="postal_code" placeholder="1234" />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.countryCode}
              </span>
              <Input
                autoCapitalize="characters"
                defaultValue="PY"
                maxLength={2}
                name="country_code"
                placeholder="PY"
              />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.latitude}
              </span>
              <Input name="latitude" placeholder="-25.2854" step="any" type="number" />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.longitude}
              </span>
              <Input name="longitude" placeholder="-57.5780" step="any" type="number" />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/50 bg-card/40 p-4">
          <h3 className="font-medium text-sm">{copy.operations}</h3>
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.amenities}
              </span>
              <Textarea
                className="min-h-[80px]"
                name="building_amenities"
                placeholder={
                  isEn
                    ? "pool, gym, coworking, shared kitchen, rooftop"
                    : "piscina, gimnasio, coworking, cocina compartida, terraza"
                }
              />
              <span className="text-[11px] text-muted-foreground">
                {copy.amenitiesHint}
              </span>
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.accessInstructions}
              </span>
              <Textarea
                className="min-h-[96px]"
                name="access_instructions"
                placeholder={
                  isEn
                    ? "Gate code, concierge hours, check-in directions..."
                    : "Código de acceso, horario de portería, instrucciones de ingreso..."
                }
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="font-medium text-muted-foreground text-xs">
                  {copy.wifiName}
                </span>
                <Input name="shared_wifi_name" placeholder="Casaora-Guest" />
              </label>
              <label className="grid gap-1">
                <span className="font-medium text-muted-foreground text-xs">
                  {copy.wifiPassword}
                </span>
                <Input name="shared_wifi_password" placeholder="********" />
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/50 bg-card/40 p-4">
          <h3 className="font-medium text-sm">{copy.ownership}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.assetOwnerName}
              </span>
              <Input name="asset_owner_name" placeholder="Acme Holdings LLC" />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {copy.assetOwnerOrgId}
              </span>
              <Input
                name="asset_owner_organization_id"
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {cancelLabel}
          </Button>
          <Button
            className="bg-[#1e2b61] font-semibold text-white hover:bg-[#1e2b61]/90"
            type="submit"
            variant="secondary"
          >
            {createLabel}
          </Button>
        </div>
      </Form>
    </Sheet>
  );
}
