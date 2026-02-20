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
import type { SubmittingState } from "./setup-types";

export function SetupStepProperty({
  isEn,
  propertyDone,
  propertyCount,
  activeStep,
  submitting,
  onSubmit,
  onImportClick,
}: {
  isEn: boolean;
  propertyDone: boolean;
  propertyCount: number;
  activeStep: number;
  submitting: SubmittingState;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onImportClick: () => void;
}) {
  if (propertyDone) {
    return (
      <CompletedStepRow
        stepNumber={2}
        summary={`${propertyCount} ${isEn ? (propertyCount === 1 ? "property" : "properties") : propertyCount === 1 ? "propiedad" : "propiedades"}`}
        title={isEn ? "Property" : "Propiedad"}
      />
    );
  }

  if (activeStep === 2) {
    return (
      <ActiveStepCard
        description={
          isEn
            ? "Register your first asset in your portfolio."
            : "Registra tu primer activo del portafolio."
        }
        stepNumber={2}
        title={isEn ? "Add your first property" : "Agrega tu primera propiedad"}
      >
        <form className="grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1">
            <span className="font-medium text-muted-foreground text-xs">
              {isEn ? "Property name" : "Nombre de propiedad"}
            </span>
            <Input name="name" placeholder="Villa Morra HQ" required />
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-muted-foreground text-xs">
              {isEn ? "Code" : "Código"}
            </span>
            <Input name="code" placeholder="VM-HQ" />
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-muted-foreground text-xs">
              {isEn ? "Address" : "Dirección"}
            </span>
            <Input name="address_line1" placeholder="Av. España 1234" />
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-muted-foreground text-xs">
              {isEn ? "City" : "Ciudad"}
            </span>
            <Input name="city" placeholder="Asunción" />
          </label>
          <Button
            className="mt-1 w-full"
            disabled={submitting !== null}
            type="submit"
          >
            {submitting === "property" ? (
              <>
                <Spinner className="text-primary-foreground" size="sm" />
                {isEn ? "Creating..." : "Creando..."}
              </>
            ) : isEn ? (
              "Create property"
            ) : (
              "Crear propiedad"
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
        isEn
          ? "Unlocked after creating an organization."
          : "Se habilita al crear una organización."
      }
      stepNumber={2}
      title={isEn ? "Add your first property" : "Agrega tu primera propiedad"}
    />
  );
}
