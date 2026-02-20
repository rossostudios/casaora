"use client";

import {
  Cancel01Icon,
  Delete02Icon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import Image from "next/image";
import { useState } from "react";

import { DocumentUpload } from "@/app/(admin)/module/documents/document-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useActiveLocale } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { deleteGuestAction, updateGuestAction } from "./actions";

type GuestProfile = {
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone_e164: string | null;
  document_type: string | null;
  document_number: string | null;
  country_code: string | null;
  preferred_language: string | null;
  notes: string | null;
  id_document_url: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
  city: string | null;
  occupation: string | null;
  document_expiry: string | null;
  nationality: string | null;
};

const DOCUMENT_TYPE_OPTIONS = [
  { value: "", en: "Select...", es: "Seleccionar..." },
  { value: "passport", en: "Passport", es: "Pasaporte" },
  {
    value: "national_id",
    en: "National ID (Cédula)",
    es: "Cédula de Identidad",
  },
  {
    value: "drivers_license",
    en: "Driver's License",
    es: "Licencia de Conducir",
  },
  {
    value: "residence_permit",
    en: "Residence Permit",
    es: "Permiso de Residencia",
  },
  { value: "other", en: "Other", es: "Otro" },
] as const;

export function GuestProfileActions({
  guest,
  nextPath,
}: {
  guest: GuestProfile;
  nextPath: string;
}) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";
  const t = (en: string, es: string) => (isEn ? en : es);

  const [open, setOpen] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [idDocumentUrl, setIdDocumentUrl] = useState(
    guest.id_document_url ?? ""
  );

  const close = () => {
    setDeleteArmed(false);
    setOpen(false);
  };

  return (
    <>
      <Button
        className="gap-2"
        onClick={() => {
          setIdDocumentUrl(guest.id_document_url ?? "");
          setOpen(true);
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        <Icon icon={PencilEdit01Icon} size={16} />
        {t("Edit", "Editar")}
      </Button>

      <Sheet
        contentClassName="max-w-full sm:max-w-xl"
        description={t(
          "Update guest details and notes.",
          "Actualiza datos del huésped y sus notas."
        )}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
        open={open}
        title={
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t("Guest", "Huésped")}</Badge>
              <Badge className="text-[11px]" variant="secondary">
                CRM
              </Badge>
            </div>
            <p className="truncate font-semibold text-base">
              {guest.full_name}
            </p>
          </div>
        }
      >
        <Form action={updateGuestAction} className="grid gap-5">
          <input name="id" type="hidden" value={guest.id} />
          <input name="next" type="hidden" value={nextPath} />
          <input name="id_document_url" type="hidden" value={idDocumentUrl} />

          {/* Identity */}
          <fieldset className="grid gap-3">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              {t("Identity", "Identidad")}
            </p>
            <div className="grid gap-1">
              <label className="font-medium text-xs" htmlFor="gpa-full-name">
                {t("Full name", "Nombre completo")}
              </label>
              <Input
                defaultValue={guest.full_name}
                id="gpa-full-name"
                name="full_name"
                placeholder="Ana Perez"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-email">
                  Email
                </label>
                <Input
                  defaultValue={guest.email ?? ""}
                  id="gpa-email"
                  name="email"
                  placeholder="ana@example.com"
                  type="email"
                />
              </div>
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-phone">
                  {t("Phone", "Teléfono")}
                </label>
                <Input
                  defaultValue={guest.phone_e164 ?? ""}
                  id="gpa-phone"
                  name="phone_e164"
                  placeholder="+595981000000"
                />
              </div>
            </div>
          </fieldset>

          {/* Document */}
          <fieldset className="grid gap-3">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              {t("Document", "Documento")}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-doc-type">
                  {t("Document type", "Tipo de documento")}
                </label>
                <Select
                  defaultValue={guest.document_type ?? ""}
                  id="gpa-doc-type"
                  name="document_type"
                >
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isEn ? opt.en : opt.es}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-doc-number">
                  {t("Document number", "Número de documento")}
                </label>
                <Input
                  defaultValue={guest.document_number ?? ""}
                  id="gpa-doc-number"
                  name="document_number"
                  placeholder="123456789"
                />
              </div>
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-country">
                  {t("Country", "País")}
                </label>
                <Input
                  defaultValue={guest.country_code ?? ""}
                  id="gpa-country"
                  maxLength={2}
                  name="country_code"
                  placeholder="PY"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-doc-expiry">
                  {t("Document expiry", "Vencimiento del documento")}
                </label>
                <Input
                  defaultValue={guest.document_expiry ?? ""}
                  id="gpa-doc-expiry"
                  name="document_expiry"
                  type="date"
                />
              </div>
              <div className="grid gap-1">
                <label
                  className="font-medium text-xs"
                  htmlFor="gpa-nationality"
                >
                  {t("Nationality", "Nacionalidad")}
                </label>
                <Input
                  defaultValue={guest.nationality ?? ""}
                  id="gpa-nationality"
                  maxLength={2}
                  name="nationality"
                  placeholder="PY"
                />
              </div>
            </div>

            <div className="grid gap-1">
              <label className="font-medium text-xs" htmlFor="gpa-id-doc-photo">
                {t("ID document photo", "Foto de documento de identidad")}
              </label>
              {idDocumentUrl ? (
                <div className="group relative h-36 w-full overflow-hidden rounded-lg border bg-muted/10">
                  <Image
                    alt={t("ID document", "Documento de identidad")}
                    className="object-contain"
                    fill
                    sizes="(max-width: 640px) 100vw, 36rem"
                    src={idDocumentUrl}
                  />
                  <button
                    className="absolute top-2 right-2 rounded-full border bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => setIdDocumentUrl("")}
                    type="button"
                  >
                    <Icon icon={Cancel01Icon} size={14} />
                  </button>
                </div>
              ) : (
                <DocumentUpload
                  isEn={isEn}
                  onUploaded={(file) => setIdDocumentUrl(file.url)}
                  orgId={guest.organization_id}
                />
              )}
            </div>
          </fieldset>

          {/* Personal */}
          <fieldset className="grid gap-3">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              {t("Personal", "Personal")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-dob">
                  {t("Date of birth", "Fecha de nacimiento")}
                </label>
                <Input
                  defaultValue={guest.date_of_birth ?? ""}
                  id="gpa-dob"
                  name="date_of_birth"
                  placeholder="1990-01-15"
                  type="date"
                />
              </div>
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-occupation">
                  {t("Occupation", "Ocupación")}
                </label>
                <Input
                  defaultValue={guest.occupation ?? ""}
                  id="gpa-occupation"
                  name="occupation"
                  placeholder={t("Engineer", "Ingeniero")}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-address">
                  {t("Address", "Dirección")}
                </label>
                <Input
                  defaultValue={guest.address ?? ""}
                  id="gpa-address"
                  name="address"
                  placeholder={t("123 Main St", "Av. Mariscal López 123")}
                />
              </div>
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-city">
                  {t("City", "Ciudad")}
                </label>
                <Input
                  defaultValue={guest.city ?? ""}
                  id="gpa-city"
                  name="city"
                  placeholder="Asunción"
                />
              </div>
            </div>
            <div className="grid gap-1">
              <label className="font-medium text-xs" htmlFor="gpa-language">
                {t("Preferred language", "Idioma preferido")}
              </label>
              <Input
                defaultValue={guest.preferred_language ?? "es"}
                id="gpa-language"
                name="preferred_language"
                placeholder={isEn ? "en" : "es"}
              />
            </div>
          </fieldset>

          {/* Emergency Contact */}
          <fieldset className="grid gap-3">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              {t("Emergency contact", "Contacto de emergencia")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-ec-name">
                  {t("Contact name", "Nombre del contacto")}
                </label>
                <Input
                  defaultValue={guest.emergency_contact_name ?? ""}
                  id="gpa-ec-name"
                  name="emergency_contact_name"
                  placeholder="Juan Perez"
                />
              </div>
              <div className="grid gap-1">
                <label className="font-medium text-xs" htmlFor="gpa-ec-phone">
                  {t("Contact phone", "Teléfono del contacto")}
                </label>
                <Input
                  defaultValue={guest.emergency_contact_phone ?? ""}
                  id="gpa-ec-phone"
                  name="emergency_contact_phone"
                  placeholder="+595981000000"
                />
              </div>
            </div>
          </fieldset>

          {/* Notes */}
          <fieldset className="grid gap-3">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              {t("Notes", "Notas")}
            </p>
            <div className="grid gap-1">
              <Textarea
                defaultValue={guest.notes ?? ""}
                name="notes"
                placeholder={t(
                  "Preferences, special requests, document details...",
                  "Preferencias, pedidos especiales, datos de documentos..."
                )}
              />
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button onClick={close} type="button" variant="ghost">
              {t("Cancel", "Cancelar")}
            </Button>
            <Button className="gap-2" type="submit" variant="secondary">
              <Icon icon={PencilEdit01Icon} size={16} />
              {t("Save changes", "Guardar cambios")}
            </Button>
          </div>
        </Form>

        <div className="mt-8 border-t pt-4">
          <p className="font-medium text-foreground text-sm">
            {t("Risk zone", "Zona de riesgo")}
          </p>
          <p className="mt-1 text-muted-foreground text-sm">
            {t(
              "Deleting a guest removes the contact record. Historical reservations will keep their IDs, but may lose the guest reference.",
              "Eliminar un huésped borra el registro de contacto. Las reservas históricas conservarán sus IDs pero pueden perder la referencia al huésped."
            )}
          </p>

          <Form action={deleteGuestAction} className="mt-3">
            <input name="id" type="hidden" value={guest.id} />
            <input name="next" type="hidden" value="/module/guests" />
            {deleteArmed ? (
              <Button className="gap-2" type="submit" variant="destructive">
                <Icon icon={Delete02Icon} size={16} />
                {t("Confirm deletion", "Confirmar eliminación")}
              </Button>
            ) : (
              <Button
                className={cn("gap-2")}
                onClick={() => setDeleteArmed(true)}
                type="button"
                variant="outline"
              >
                <Icon icon={Delete02Icon} size={16} />
                {t("Delete guest", "Eliminar huésped")}
              </Button>
            )}
          </Form>
        </div>
      </Sheet>
    </>
  );
}
