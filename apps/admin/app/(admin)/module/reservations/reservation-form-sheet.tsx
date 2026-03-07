"use client";

import { useEffect, useMemo, useState } from "react";
import { createReservationAction } from "@/app/(admin)/module/reservations/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Option = {
  id: string;
  label: string;
};

type UnitOption = Option & {
  propertyId?: string;
};

type ReservationFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  isEn: boolean;
  locale?: string;
  returnTo?: string;
  propertyOptions: Option[];
  unitOptions: UnitOption[];
  guestOptions: Option[];
};

export function ReservationFormSheet({
  open,
  onOpenChange,
  orgId,
  isEn,
  returnTo,
  propertyOptions,
  unitOptions,
  guestOptions,
}: ReservationFormSheetProps) {
  const [propertyId, setPropertyId] = useState("");
  const [guestMode, setGuestMode] = useState<"existing" | "new">(
    guestOptions.length > 0 ? "existing" : "new"
  );

  useEffect(() => {
    if (!open) {
      setPropertyId("");
      setGuestMode(guestOptions.length > 0 ? "existing" : "new");
    }
  }, [guestOptions.length, open]);

  const availableUnits = useMemo(
    () =>
      propertyId
        ? unitOptions.filter((unit) => unit.propertyId === propertyId)
        : unitOptions,
    [propertyId, unitOptions]
  );

  return (
    <Drawer
      className="w-[min(94vw,44rem)]"
      closeLabel={isEn ? "Close reservation form" : "Cerrar formulario"}
      description={
        isEn
          ? "Create a real reservation with unit, guest, dates, and financial terms connected from the start."
          : "Crea una reserva real con unidad, huésped, fechas y términos financieros conectados desde el inicio."
      }
      onOpenChange={onOpenChange}
      open={open}
      side="right"
      title={isEn ? "Create reservation" : "Crear reserva"}
    >
      <form action={createReservationAction} className="space-y-5 px-4 py-5 sm:px-6">
        <input name="organization_id" type="hidden" value={orgId} />
        <input name="next" type="hidden" value={returnTo ?? "/module/reservations"} />

        <FieldGroup>
          <Field htmlFor="reservation-property" label={isEn ? "Property" : "Propiedad"} required>
            <Select
              id="reservation-property"
              onChange={(event) => setPropertyId(event.target.value)}
              value={propertyId}
            >
              <option value="">{isEn ? "Select property" : "Selecciona propiedad"}</option>
              {propertyOptions.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field htmlFor="reservation-unit" label={isEn ? "Unit" : "Unidad"} required>
            <Select defaultValue="" id="reservation-unit" name="unit_id" required>
              <option disabled value="">
                {isEn ? "Select unit" : "Selecciona unidad"}
              </option>
              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </Select>
          </Field>
        </FieldGroup>

        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setGuestMode("existing")}
              type="button"
              variant={guestMode === "existing" ? "secondary" : "outline"}
            >
              {isEn ? "Use existing guest" : "Usar huésped existente"}
            </Button>
            <Button
              onClick={() => setGuestMode("new")}
              type="button"
              variant={guestMode === "new" ? "secondary" : "outline"}
            >
              {isEn ? "Create guest inline" : "Crear huésped inline"}
            </Button>
          </div>

          {guestMode === "existing" && guestOptions.length > 0 ? (
            <Field htmlFor="reservation-guest" label={isEn ? "Guest" : "Huésped"}>
              <Select defaultValue="" id="reservation-guest" name="guest_id">
                <option value="">{isEn ? "Select guest" : "Selecciona huésped"}</option>
                {guestOptions.map((guest) => (
                  <option key={guest.id} value={guest.id}>
                    {guest.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="space-y-4">
              <FieldGroup>
                <Field htmlFor="reservation-guest-full-name" label={isEn ? "Guest full name" : "Nombre completo"} required>
                  <Input
                    id="reservation-guest-full-name"
                    name="guest_full_name"
                    placeholder={isEn ? "Jane Doe" : "Nombre y apellido"}
                    required={guestMode === "new"}
                  />
                </Field>
                <Field htmlFor="reservation-guest-email" label={isEn ? "Email" : "Email"}>
                  <Input
                    id="reservation-guest-email"
                    name="guest_email"
                    placeholder="guest@example.com"
                    type="email"
                  />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field htmlFor="reservation-guest-phone" label={isEn ? "Phone" : "Teléfono"}>
                  <Input
                    id="reservation-guest-phone"
                    name="guest_phone_e164"
                    placeholder="+595981123456"
                  />
                </Field>
                <Field htmlFor="reservation-guest-country" label={isEn ? "Country code" : "Código país"}>
                  <Input
                    defaultValue="PY"
                    id="reservation-guest-country"
                    name="guest_country_code"
                    placeholder="PY"
                  />
                </Field>
              </FieldGroup>
            </div>
          )}
        </div>

        <FieldGroup>
          <Field htmlFor="reservation-check-in" label="Check-in" required>
            <Input id="reservation-check-in" name="check_in_date" required type="date" />
          </Field>
          <Field htmlFor="reservation-check-out" label="Check-out" required>
            <Input id="reservation-check-out" name="check_out_date" required type="date" />
          </Field>
        </FieldGroup>

        <FieldGroup className="md:grid-cols-4">
          <Field htmlFor="reservation-adults" label={isEn ? "Adults" : "Adultos"}>
            <Input defaultValue="1" id="reservation-adults" min="0" name="adults" type="number" />
          </Field>
          <Field htmlFor="reservation-children" label={isEn ? "Children" : "Niños"}>
            <Input defaultValue="0" id="reservation-children" min="0" name="children" type="number" />
          </Field>
          <Field htmlFor="reservation-infants" label={isEn ? "Infants" : "Infantes"}>
            <Input defaultValue="0" id="reservation-infants" min="0" name="infants" type="number" />
          </Field>
          <Field htmlFor="reservation-pets" label={isEn ? "Pets" : "Mascotas"}>
            <Input defaultValue="0" id="reservation-pets" min="0" name="pets" type="number" />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field htmlFor="reservation-total-amount" label={isEn ? "Total amount" : "Monto total"} required>
            <Input
              id="reservation-total-amount"
              min="0"
              name="total_amount"
              required
              step="0.01"
              type="number"
            />
          </Field>
          <Field htmlFor="reservation-amount-paid" label={isEn ? "Amount paid" : "Monto pagado"}>
            <Input
              defaultValue="0"
              id="reservation-amount-paid"
              min="0"
              name="amount_paid"
              step="0.01"
              type="number"
            />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field htmlFor="reservation-nightly-rate" label={isEn ? "Nightly rate" : "Tarifa por noche"}>
            <Input id="reservation-nightly-rate" min="0" name="nightly_rate" step="0.01" type="number" />
          </Field>
          <Field htmlFor="reservation-cleaning-fee" label={isEn ? "Cleaning fee" : "Limpieza"}>
            <Input id="reservation-cleaning-fee" min="0" name="cleaning_fee" step="0.01" type="number" />
          </Field>
        </FieldGroup>

        <FieldGroup className="md:grid-cols-4">
          <Field htmlFor="reservation-tax" label={isEn ? "Tax" : "Impuesto"}>
            <Input id="reservation-tax" min="0" name="tax_amount" step="0.01" type="number" />
          </Field>
          <Field htmlFor="reservation-extra-fees" label={isEn ? "Extra fees" : "Extras"}>
            <Input id="reservation-extra-fees" min="0" name="extra_fees" step="0.01" type="number" />
          </Field>
          <Field htmlFor="reservation-discount" label={isEn ? "Discount" : "Descuento"}>
            <Input id="reservation-discount" min="0" name="discount_amount" step="0.01" type="number" />
          </Field>
          <Field htmlFor="reservation-currency" label={isEn ? "Currency" : "Moneda"}>
            <Select defaultValue="PYG" id="reservation-currency" name="currency">
              <option value="PYG">PYG</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field htmlFor="reservation-status" label={isEn ? "Initial status" : "Estado inicial"}>
            <Select defaultValue="pending" id="reservation-status" name="status">
              <option value="pending">{isEn ? "Pending" : "Pendiente"}</option>
              <option value="confirmed">{isEn ? "Confirmed" : "Confirmada"}</option>
              <option value="checked_in">{isEn ? "Checked in" : "Check in"}</option>
            </Select>
          </Field>
          <Field htmlFor="reservation-source" label={isEn ? "Source" : "Origen"}>
            <Select defaultValue="manual" id="reservation-source" name="source">
              <option value="manual">{isEn ? "Manual" : "Manual"}</option>
              <option value="marketplace">
                {isEn ? "Casaora Marketplace" : "Marketplace Casaora"}
              </option>
              <option value="direct_booking">{isEn ? "Casaora direct" : "Directo Casaora"}</option>
            </Select>
          </Field>
        </FieldGroup>

        <Field htmlFor="reservation-payment-method" label={isEn ? "Payment method" : "Método de pago"}>
          <Input
            id="reservation-payment-method"
            name="payment_method"
            placeholder={isEn ? "cash, bank_transfer..." : "cash, bank_transfer..."}
          />
        </Field>

        <Field htmlFor="reservation-notes" label={isEn ? "Notes" : "Notas"}>
          <textarea
            className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
            id="reservation-notes"
            name="notes"
            placeholder={isEn ? "Arrival notes, special requests, ops context..." : "Notas de llegada, pedidos especiales, contexto operativo..."}
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            {isEn ? "Cancel" : "Cancelar"}
          </Button>
          <Button type="submit">{isEn ? "Create reservation" : "Crear reserva"}</Button>
        </div>
      </form>
    </Drawer>
  );
}
