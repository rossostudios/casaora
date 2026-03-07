import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { fetchList } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { fetchListingsOverview } from "@/lib/listings-overview";
import { safeDecode } from "@/lib/module-helpers";
import { getActiveOrgId } from "@/lib/org";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { ListingsManager } from "./listings-manager";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    property_id?: string;
    unit_id?: string;
    published_state?: string;
    lifecycle_state?: string;
    view?: string;
    sort?: string;
    success?: string;
    error?: string;
  }>;
};

function successLabel(isEn: boolean, raw: string): string {
  const key = safeDecode(raw).trim().toLowerCase();
  if (key === "listing-published") {
    return isEn ? "Listing published" : "Anuncio publicado";
  }
  if (key === "listing-unpublished") {
    return isEn ? "Listing unpublished" : "Anuncio despublicado";
  }
  return safeDecode(raw).replaceAll("-", " ");
}

export default async function ListingsModulePage({ searchParams }: PageProps) {
  const [locale, orgId, params] = await Promise.all([
    getActiveLocale(),
    getActiveOrgId(),
    searchParams,
  ]);
  const isEn = locale === "en-US";

  if (!orgId) {
    return <NoOrgCard isEn={isEn} resource={["listings", "anuncios"]} />;
  }

  try {
    const [overview, properties, units, pricingTemplates] = await Promise.all([
      fetchListingsOverview({
        org_id: orgId,
        q: params.q,
        property_id: params.property_id,
        unit_id: params.unit_id,
        published_state: params.published_state,
        lifecycle_state: params.lifecycle_state,
        view: params.view,
        sort: params.sort,
        limit: 100,
        offset: 0,
      }),
      fetchList("/properties", orgId, 300),
      fetchList("/units", orgId, 500),
      fetchList("/pricing/templates", orgId, 200).catch(() => [] as unknown[]),
    ]);

    return (
      <ListingsManager
        error={params.error ? safeDecode(params.error) : ""}
        initialFilters={{
          lifecycleState: params.lifecycle_state ?? "",
          propertyId: params.property_id ?? "",
          publishedState: params.published_state ?? "",
          q: params.q ?? "",
          sort: params.sort ?? "updated_desc",
          unitId: params.unit_id ?? "",
          view: params.view ?? "all",
        }}
        locale={locale}
        orgId={orgId}
        overview={overview}
        pricingTemplates={pricingTemplates as Record<string, unknown>[]}
        properties={properties as Record<string, unknown>[]}
        success={params.success ? successLabel(isEn, params.success) : ""}
        units={units as Record<string, unknown>[]}
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
