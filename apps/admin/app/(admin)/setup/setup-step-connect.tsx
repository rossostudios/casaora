"use client";

import Link from "next/link";
import type { FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { OptionalStepCard } from "./setup-components";
import type { RentalMode, SelectOption, Step4View, SubmittingState } from "./setup-types";

export function SetupStepConnect({
  isEn,
  rentalMode,
  step4View,
  unitOptions,
  submitting,
  onStep4ViewChange,
  onCreateIntegration,
  onCreateLease,
  onSkip,
  onImportLeaseClick,
}: {
  isEn: boolean;
  rentalMode: RentalMode;
  step4View: Step4View;
  unitOptions: SelectOption[];
  submitting: SubmittingState;
  onStep4ViewChange: (view: Step4View) => void;
  onCreateIntegration: (e: FormEvent<HTMLFormElement>) => void;
  onCreateLease: (e: FormEvent<HTMLFormElement>) => void;
  onSkip: () => void;
  onImportLeaseClick: () => void;
}) {
  const showChannelForm =
    (rentalMode === "both" ? step4View : rentalMode) !== "ltr";

  return (
    <OptionalStepCard
      description={
        rentalMode === "both"
          ? isEn
            ? "Set up an OTA channel or create a tenant lease."
            : "Configura un canal OTA o crea un contrato de inquilino."
          : rentalMode === "ltr"
            ? isEn
              ? "Set up a tenant contract and auto-generate the collection schedule."
              : "Configura un contrato de inquilino y genera el calendario de cobro automáticamente."
            : isEn
              ? "Link your OTA channels to start receiving reservations."
              : "Conecta tus canales OTA para empezar a recibir reservas."
      }
      isEn={isEn}
      stepNumber={4}
      title={
        rentalMode === "both"
          ? isEn
            ? "Connect or create a lease"
            : "Conecta o crea un contrato"
          : rentalMode === "ltr"
            ? isEn
              ? "Create your first lease"
              : "Crea tu primer contrato"
          : isEn
              ? "Connect a channel"
              : "Conecta un canal"
      }
    >
      {rentalMode === "both" ? (
        <Step4ViewToggle
          isEn={isEn}
          step4View={step4View}
          onStep4ViewChange={onStep4ViewChange}
        />
      ) : null}
      {showChannelForm ? (
        <ChannelForm
          isEn={isEn}
          unitOptions={unitOptions}
          submitting={submitting}
          onSubmit={onCreateIntegration}
          onSkip={onSkip}
        />
      ) : (
        <LeaseForm
          isEn={isEn}
          unitOptions={unitOptions}
          submitting={submitting}
          onSubmit={onCreateLease}
          onSkip={onSkip}
          onImportLeaseClick={onImportLeaseClick}
        />
      )}
    </OptionalStepCard>
  );
}

function Step4ViewToggle({
  isEn,
  step4View,
  onStep4ViewChange,
}: {
  isEn: boolean;
  step4View: Step4View;
  onStep4ViewChange: (view: Step4View) => void;
}) {
  return (
    <div className="mb-3 flex rounded-lg border border-border bg-muted/30 p-0.5">
      <button
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 font-medium text-xs transition-colors",
          step4View === "str"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onStep4ViewChange("str")}
        type="button"
      >
        {isEn ? "Short-term (Channel)" : "Corto plazo (Canal)"}
      </button>
      <button
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 font-medium text-xs transition-colors",
          step4View === "ltr"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onStep4ViewChange("ltr")}
        type="button"
      >
        {isEn ? "Long-term (Lease)" : "Largo plazo (Contrato)"}
      </button>
    </div>
  );
}

