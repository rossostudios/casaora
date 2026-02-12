import Link from "next/link";
import type { ReactNode } from "react";

import { ClearOrgButton } from "@/components/shell/clear-org-button";
import { UseOrgButton } from "@/components/shell/use-org-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { fetchList, fetchOrganizations, getApiBaseUrl } from "@/lib/api";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";
import { cn } from "@/lib/utils";

import {
  createOrganizationAction,
  createPropertyAction,
  createUnitAction,
  seedDemoDataAction,
  updateOrganizationAction,
} from "./actions";
import { SetupManager } from "./setup-manager";

type SetupPageProps = {
  searchParams: Promise<{ error?: string; success?: string; tab?: string }>;
};

type Row = Record<string, unknown>;

type OrganizationProfileType = "owner_operator" | "management_company";

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function isOrganizationProfileType(
  value: unknown
): value is OrganizationProfileType {
  return value === "owner_operator" || value === "management_company";
}

function profileTypeLabel(
  value: OrganizationProfileType,
  isEn: boolean
): string {
  if (value === "owner_operator") {
    return isEn ? "Owner-operator" : "Propietario-operador";
  }
  return isEn ? "Management company" : "Empresa administradora";
}

function StepCard({
  title,
  description,
  done,
  locked,
  statusLabelDone,
  statusLabelLocked,
  statusLabelPending,
  children,
}: {
  title: string;
  description: string;
  done: boolean;
  locked: boolean;
  statusLabelDone: string;
  statusLabelLocked: string;
  statusLabelPending: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/75 bg-background/80 p-4",
        done ? "ring-1 ring-primary/25" : "",
        locked ? "opacity-65" : ""
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        <Badge variant={done ? "secondary" : "outline"}>
          {done
            ? statusLabelDone
            : locked
              ? statusLabelLocked
              : statusLabelPending}
        </Badge>
      </div>
      {children}
    </div>
  );
}

function OrganizationProfileInputs({
  defaultValue,
  isEn,
}: {
  defaultValue: OrganizationProfileType;
  isEn: boolean;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="font-medium text-xs">
        {isEn ? "Organization profile" : "Perfil de organización"}
      </legend>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
          <input
            defaultChecked={defaultValue === "owner_operator"}
            name="profile_type"
            required
            type="radio"
            value="owner_operator"
          />
          <span>{isEn ? "Owner-operator" : "Propietario-operador"}</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
          <input
            defaultChecked={defaultValue === "management_company"}
            name="profile_type"
            required
            type="radio"
            value="management_company"
          />
          <span>{isEn ? "Management company" : "Empresa administradora"}</span>
        </label>
      </div>
    </fieldset>
  );
}

