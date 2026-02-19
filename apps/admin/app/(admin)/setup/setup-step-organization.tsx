"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import {
  ActiveStepCard,
  CompletedStepRow,
  OrganizationCoreFields,
  OrganizationProfileInputs,
  type OrganizationProfileType,
  profileTypeLabel,
  type RentalMode,
  RentalModeInputs,
  rentalModeLabel,
} from "./setup-components";
import type { SubmittingState } from "./setup-types";

export function SetupStepOrganization({
  isEn,
  orgDone,
  orgName,
  profileType,
  rentalMode,
  submitting,
  onSubmit,
}: {
  isEn: boolean;
  orgDone: boolean;
  orgName: string | null;
  profileType: OrganizationProfileType;
  rentalMode: RentalMode;
  submitting: SubmittingState;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  if (orgDone) {
    return (
      <CompletedStepRow
        stepNumber={1}
        summary={`${orgName || (isEn ? "Organization" : "Organización")} · ${profileTypeLabel(profileType, isEn)} · ${rentalModeLabel(rentalMode, isEn)}`}
        title={isEn ? "Organization" : "Organización"}
      />
    );
  }

  return (
    <ActiveStepCard
      description={
        isEn
          ? "Set up your workspace and choose your operating profile."
          : "Configura tu espacio y elige tu perfil operativo."
      }
      stepNumber={1}
      title={isEn ? "Create your organization" : "Crea tu organización"}
    >
      <form className="grid gap-3" onSubmit={onSubmit}>
        <OrganizationProfileInputs
          defaultValue="management_company"
          isEn={isEn}
        />
        <RentalModeInputs defaultValue="both" isEn={isEn} />
        <OrganizationCoreFields isEn={isEn} />
        <Button
          className="mt-1 w-full"
          disabled={submitting !== null}
          type="submit"
        >
          {submitting === "org" ? (
            <>
              <Spinner className="text-primary-foreground" size="sm" />
              {isEn ? "Creating..." : "Creando..."}
            </>
          ) : isEn ? (
            "Create organization"
          ) : (
            "Crear organización"
          )}
        </Button>
      </form>
    </ActiveStepCard>
  );
}
