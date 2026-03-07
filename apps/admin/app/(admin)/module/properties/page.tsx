import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveDictionary } from "@/lib/i18n/server";
import { safeDecode } from "@/lib/module-helpers";
import { getActiveOrgId } from "@/lib/org";
import { fetchPortfolioPropertiesOverview } from "@/lib/portfolio-overview";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { PropertiesManager } from "./properties-manager";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    health?: string;
    property_type?: string;
    neighborhood?: string;
    view?: string;
    sort?: string;
    create?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function PropertiesModulePage({ searchParams }: PageProps) {
  const [locale, { properties: dict }, orgId, params] = await Promise.all([
    getActiveLocale(),
    getActiveDictionary(),
    getActiveOrgId(),
    searchParams,
  ]);
  const isEn = locale === "en-US";

  if (!orgId) {
    return <NoOrgCard isEn={isEn} resource={["properties", "propiedades"]} />;
  }

  const successMessage = params.success
    ? safeDecode(params.success) === "property-created"
      ? dict.created
      : safeDecode(params.success).replaceAll("-", " ")
    : "";
  const errorLabel = params.error ? safeDecode(params.error) : "";

  try {
    const overview = await fetchPortfolioPropertiesOverview({
      org_id: orgId,
      q: params.q,
      status: params.status,
      health: params.health,
      property_type: params.property_type,
      neighborhood: params.neighborhood,
      view: params.view,
      sort: params.sort,
      limit: 100,
      offset: 0,
    });

    return (
      <PropertiesManager
        error={errorLabel}
        initialFilters={{
          create: params.create === "1",
          health: params.health ?? "",
          neighborhood: params.neighborhood ?? "",
          propertyType: params.property_type ?? "",
          q: params.q ?? "",
          sort: params.sort ?? "",
          status: params.status ?? "",
          view: params.view ?? "all",
        }}
        orgId={orgId}
        overview={overview}
        success={successMessage}
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