function ChannelForm({
  isEn,
  unitOptions,
  submitting,
  onSubmit,
  onSkip,
}: {
  isEn: boolean;
  unitOptions: SelectOption[];
  submitting: SubmittingState;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-4">
      <form className="grid gap-3" onSubmit={onSubmit}>
        <label className="grid gap-1">
          <span className="font-medium text-muted-foreground text-xs">
            {isEn ? "Channel type" : "Tipo de canal"}
          </span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="airbnb"
            name="kind"
            required
          >
            <option value="airbnb">Airbnb</option>
            <option value="bookingcom">Booking.com</option>
            <option value="direct">
              {isEn ? "Direct" : "Directo"}
            </option>
            <option value="vrbo">Vrbo</option>
            <option value="other">{isEn ? "Other" : "Otro"}</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-medium text-muted-foreground text-xs">
            {isEn ? "Channel name" : "Nombre del canal"}
          </span>
          <Input name="channel_name" placeholder="Airbnb" required />
        </label>
        <label className="grid gap-1">
          <span className="font-medium text-muted-foreground text-xs">
            {isEn ? "Unit" : "Unidad"}
          </span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={unitOptions[0]?.id ?? ""}
            name="unit_id"
            required
          >
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-medium text-muted-foreground text-xs">
            {isEn ? "Public name" : "Nombre público"}
          </span>
          <Input
            name="public_name"
            placeholder={
              isEn
                ? "Airbnb - Apartment A1"
                : "Airbnb - Departamento A1"
            }
            required
          />
        </label>
        <label className="grid gap-1">
          <span className="font-medium text-muted-foreground text-xs">
            {isEn
              ? "iCal import URL (optional)"
              : "URL de importación iCal (opcional)"}
          </span>
          <Input
            name="ical_import_url"
            placeholder="https://calendar.google.com/calendar/ical/..."
          />
        </label>
        <div className="flex items-center gap-2">
          <Button
            className="flex-1"
            disabled={submitting !== null}
            type="submit"
          >
            {submitting === "integration" ? (
              <>
                <Spinner
                  className="text-primary-foreground"
                  size="sm"
                />
                {isEn ? "Creating..." : "Creando..."}
              </>
            ) : isEn ? (
              "Create channel"
            ) : (
              "Crear canal"
            )}
          </Button>
          <Button
            onClick={onSkip}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isEn ? "Skip" : "Omitir"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function LeaseForm({
  isEn,
  unitOptions,
  submitting,
  onSubmit,
  onSkip,
  onImportLeaseClick,
}: {
  isEn: boolean;
  unitOptions: SelectOption[];
  submitting: SubmittingState;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onSkip: () => void;
  onImportLeaseClick: () => void;
}) {
  return (
    <div className="space-y-4">
      <form className="grid gap-3" onSubmit={onSubmit}>
        <label className="grid gap-1">
          <span className="font-medium text-muted-foreground text-xs">
            {isEn ? "Unit" : "Unidad"}
          </span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={unitOptions[0]?.id ?? ""}
            name="unit_id"
            required
          >
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-medium text-muted-foreground text-xs">
            {isEn
              ? "Tenant full name"
              : "Nombre completo del inquilino"}
          </span>
          <Input
            name="tenant_full_name"
            placeholder="Juan Pérez"
            required
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="font-medium text-muted-foreground text-xs">
              {isEn ? "Email (optional)" : "Email (opcional)"}
            </span>
            <Input
              name="tenant_email"
              placeholder="juan@email.com"
              type="email"
            />
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-muted-foreground text-xs">
              {isEn ? "Phone (optional)" : "Teléfono (opcional)"}
            </span>
            <Input
              name="tenant_phone_e164"
              placeholder="+595 981 123456"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="font-medium text-muted-foreground text-xs">
              {isEn ? "Monthly rent" : "Renta mensual"}
            </span>
            <Input
              min={0}
              name="monthly_rent"
              placeholder="2500000"
              required
              step="any"
              type="number"
            />
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-muted-foreground text-xs">
              {isEn ? "Currency" : "Moneda"}
            </span>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue="PYG"
              name="currency"
            >
              <option value="PYG">PYG (&#8370;)</option>
              <option value="USD">USD ($)</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="font-medium text-muted-foreground text-xs">
              {isEn ? "Start date" : "Fecha de inicio"}
            </span>
            <Input name="starts_on" required type="date" />
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-muted-foreground text-xs">
              {isEn ? "End date (optional)" : "Fecha de fin (opcional)"}
            </span>
            <Input name="ends_on" type="date" />
          </label>
        </div>
        <p className="text-muted-foreground text-xs">
          {isEn
            ? "A monthly collection schedule will be generated automatically."
            : "Se generará un calendario de cobro mensual automáticamente."}
        </p>
        <div className="flex items-center gap-2">
          <Button
            className="flex-1"
            disabled={submitting !== null}
            type="submit"
          >
            {submitting === "lease" ? (
              <>
                <Spinner
                  className="text-primary-foreground"
                  size="sm"
                />
                {isEn ? "Creating..." : "Creando..."}
              </>
            ) : isEn ? (
              "Create lease"
            ) : (
              "Crear contrato"
            )}
          </Button>
          <Button
            onClick={onSkip}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isEn ? "Skip" : "Omitir"}
          </Button>
        </div>
      </form>
      <div className="border-border/40 border-t pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-medium text-muted-foreground text-xs">
            {isEn ? "Or continue with:" : "O continúa con:"}
          </p>
          <button
            className="font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
            onClick={onImportLeaseClick}
            type="button"
          >
            {isEn
              ? "Import leases from CSV"
              : "Importar contratos desde CSV"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" })
            )}
            href="/module/listings"
          >
            {isEn ? "Publish listing" : "Publicar anuncio"}
          </Link>
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" })
            )}
            href="/module/pricing"
          >
            {isEn ? "Set up pricing" : "Configurar precios"}
          </Link>
        </div>
      </div>
    </div>
  );
}
