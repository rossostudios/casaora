"use client";

import { useMemo, useState } from "react";
import {
  createLeaseAction,
  updateLeaseAction,
} from "@/app/(admin)/module/leases/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer } from "@/components/ui/drawer";
import { Field, FieldGroup } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type LeaseFormEditing = {
  id: string;
  applicationId?: string | null;
  propertyId?: string | null;
  propertyName?: string | null;
  unitId?: string | null;
  unitName?: string | null;
  spaceId?: string | null;
  spaceName?: string | null;
  bedId?: string | null;
  bedCode?: string | null;
  tenantName: string;
  tenantEmail?: string | null;
  tenantPhoneE164?: string | null;
  leaseStatus: string;
  startsOn: string;
  endsOn?: string | null;
  currency: string;
  monthlyRent: number;
  serviceFeeFlat: number;
  securityDeposit: number;
  guaranteeOptionFee: number;
  taxIva: number;
  platformFee: number;
  notes?: string | null;
};

type LeaseFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LeaseFormEditing | null;
  orgId: string;
  nextPath: string;
  isEn: boolean;
  propertyOptions: Array<{ id: string; label: string }>;
  unitOptions: Array<{ id: string; label: string; propertyId?: string | null }>;
  defaultPropertyId?: string | null;
};

export function LeaseFormSheet({
  open,
  onOpenChange,
  editing,
  orgId,
  nextPath,
  isEn,
  propertyOptions,
  unitOptions,
  defaultPropertyId,
}: LeaseFormSheetProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    editing?.propertyId ?? defaultPropertyId ?? "",
  );
  const [selectedUnitId, setSelectedUnitId] = useState(editing?.unitId ?? "");
  const [saveAsGuest, setSaveAsGuest] = useState(false);

  const availableUnits = useMemo(
    () =>
      unitOptions.filter((unit) =>
        selectedPropertyId ? unit.propertyId === selectedPropertyId : true,
      ),
    [selectedPropertyId, unitOptions],
  );

  const defaultUnitId =
    selectedUnitId ||
    (editing?.propertyId === selectedPropertyId ? editing?.unitId : "") ||
    (selectedPropertyId
      ? availableUnits.find((unit) => unit.propertyId === selectedPropertyId)
          ?.id
      : "");

  return (
    <Drawer
      className="w-[min(94vw,42rem)]"
      closeLabel={isEn ? "Close lease form" : "Cerrar formulario"}
      description={
        editing
          ? isEn
            ? "Update the core lease record. Collections, documents, and renewals stay in the workbench."
            : "Actualiza el contrato base. Cobros, documentos y renovaciones quedan en el workbench."
          : isEn
            ? "Create a unit-backed lease first so collections, renewals, and documents all stay linked."
            : "Crea primero un contrato ligado a una unidad para mantener conectados cobros, renovaciones y documentos."
      }
      onOpenChange={(next) => {
        if (next) {
          setSelectedPropertyId(editing?.propertyId ?? defaultPropertyId ?? "");
          setSelectedUnitId(editing?.unitId ?? "");
          setSaveAsGuest(false);
        }
        onOpenChange(next);
      }}
      open={open}
      side="right"
      title={
        editing
          ? isEn
            ? "Edit lease"
            : "Editar contrato"
          : isEn
            ? "Create lease"
            : "Crear contrato"
      }
    >
      <Form
        action={editing ? updateLeaseAction : createLeaseAction}
        className="space-y-6 px-4 py-5 sm:px-6"
        key={editing?.id ?? "create"}
      >
        {editing ? (
          <input name="lease_id" type="hidden" value={editing.id} />
        ) : (
          <input name="organization_id" type="hidden" value={orgId} />
        )}
        <input name="next" type="hidden" value={nextPath} />
        {editing?.applicationId ? (
          <input
            name="application_id"
            type="hidden"
            value={editing.applicationId}
          />
        ) : null}
        {editing?.spaceId && editing.unitId === selectedUnitId ? (
          <input name="space_id" type="hidden" value={editing.spaceId} />
        ) : null}
        {editing?.bedId && editing.unitId === selectedUnitId ? (
          <input name="bed_id" type="hidden" value={editing.bedId} />
        ) : null}

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-base">
              {isEn ? "Occupancy target" : "Destino de ocupación"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "Choose the property and unit first. Advanced space or bed targets are preserved automatically when this lease already has them."
                : "Elige primero propiedad y unidad. Los destinos avanzados de espacio o cama se conservan automáticamente cuando el contrato ya los tiene."}
            </p>
          </div>

          <FieldGroup>
            <Field
              htmlFor="lease-property"
              label={isEn ? "Property" : "Propiedad"}
              required
            >
              <Select
                defaultValue={editing?.propertyId ?? defaultPropertyId ?? ""}
                id="lease-property"
                name="property_id"
                onChange={(event) => {
                  const nextPropertyId = event.target.value;
                  setSelectedPropertyId(nextPropertyId);
                  if (editing?.propertyId !== nextPropertyId) {
                    setSelectedUnitId("");
                  }
                }}
                required
              >
                <option value="">
                  {isEn ? "Select property" : "Seleccionar propiedad"}
                </option>
                {propertyOptions.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              htmlFor="lease-unit"
              label={isEn ? "Unit" : "Unidad"}
              required
            >
              <Select
                key={`${editing?.id ?? "create"}:${selectedPropertyId}`}
                defaultValue={defaultUnitId}
                id="lease-unit"
                name="unit_id"
                onChange={(event) => setSelectedUnitId(event.target.value)}
                required
              >
                <option value="">
                  {isEn ? "Select unit" : "Seleccionar unidad"}
                </option>
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldGroup>

          {editing?.spaceName || editing?.bedCode ? (
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm">
              <p className="font-medium">
                {isEn ? "Advanced occupancy target" : "Destino avanzado"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {[editing.spaceName, editing.bedCode]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-base">
              {isEn ? "Tenant and term" : "Inquilino y vigencia"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "Capture the tenant identity and the dates that should drive collections and renewal timing."
                : "Captura la identidad del inquilino y las fechas que deben gobernar cobros y renovaciones."}
            </p>
          </div>

          <FieldGroup>
            <Field
              htmlFor="lease-tenant-name"
              label={isEn ? "Tenant full name" : "Nombre completo"}
              required
            >
              <Input
                defaultValue={editing?.tenantName ?? ""}
                id="lease-tenant-name"
                name="tenant_full_name"
                placeholder={isEn ? "John Doe" : "Juan Pérez"}
                required
              />
            </Field>
            <Field
              htmlFor="lease-status"
              label={isEn ? "Lease status" : "Estado"}
            >
              <Select
                defaultValue={editing?.leaseStatus ?? "draft"}
                id="lease-status"
                name="lease_status"
              >
                <option value="draft">{isEn ? "Draft" : "Borrador"}</option>
                <option value="active">{isEn ? "Active" : "Activo"}</option>
                <option value="delinquent">
                  {isEn ? "Delinquent" : "Moroso"}
                </option>
                <option value="terminated">
                  {isEn ? "Terminated" : "Terminado"}
                </option>
                <option value="completed">
                  {isEn ? "Completed" : "Completado"}
                </option>
              </Select>
            </Field>
            <Field
              htmlFor="lease-tenant-email"
              label={isEn ? "Email" : "Correo"}
            >
              <Input
                defaultValue={editing?.tenantEmail ?? ""}
                id="lease-tenant-email"
                name="tenant_email"
                type="email"
              />
            </Field>
            <Field
              htmlFor="lease-tenant-phone"
              label={isEn ? "Phone" : "Teléfono"}
            >
              <Input
                defaultValue={editing?.tenantPhoneE164 ?? ""}
                id="lease-tenant-phone"
                name="tenant_phone_e164"
                placeholder="+595..."
              />
            </Field>
            <Field
              htmlFor="lease-starts-on"
              label={isEn ? "Starts on" : "Inicio"}
              required
            >
              <Input
                defaultValue={editing?.startsOn ?? ""}
                id="lease-starts-on"
                name="starts_on"
                required
                type="date"
              />
            </Field>
            <Field htmlFor="lease-ends-on" label={isEn ? "Ends on" : "Fin"}>
              <Input
                defaultValue={editing?.endsOn ?? ""}
                id="lease-ends-on"
                name="ends_on"
                type="date"
              />
            </Field>
          </FieldGroup>

          {!editing ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4">
              <Checkbox
                checked={saveAsGuest}
                className="mt-0.5"
                onCheckedChange={(checked) => setSaveAsGuest(checked === true)}
              />
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {isEn ? "Also save as guest" : "También guardar como huésped"}
                </p>
                <p className="text-muted-foreground">
                  {isEn
                    ? "Useful when the tenant may later move through reservations, guest messaging, or portal verification."
                    : "Útil cuando el inquilino pueda pasar luego por reservas, mensajería o verificación de portal."}
                </p>
              </div>
              <input
                name="save_as_guest"
                type="hidden"
                value={saveAsGuest ? "1" : "0"}
              />
            </label>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-base">
              {isEn ? "Financial terms" : "Términos financieros"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "Set the recurring amount and move-in totals that should flow into collections and contract export."
                : "Define el monto recurrente y los importes de ingreso que deben fluir a cobros y exportación del contrato."}
            </p>
          </div>

          <FieldGroup>
            <Field
              htmlFor="lease-currency"
              label={isEn ? "Currency" : "Moneda"}
            >
              <Select
                defaultValue={editing?.currency ?? "PYG"}
                id="lease-currency"
                name="currency"
              >
                <option value="PYG">PYG</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
            <Field
              htmlFor="lease-monthly-rent"
              label={isEn ? "Monthly rent" : "Renta mensual"}
              required
            >
              <Input
                defaultValue={editing?.monthlyRent ?? 0}
                id="lease-monthly-rent"
                min="0"
                name="monthly_rent"
                required
                step="0.01"
                type="number"
              />
            </Field>
            <Field
              htmlFor="lease-service-fee"
              label={isEn ? "Service fee" : "Cuota de servicio"}
            >
              <Input
                defaultValue={editing?.serviceFeeFlat ?? 0}
                id="lease-service-fee"
                min="0"
                name="service_fee_flat"
                step="0.01"
                type="number"
              />
            </Field>
            <Field
              htmlFor="lease-security-deposit"
              label={isEn ? "Security deposit" : "Depósito"}
            >
              <Input
                defaultValue={editing?.securityDeposit ?? 0}
                id="lease-security-deposit"
                min="0"
                name="security_deposit"
                step="0.01"
                type="number"
              />
            </Field>
            <Field
              htmlFor="lease-guarantee-fee"
              label={isEn ? "Guarantee fee" : "Cuota de garantía"}
            >
              <Input
                defaultValue={editing?.guaranteeOptionFee ?? 0}
                id="lease-guarantee-fee"
                min="0"
                name="guarantee_option_fee"
                step="0.01"
                type="number"
              />
            </Field>
            <Field htmlFor="lease-tax-iva" label="IVA">
              <Input
                defaultValue={editing?.taxIva ?? 0}
                id="lease-tax-iva"
                min="0"
                name="tax_iva"
                step="0.01"
                type="number"
              />
            </Field>
            <Field
              htmlFor="lease-platform-fee"
              label={isEn ? "Platform fee" : "Cuota de plataforma"}
            >
              <Input
                defaultValue={editing?.platformFee ?? 0}
                id="lease-platform-fee"
                min="0"
                name="platform_fee"
                step="0.01"
                type="number"
              />
            </Field>
          </FieldGroup>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-base">
              {isEn ? "Notes" : "Notas"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "Optional context for operators or for the generated contract PDF."
                : "Contexto opcional para operadores o para el PDF del contrato."}
            </p>
          </div>
          <Field
            htmlFor="lease-notes"
            label={isEn ? "Internal notes" : "Notas internas"}
          >
            <Textarea
              defaultValue={editing?.notes ?? ""}
              id="lease-notes"
              name="notes"
            />
          </Field>
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
            {editing
              ? isEn
                ? "Save changes"
                : "Guardar cambios"
              : isEn
                ? "Create lease"
                : "Crear contrato"}
          </Button>
        </div>
      </Form>
    </Drawer>
  );
}