function OrganizationCoreFields({
  isEn,
  defaults,
}: {
  isEn: boolean;
  defaults?: {
    name?: string;
    legalName?: string;
    ruc?: string;
    defaultCurrency?: string;
    timezone?: string;
  };
}) {
  return (
    <>
      <label className="grid gap-1">
        <span className="font-medium text-xs">{isEn ? "Name" : "Nombre"}</span>
        <Input defaultValue={defaults?.name ?? ""} name="name" required />
      </label>
      <label className="grid gap-1">
        <span className="font-medium text-xs">
          {isEn ? "Legal name" : "Razón social"}
        </span>
        <Input defaultValue={defaults?.legalName ?? ""} name="legal_name" />
      </label>
      <label className="grid gap-1">
        <span className="font-medium text-xs">
          {isEn ? "Tax ID (RUC)" : "RUC"}
        </span>
        <Input defaultValue={defaults?.ruc ?? ""} name="ruc" />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="font-medium text-xs">
            {isEn ? "Default currency" : "Moneda predeterminada"}
          </span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={defaults?.defaultCurrency ?? "PYG"}
            name="default_currency"
          >
            <option value="PYG">PYG</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-medium text-xs">
            {isEn ? "Timezone" : "Zona horaria"}
          </span>
          <Input
            defaultValue={defaults?.timezone ?? "America/Asuncion"}
            name="timezone"
          />
        </label>
      </div>
    </>
  );
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const { error, success, tab } = await searchParams;
  const errorMessage = error ? safeDecode(error) : null;
  const successLabel = success
    ? safeDecode(success).replaceAll("-", " ")
    : null;
  const orgId = await getActiveOrgId();
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";

  if (!orgId) {
    let organizations: Row[] = [];
    try {
      organizations = (await fetchOrganizations(25)) as Row[];
    } catch {
      organizations = [];
    }

    return (
      <div className="space-y-6">
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>
              {isEn
                ? "Could not complete request"
                : "No se pudo completar la solicitud"}
            </AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        {successLabel ? (
          <Alert variant="success">
            <AlertTitle>
              {isEn ? "Success" : "Éxito"}: {successLabel}
            </AlertTitle>
          </Alert>
        ) : null}

        <Card>
          <CardHeader className="space-y-3">
            <Badge className="w-fit" variant="outline">
              {isEn ? "Onboarding wizard" : "Asistente de onboarding"}
            </Badge>
            <CardTitle className="text-2xl">
              {isEn
                ? "Complete your operational foundation"
                : "Completa tu base operativa"}
            </CardTitle>
            <CardDescription>
              {isEn
                ? "Finish 3 required steps: organization profile, first property, first unit."
                : "Completa 3 pasos obligatorios: perfil de organización, primera propiedad, primera unidad."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-3">
              <StepCard
                description={
                  isEn
                    ? "Create your workspace and choose your operating profile."
                    : "Crea tu espacio y define tu perfil operativo."
                }
                done={false}
                locked={false}
                statusLabelDone={isEn ? "Done" : "Completado"}
                statusLabelLocked={isEn ? "Locked" : "Bloqueado"}
                statusLabelPending={isEn ? "Pending" : "Pendiente"}
                title={isEn ? "Step 1 · Organization" : "Paso 1 · Organización"}
              >
                <form action={createOrganizationAction} className="grid gap-3">
                  <OrganizationProfileInputs
                    defaultValue="management_company"
                    isEn={isEn}
                  />
                  <OrganizationCoreFields isEn={isEn} />
                  <Button size="sm" type="submit">
                    {isEn ? "Create organization" : "Crear organización"}
                  </Button>
                </form>
              </StepCard>

              <StepCard
                description={
                  isEn
                    ? "Unlocked after creating an organization."
                    : "Se habilita al crear una organización."
                }
                done={false}
                locked
                statusLabelDone={isEn ? "Done" : "Completado"}
                statusLabelLocked={isEn ? "Locked" : "Bloqueado"}
                statusLabelPending={isEn ? "Pending" : "Pendiente"}
                title={isEn ? "Step 2 · Property" : "Paso 2 · Propiedad"}
              >
                <p className="text-muted-foreground text-sm">
                  {isEn
                    ? "Create your organization first to continue."
                    : "Primero crea la organización para continuar."}
                </p>
              </StepCard>

              <StepCard
                description={
                  isEn
                    ? "Unlocked after adding your first property."
                    : "Se habilita al crear tu primera propiedad."
                }
                done={false}
                locked
                statusLabelDone={isEn ? "Done" : "Completado"}
                statusLabelLocked={isEn ? "Locked" : "Bloqueado"}
                statusLabelPending={isEn ? "Pending" : "Pendiente"}
                title={isEn ? "Step 3 · Unit" : "Paso 3 · Unidad"}
              >
                <p className="text-muted-foreground text-sm">
                  {isEn
                    ? "Add a property first to continue."
                    : "Agrega una propiedad primero para continuar."}
                </p>
              </StepCard>
            </div>

            <div className="grid gap-2 text-muted-foreground text-sm md:grid-cols-2">
              <div className="rounded-md border bg-card px-3 py-2">
                <span className="block text-xs uppercase tracking-wide">
                  {isEn ? "API base URL" : "URL base de la API"}
                </span>
                <strong className="font-mono text-foreground">
                  {getApiBaseUrl()}
                </strong>
              </div>
              <div className="rounded-md border bg-card px-3 py-2">
                <span className="block text-xs uppercase tracking-wide">
                  {isEn ? "Organization" : "Organización"}
                </span>
                <strong className="font-mono text-foreground">
                  {isEn ? "Not selected" : "No seleccionada"}
                </strong>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                href="/app"
              >
                {isEn ? "Back to dashboard" : "Volver al panel"}
              </Link>
            </div>

            {organizations.length ? (
              <div className="rounded-lg border bg-card p-4">
                <p className="font-medium text-foreground text-sm">
                  {isEn
                    ? "Existing organizations"
                    : "Organizaciones existentes"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {isEn
                    ? "Switch to one to continue wizard steps 2 and 3."
                    : "Cámbiate a una para continuar con los pasos 2 y 3 del asistente."}
                </p>
                <div className="mt-3 space-y-2">
                  {organizations.map((org) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2"
                      key={String(org.id)}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground text-sm">
                          {String(
                            org.name ?? (isEn ? "Organization" : "Organización")
                          )}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {String(org.id)}
                        </p>
                      </div>
                      <UseOrgButton locale={locale} orgId={String(org.id)} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  let organizations: Row[] = [];
  let properties: Row[] = [];
  let units: Row[] = [];
  let channels: Row[] = [];
  let listings: Row[] = [];

  try {
    const [orgs, props, unitRows, chanRows, listingRows] = await Promise.all([
      fetchOrganizations(25),
      fetchList("/properties", orgId, 25),
      fetchList("/units", orgId, 25),
      fetchList("/channels", orgId, 25),
      fetchList("/listings", orgId, 25),
    ]);

    organizations = orgs as Row[];
    properties = props as Row[];
    units = unitRows as Row[];
    channels = chanRows as Row[];
    listings = listingRows as Row[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("Forbidden: not a member of this organization")) {
      let availableOrgs: Row[] = [];
      try {
        availableOrgs = (await fetchOrganizations(25)) as Row[];
      } catch {
        availableOrgs = [];
      }

      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {isEn
                  ? "Organization access changed"
                  : "Acceso a organización cambiado"}
              </CardTitle>
              <CardDescription>
                {isEn ? (
                  <>
                    Your selected organization is no longer available
                    (membership removed or wrong workspace). Clear the selection
                    and choose another organization.
                  </>
                ) : (
                  <>
                    Tu organización seleccionada ya no está disponible
                    (membresía removida o espacio de trabajo incorrecto). Borra
                    la selección y elige otra organización.
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-muted-foreground text-sm">
                  {isEn ? "Selected org ID" : "ID de org seleccionada"}:{" "}
                  <span className="font-mono text-foreground">{orgId}</span>
                </div>
                <ClearOrgButton locale={locale} />
              </div>

              {availableOrgs.length ? (
                <div className="rounded-lg border bg-card p-4">
                  <p className="font-medium text-foreground text-sm">
                    {isEn
                      ? "Available organizations"
                      : "Organizaciones disponibles"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {isEn
                      ? "Switch to one to continue onboarding."
                      : "Cámbiate a una para continuar con el onboarding."}
                  </p>
                  <div className="mt-3 space-y-2">
                    {availableOrgs.map((org) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2"
                        key={String(org.id)}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground text-sm">
                            {String(
                              org.name ??
                                (isEn ? "Organization" : "Organización")
                            )}
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {String(org.id)}
                          </p>
                        </div>
                        <UseOrgButton locale={locale} orgId={String(org.id)} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTitle>
            {isEn ? "API connection failed" : "Fallo de conexión a la API"}
          </AlertTitle>
          <AlertDescription className="space-y-2 text-sm">
            <p>
              {isEn
                ? "Could not load onboarding data from the backend. Expected at"
                : "No se pudieron cargar los datos de onboarding desde el backend. Esperado en"}{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                {getApiBaseUrl()}
              </code>
            </p>
            <p className="break-words opacity-80">{message}</p>
            <p className="text-xs opacity-80">
              {isEn ? "Run" : "Ejecuta"}{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                cd apps/backend && npm start
              </code>{" "}
              {isEn ? "then refresh." : "y luego actualiza."}
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeOrganization =
    organizations.find((row) => asString(row.id) === orgId) ??
    ({ id: orgId } as Row);

  const profileType: OrganizationProfileType = isOrganizationProfileType(
    activeOrganization.profile_type
  )
    ? activeOrganization.profile_type
    : "management_company";

  const propertyOptions = properties
    .map((row) => ({
      id: asString(row.id),
      label: asString(row.name || row.code || row.id),
    }))
    .filter((item) => item.id);

  const orgDone = Boolean(orgId);
  const propertyDone = properties.length > 0;
  const unitDone = units.length > 0;
  const onboardingDone = orgDone && propertyDone && unitDone;

  const nextActionLinks = [
    {
      href: "/module/channels",
      label: isEn ? "Connect channels" : "Conectar canales",
    },
    {
      href: "/module/listings",
      label: isEn ? "Create listings" : "Crear anuncios",
    },
    {
      href: "/module/reservations",
      label: isEn ? "Start reservations/tasks" : "Iniciar reservas/tareas",
    },
  ];

  const openAdvancedByDefault = Boolean(tab);

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>
            {isEn
              ? "Could not complete request"
              : "No se pudo completar la solicitud"}
          </AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {successLabel ? (
        <Alert variant="success">
          <AlertTitle>
            {isEn ? "Success" : "Éxito"}: {successLabel}
          </AlertTitle>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="space-y-3">
          <Badge className="w-fit" variant="outline">
            {isEn ? "Onboarding wizard" : "Asistente de onboarding"}
          </Badge>
          <CardTitle className="text-2xl">
            {isEn ? "Organization onboarding" : "Onboarding de organización"}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Complete required foundation: organization profile, first property, first unit."
              : "Completa la base obligatoria: perfil de organización, primera propiedad y primera unidad."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <StepCard
              description={
                isEn
                  ? "Set profile and legal details."
                  : "Define perfil y datos legales."
              }
              done={orgDone}
              locked={false}
              statusLabelDone={isEn ? "Done" : "Completado"}
              statusLabelLocked={isEn ? "Locked" : "Bloqueado"}
              statusLabelPending={isEn ? "Pending" : "Pendiente"}
              title={isEn ? "Step 1 · Organization" : "Paso 1 · Organización"}
            >
              <form action={updateOrganizationAction} className="grid gap-3">
                <input name="id" type="hidden" value={orgId} />
                <OrganizationProfileInputs
                  defaultValue={profileType}
                  isEn={isEn}
                />
                <OrganizationCoreFields
                  defaults={{
                    defaultCurrency:
                      asString(activeOrganization.default_currency) || "PYG",
                    legalName: asString(activeOrganization.legal_name),
                    name:
                      asString(activeOrganization.name) ||
                      (isEn ? "Organization" : "Organización"),
                    ruc: asString(activeOrganization.ruc),
                    timezone:
                      asString(activeOrganization.timezone) ||
                      "America/Asuncion",
                  }}
                  isEn={isEn}
                />
                <Button size="sm" type="submit" variant="outline">
                  {isEn ? "Save organization" : "Guardar organización"}
                </Button>
              </form>
            </StepCard>

            <StepCard
              description={
                isEn
                  ? "Register your first asset in portfolio."
                  : "Registra tu primer activo del portafolio."
              }
              done={propertyDone}
              locked={!orgDone}
              statusLabelDone={isEn ? "Done" : "Completado"}
              statusLabelLocked={isEn ? "Locked" : "Bloqueado"}
              statusLabelPending={isEn ? "Pending" : "Pendiente"}
              title={isEn ? "Step 2 · Property" : "Paso 2 · Propiedad"}
            >
              <form action={createPropertyAction} className="grid gap-3">
                <input name="organization_id" type="hidden" value={orgId} />
                <label className="grid gap-1">
                  <span className="font-medium text-xs">
                    {isEn ? "Name" : "Nombre"}
                  </span>
                  <Input name="name" placeholder="Villa Morra HQ" required />
                </label>
                <label className="grid gap-1">
                  <span className="font-medium text-xs">
                    {isEn ? "Code" : "Código"}
                  </span>
                  <Input name="code" placeholder="VM-HQ" />
                </label>
                <label className="grid gap-1">
                  <span className="font-medium text-xs">
                    {isEn ? "Address" : "Dirección"}
                  </span>
                  <Input name="address_line1" placeholder="Av. España 1234" />
                </label>
                <label className="grid gap-1">
                  <span className="font-medium text-xs">
                    {isEn ? "City" : "Ciudad"}
                  </span>
                  <Input name="city" placeholder="Asunción" />
                </label>
                <Button disabled={!orgDone} size="sm" type="submit">
                  {isEn ? "Create property" : "Crear propiedad"}
                </Button>
              </form>
            </StepCard>

            <StepCard
              description={
                isEn
                  ? "Create first unit and finish onboarding."
                  : "Crea la primera unidad y finaliza onboarding."
              }
              done={unitDone}
              locked={!propertyDone}
              statusLabelDone={isEn ? "Done" : "Completado"}
              statusLabelLocked={isEn ? "Locked" : "Bloqueado"}
              statusLabelPending={isEn ? "Pending" : "Pendiente"}
              title={isEn ? "Step 3 · Unit" : "Paso 3 · Unidad"}
            >
              <form action={createUnitAction} className="grid gap-3">
                <input name="organization_id" type="hidden" value={orgId} />
                <input
                  name="finish_onboarding"
                  type="hidden"
                  value={unitDone ? "false" : "true"}
                />
                <label className="grid gap-1">
                  <span className="font-medium text-xs">
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
                <label className="grid gap-1">
                  <span className="font-medium text-xs">
                    {isEn ? "Unit code" : "Código de unidad"}
                  </span>
                  <Input name="code" placeholder="A1" required />
                </label>
                <label className="grid gap-1">
                  <span className="font-medium text-xs">
                    {isEn ? "Unit name" : "Nombre de unidad"}
                  </span>
                  <Input name="name" placeholder="Departamento A1" required />
                </label>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1">
                    <span className="font-medium text-xs">
                      {isEn ? "Max guests" : "Máx. huéspedes"}
                    </span>
                    <Input
                      defaultValue={2}
                      min={1}
                      name="max_guests"
                      type="number"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="font-medium text-xs">
                      {isEn ? "Bedrooms" : "Dormitorios"}
                    </span>
                    <Input
                      defaultValue={1}
                      min={0}
                      name="bedrooms"
                      type="number"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="font-medium text-xs">
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
                <Button disabled={!propertyDone} size="sm" type="submit">
                  {isEn ? "Create unit" : "Crear unidad"}
                </Button>
              </form>
            </StepCard>
          </div>

          <div className="grid gap-2 text-muted-foreground text-sm md:grid-cols-2">
            <div className="rounded-md border bg-card px-3 py-2">
              <span className="block text-xs uppercase tracking-wide">
                {isEn ? "Active organization" : "Organización activa"}
              </span>
              <strong className="font-mono text-foreground">{orgId}</strong>
              <p className="mt-1 text-xs">
                {isEn ? "Profile" : "Perfil"}:{" "}
                {profileTypeLabel(profileType, isEn)}
              </p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2">
              <span className="block text-xs uppercase tracking-wide">
                {isEn ? "API base URL" : "URL base de la API"}
              </span>
              <strong className="font-mono text-foreground">
                {getApiBaseUrl()}
              </strong>
            </div>
          </div>

          {onboardingDone ? (
            <Alert variant="success">
              <AlertTitle>
                {isEn
                  ? "Onboarding foundation completed"
                  : "Base de onboarding completada"}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  {isEn
                    ? "Your organization can now operate the core STR workflow. Continue with channels and listings."
                    : "Tu organización ya puede operar el flujo base de STR. Continúa con canales y anuncios."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className={cn(buttonVariants({ size: "sm" }))}
                    href="/app?onboarding=completed"
                  >
                    {isEn ? "Go to dashboard" : "Ir al panel"}
                  </Link>
                  {nextActionLinks.map((item) => (
                    <Link
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" })
                      )}
                      href={item.href}
                      key={item.href}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {properties.length === 0 &&
          units.length === 0 &&
          channels.length === 0 &&
          listings.length === 0 ? (
            <form
              action={seedDemoDataAction}
              className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/10 p-4 text-sm md:flex-row md:items-center md:justify-between"
            >
              <input name="organization_id" type="hidden" value={orgId} />
              <div>
                <p className="font-medium text-foreground">
                  {isEn
                    ? "Want a quick demo workspace?"
                    : "¿Quieres un espacio demo rápido?"}
                </p>
                <p className="text-muted-foreground">
                  {isEn
                    ? "Seed properties, units, reservations, tasks, and an example owner statement to explore modules."
                    : "Carga propiedades, unidades, reservas, tareas y un estado de ejemplo para explorar módulos."}
                </p>
              </div>
              <Button size="sm" type="submit" variant="secondary">
                {isEn ? "Seed demo data" : "Cargar datos de demo"}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Separator />

      <Collapsible defaultOpen={openAdvancedByDefault}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xl">
                  {isEn ? "Advanced onboarding" : "Onboarding avanzado"}
                </CardTitle>
                <CardDescription>
                  {isEn
                    ? "Full CRUD manager for organizations, properties, units, channels, and listings."
                    : "Administrador CRUD completo para organizaciones, propiedades, unidades, canales y anuncios."}
                </CardDescription>
              </div>
              <CollapsibleTrigger
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                {isEn ? "Toggle advanced" : "Alternar avanzado"}
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <SetupManager
                channels={channels}
                initialTab={tab}
                listings={listings}
                organizations={organizations}
                orgId={orgId}
                properties={properties}
                units={units}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
