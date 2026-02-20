"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import {
  wizardCreateIntegration,
  wizardCreateLease,
  wizardCreateOrganization,
  wizardCreateProperty,
  wizardCreateUnit,
  wizardSeedDemoData,
} from "./actions";
import {
  asString,
  isOrganizationProfileType,
  isRentalMode,
  type OrganizationProfileType,
  type RentalMode,
  type Row,
} from "./setup-components";
import { fd, fdNum, type Step4View, type SubmittingState } from "./setup-types";

export function useSetupWizard({
  initialOrgId,
  initialOrganization,
  initialProperties,
  initialUnits,
  integrations,
  isEn,
  apiBaseUrl,
  initialPlanId,
}: {
  initialOrgId: string | null;
  initialOrganization: Row | null;
  initialProperties: Row[];
  initialUnits: Row[];
  integrations: Row[];
  isEn: boolean;
  apiBaseUrl: string;
  initialPlanId?: string;
}) {
  const router = useRouter();

  const [orgId, setOrgId] = useState(initialOrgId);
  const [orgName, setOrgName] = useState(
    asString(initialOrganization?.name) || null
  );
  const initProfileType: OrganizationProfileType = isOrganizationProfileType(
    initialOrganization?.profile_type
  )
    ? initialOrganization.profile_type
    : "management_company";
  const [profileType, setProfileType] =
    useState<OrganizationProfileType>(initProfileType);
  const initRentalMode: RentalMode = isRentalMode(
    initialOrganization?.rental_mode
  )
    ? initialOrganization.rental_mode
    : "both";
  const [rentalMode, setRentalMode] = useState<RentalMode>(initRentalMode);
  const [properties, setProperties] = useState<Row[]>(initialProperties);
  const [units, setUnits] = useState<Row[]>(initialUnits);
  const [submitting, setSubmitting] = useState<SubmittingState>(null);
  const [leaseDone, setLeaseDone] = useState(false);
  const [importPropertyOpen, setImportPropertyOpen] = useState(false);
  const [importUnitOpen, setImportUnitOpen] = useState(false);
  const [importLeaseOpen, setImportLeaseOpen] = useState(false);
  const [step4Done, setStep4Done] = useState(false);
  const [step4Skipped, setStep4Skipped] = useState(false);
  const [step4View, setStep4View] = useState<Step4View>(
    rentalMode === "ltr" ? "ltr" : "str"
  );

  const effectiveImportPropertyOpen = orgId ? importPropertyOpen : false;
  const effectiveImportUnitOpen = orgId ? importUnitOpen : false;
  const effectiveImportLeaseOpen = orgId ? importLeaseOpen : false;

  const orgDone = Boolean(orgId);
  const propertyDone = properties.length > 0;
  const unitDone = units.length > 0;
  const onboardingDone = orgDone && propertyDone && unitDone;
  const activeStep = orgDone ? (propertyDone ? (unitDone ? 0 : 3) : 2) : 1;
  const step4Complete = step4Skipped || step4Done || leaseDone;
  const showDemoSeed =
    orgDone &&
    properties.length === 0 &&
    units.length === 0 &&
    integrations.length === 0;

  const propertyOptions = properties
    .map((row) => ({
      id: asString(row.id),
      label: asString(row.name || row.code || row.id),
    }))
    .filter((item) => item.id);

  const unitOptions = units
    .map((row) => ({
      id: asString(row.id),
      label: asString(row.name || row.code || row.id),
    }))
    .filter((item) => item.id);

  const handleCreateOrg = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting("org");

    const form = e.currentTarget;
    const result = await wizardCreateOrganization({
      name: fd(form, "name"),
      legal_name: fd(form, "legal_name") || undefined,
      ruc: fd(form, "ruc") || undefined,
      profile_type: fd(form, "profile_type") || "management_company",
      default_currency: fd(form, "default_currency") || "PYG",
      timezone: fd(form, "timezone") || "America/Asuncion",
      rental_mode: fd(form, "rental_mode") || "both",
    });

    if (!result.ok) {
      toast.error(
        isEn
          ? "Could not create organization"
          : "No se pudo crear la organización",
        { description: result.error }
      );
      setSubmitting(null);
      return;
    }

    try {
      await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: result.data.id }),
      });
    } catch {
      /* Cookie was already set server-side in the action */
    }

    setOrgId(result.data.id);
    setOrgName(result.data.name);
    const pt = fd(form, "profile_type");
    if (isOrganizationProfileType(pt)) setProfileType(pt);
    const rm = fd(form, "rental_mode");
    if (isRentalMode(rm)) setRentalMode(rm);

    toast.success(isEn ? "Organization created" : "Organización creada", {
      description: result.data.name,
    });

    if (initialPlanId && result.data.id) {
      const planSuccessTitle = isEn ? "Plan activated" : "Plan activado";
      const planSuccessDesc = isEn
        ? "Your trial period has started."
        : "Tu período de prueba ha comenzado.";
      const planErrorTitle = isEn
        ? "Could not activate plan"
        : "No se pudo activar el plan";
      const planErrorDesc = isEn
        ? "You can activate it later from Settings → Billing."
        : "Puedes activarlo después desde Ajustes → Facturación.";

      try {
        const subscribeRes = await fetch(`${apiBaseUrl}/billing/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization_id: result.data.id,
            plan_id: initialPlanId,
          }),
        });
        if (subscribeRes.ok) {
          toast.success(planSuccessTitle, { description: planSuccessDesc });
        } else {
          toast.error(planErrorTitle, { description: planErrorDesc });
        }
      } catch {
        toast.error(planErrorTitle, { description: planErrorDesc });
      }
    }

    router.refresh();
    setSubmitting(null);
  };

  const handleCreateProperty = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || !orgId) return;
    setSubmitting("property");

    const form = e.currentTarget;
    const result = await wizardCreateProperty({
      organization_id: orgId,
      name: fd(form, "name"),
      code: fd(form, "code") || undefined,
      address_line1: fd(form, "address_line1") || undefined,
      city: fd(form, "city") || undefined,
    });

    if (!result.ok) {
      toast.error(
        isEn ? "Could not create property" : "No se pudo crear la propiedad",
        { description: result.error }
      );
      setSubmitting(null);
      return;
    }

    setProperties((prev) => [
      ...prev,
      { id: result.data.id, name: result.data.name },
    ]);
    toast.success(isEn ? "Property created" : "Propiedad creada", {
      description: result.data.name,
    });
    setSubmitting(null);
  };

  const handleCreateUnit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || !orgId) return;
    setSubmitting("unit");

    const form = e.currentTarget;
    const result = await wizardCreateUnit({
      organization_id: orgId,
      property_id: fd(form, "property_id"),
      code: fd(form, "code"),
      name: fd(form, "name"),
      max_guests: fdNum(form, "max_guests", 2),
      bedrooms: fdNum(form, "bedrooms", 1),
      bathrooms: fdNum(form, "bathrooms", 1),
    });

    if (!result.ok) {
      toast.error(
        isEn ? "Could not create unit" : "No se pudo crear la unidad",
        { description: result.error }
      );
      setSubmitting(null);
      return;
    }

    setUnits((prev) => [
      ...prev,
      { id: result.data.id, name: fd(form, "name"), code: fd(form, "code") },
    ]);
    toast.success(isEn ? "Unit created" : "Unidad creada");
    setSubmitting(null);
  };

  const handleCreateIntegrationStep4 = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (submitting || !orgId) return;
    setSubmitting("integration");

    const form = e.currentTarget;
    const result = await wizardCreateIntegration({
      organization_id: orgId,
      unit_id: fd(form, "unit_id"),
      kind: fd(form, "kind"),
      channel_name: fd(form, "channel_name"),
      public_name: fd(form, "public_name"),
      ical_import_url: fd(form, "ical_import_url") || undefined,
    });

    if (!result.ok) {
      toast.error(
        isEn ? "Could not create channel" : "No se pudo crear el canal",
        { description: result.error }
      );
      setSubmitting(null);
      return;
    }

    setStep4Done(true);
    toast.success(isEn ? "Channel created" : "Canal creado", {
      description: result.data.name,
    });
    setSubmitting(null);
  };

  const handleCreateLeaseStep4 = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || !orgId) return;
    setSubmitting("lease");

    const form = e.currentTarget;
    const result = await wizardCreateLease({
      organization_id: orgId,
      unit_id: fd(form, "unit_id"),
      tenant_full_name: fd(form, "tenant_full_name"),
      tenant_email: fd(form, "tenant_email") || undefined,
      tenant_phone_e164: fd(form, "tenant_phone_e164") || undefined,
      lease_status: "active",
      starts_on: fd(form, "starts_on"),
      ends_on: fd(form, "ends_on") || undefined,
      currency: fd(form, "currency") || "PYG",
      monthly_rent: fdNum(form, "monthly_rent", 0),
      generate_first_collection: true,
    });

    if (!result.ok) {
      toast.error(
        isEn ? "Could not create lease" : "No se pudo crear el contrato",
        { description: result.error }
      );
      setSubmitting(null);
      return;
    }

    setLeaseDone(true);
    setStep4Done(true);
    toast.success(isEn ? "Lease created" : "Contrato creado", {
      description: isEn
        ? "Collection schedule generated automatically."
        : "Calendario de cobro generado automáticamente.",
    });
    setSubmitting(null);
  };

  const handleSeedDemo = async () => {
    if (submitting || !orgId) return;
    setSubmitting("seed");

    const result = await wizardSeedDemoData({ organization_id: orgId });
    if (!result.ok) {
      toast.error(
        isEn ? "Could not load demo data" : "No se pudieron cargar datos demo",
        { description: result.error }
      );
      setSubmitting(null);
      return;
    }

    toast.success(isEn ? "Demo data loaded" : "Datos demo cargados", {
      description: isEn ? "Refreshing page..." : "Actualizando página...",
    });
    setSubmitting(null);
    router.refresh();
  };

  return {
    orgId,
    orgName,
    profileType,
    rentalMode,
    properties,
    units,
    submitting,
    step4View,
    setStep4View,
    step4Complete,
    importPropertyOpen: effectiveImportPropertyOpen,
    importUnitOpen: effectiveImportUnitOpen,
    importLeaseOpen: effectiveImportLeaseOpen,
    setImportPropertyOpen,
    setImportUnitOpen,
    setImportLeaseOpen,
    orgDone,
    propertyDone,
    unitDone,
    onboardingDone,
    activeStep,
    showDemoSeed,
    propertyOptions,
    unitOptions,
    handleCreateOrg,
    handleCreateProperty,
    handleCreateUnit,
    handleCreateIntegrationStep4,
    handleCreateLeaseStep4,
    handleSeedDemo,
    setStep4Skipped,
    refresh: () => router.refresh(),
  };
}
