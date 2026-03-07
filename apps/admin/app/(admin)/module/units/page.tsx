import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { safeDecode } from "@/lib/module-helpers";
import { getActiveOrgId } from "@/lib/org";
import { fetchList } from "@/lib/api";
import { fetchPortfolioUnitsOverview } from "@/lib/portfolio-overview";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { UnitsManager } from "./units-manager";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    property_id?: string;
    status?: string;
    unit_type?: string;
    condition_status?: string;
    view?: string;
    sort?: string;
    create?: string;
    success?: string;
    error?: string;
  }>;
};

const DUPLICATE_UNIT_ERROR_RE =
  /duplicate key value violates unique constraint|units_property_id_code_key|23505/i;

function successLabel(isEn: boolean, raw: string): string {
  const key = safeDecode(raw).trim().toLowerCase();
  if (key === "unit-created") return isEn ? "Unit created" : "Unidad creada";
  return safeDecode(raw).replaceAll("-", " ");
}

function errorLabel(isEn: boolean, raw: string): string {
  const decoded = safeDecode(raw).trim();
  if (!decoded) return "";

  const [key, meta] = decoded.split(":", 2);
  if (key === "unit-code-duplicate") {
    if (meta) {
      return isEn
        ? `This unit code already exists for this property. Try "${meta}".`
        : `Este código de unidad ya existe para esta propiedad. Prueba "${meta}".`;
    }
    return isEn
      ? "This unit code already exists for this property."
      : "Este código de unidad ya existe para esta propiedad.";
  }

  if (key === "unit-create-failed") {
    return isEn
      ? "Could not create the unit. Review the form and try again."
      : "No se pudo crear la unidad. Revisa el formulario e inténtalo de nuevo.";
  }

  if (DUPLICATE_UNIT_ERROR_RE.test(decoded)) {
    return isEn
      ? "This unit code already exists for this property."
      : "Este código de unidad ya existe para esta propiedad.";
  }

  return decoded;
}

export default async function UnitsModulePage({ searchParams }: PageProps) {
  const [locale, orgId, params] = await Promise.all([
    getActiveLocale(),
    getActiveOrgId(),
    searchParams,
  ]);
  const isEn = locale === "en-US";

  if (!orgId) {
    return <NoOrgCard isEn={isEn} resource={["units", "unidades"]} />;
  }

  try {
    const [overview, properties] = await Promise.all([
      fetchPortfolioUnitsOverview({
        org_id: orgId,
        q: params.q,
        property_id: params.property_id,
        status: params.status,
        unit_type: params.unit_type,
        condition_status: params.condition_status,
        view: params.view,
        sort: params.sort,
        limit: 100,
        offset: 0,
      }),
      fetchList("/properties", orgId, 300),
    ]);

    return (
      <UnitsManager
        error={params.error ? errorLabel(isEn, safeDecode(params.error)) : ""}
        initialFilters={{
          conditionStatus: params.condition_status ?? "",
          create: params.create === "1",
          propertyId: params.property_id ?? "",
          q: params.q ?? "",
          sort: params.sort ?? "",
          status: params.status ?? "",
          unitType: params.unit_type ?? "",
          view: params.view ?? "all",
        }}
        orgId={orgId}
        overview={overview}
        properties={properties as Record<string, unknown>[]}
        success={params.success ? successLabel(isEn, safeDecode(params.success)) : ""}
      />
    );
  } catch (err) {
    const message = errorMessage(err);
    if (isOrgMembershipError(message)) {
      return <OrgAccessChanged orgId={orgId} />;
    }
    return <ApiErrorCard isEn={isEn} message={message} />;
  }
}
