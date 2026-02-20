"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import {
  ActiveStepCard,
  CompletedStepRow,
  LockedStepRow,
} from "./setup-components";
import type { SelectOption, SubmittingState } from "./setup-types";

export function SetupStepUnit({
  isEn,
  unitDone,
  unitCount,
  activeStep,
  submitting,
  propertyOptions,
  onSubmit,
  onImportClick,
}: {
  isEn: boolean;
  unitDone: boolean;
  unitCount: number;
  activeStep: number;
  submitting: SubmittingState;
  propertyOptions: SelectOption[];
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onImportClick: () => void;
}) {
  if (unitDone) {
    return (
      <CompletedStepRow
        stepNumber={3}
        summary={`${unitCount} ${isEn ? (unitCount === 1 ? "unit" : "units") : unitCount === 1 ? "unidad" : "unidades"}`}
        title={isEn ? "Unit" : "Unidad"}
      />
    );
  }

  if (activeStep === 3) {
    return (
      <ActiveStepCard
        description={
          isEn
            ? "Add your first rentable unit to finish onboarding."
            : "Agrega tu primera unidad alquilable para finalizar el onboarding."
        }
        stepNumber={3}
        title={isEn ? "Create your first unit" : "Crea tu primera unidad"}
      >
        <form className="grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1">
            <span className="font-medium text-muted-foreground text-xs">
              {isEn ? "Property" : "Propiedad"}
            </span>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={propertyOptions[0]?.id ?? ""}
              name="property_id"
              required
            >
              {propertyOptions.length === 0 ? (
                <option value="">
                  {isEn
                    ? "Create a property first"
                    : "Crea una propiedad primero"}
                </option>
              ) : null}
              {propertyOptions.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {isEn ? "Unit code" : "Código de unidad"}
              </span>
              <Input name="code" placeholder="A1" required />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {isEn ? "Unit name" : "Nombre de unidad"}
              </span>
              <Input name="name" placeholder="Departamento A1" required />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {isEn ? "Max guests" : "Máx. huéspedes"}
              </span>
              <Input defaultValue={2} min={1} name="max_guests" type="number" />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {isEn ? "Bedrooms" : "Dormitorios"}
              </span>
              <Input defaultValue={1} min={0} name="bedrooms" type="number" />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {isEn ? "Bathrooms" : "Baños"}
              </span>
              <Input
                defaultValue={1}
                min={0}
                name="bathrooms"
                step="0.5"
                type="number"
              />
            </label>
          </div>
          <Button
            className="mt-1 w-full"
            disabled={submitting !== null}
            type="submit"
          >
            {submitting === "unit" ? (
              <>
                <Spinner className="text-primary-foreground" size="sm" />
                {isEn ? "Creating..." : "Creando..."}
              </>
            ) : isEn ? (
              "Create unit"
            ) : (
              "Crear unidad"
            )}
          </Button>
        </form>
        <div className="mt-3 text-center">
          <button
            className="font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
            onClick={onImportClick}
            type="button"
          >
            {isEn ? "Import from Excel/CSV" : "Importar desde Excel/CSV"}
          </button>
        </div>
      </ActiveStepCard>
    );
  }

  return (
    <LockedStepRow
      description={
        isEn ? "Complete step 2 first." : "Completa el paso 2 primero."
      }
      stepNumber={3}
      title={isEn ? "Create your first unit" : "Crea tu primera unidad"}
    />
  );
}
