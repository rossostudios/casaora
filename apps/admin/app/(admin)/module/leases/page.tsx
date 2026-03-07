import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { fetchList } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { fetchLeasesOverview } from "@/lib/leases-overview";
import { safeDecode } from "@/lib/module-helpers";
import { getActiveOrgId } from "@/lib/org";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { LeasesManager } from "./leases-manager";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    lease_status?: string;
    renewal_status?: string;
    property_id?: string;
    unit_id?: string;
    view?: string;
    sort?: string;
    limit?: string;
    offset?: string;
    new?: string;
    success?: string;
    error?: string;
  }>;
};

function successLabel(raw: string): string {
  return safeDecode(raw).replaceAll("-", " ");
}

export default async function LeasesModulePage({ searchParams }: PageProps) {
  const [locale, orgId, params] = await Promise.all([
    getActiveLocale(),
    getActiveOrgId(),
    searchParams,
  ]);
  const isEn = locale === "en-US";

  if (!orgId) {
    return <NoOrgCard isEn={isEn} resource={["leases", "contratos"]} />;
  }

  try {
    const [overview, properties, units] = await Promise.all([
      fetchLeasesOverview({
        org_id: orgId,
        q: params.q,
        lease_status: params.lease_status,
        renewal_status: params.renewal_status,
        property_id: params.property_id,
        unit_id: params.unit_id,
        view: params.view,
        sort: params.sort,
        limit: params.limit ? Number(params.limit) : 100,
        offset: params.offset ? Number(params.offset) : 0,
      }),
      fetchList("/properties", orgId, 300),
      fetchList("/units", orgId, 500),
    ]);

    return (
      <LeasesManager
        error={params.error ? safeDecode(params.error) : ""}
        initialFilters={{
          leaseStatus: params.lease_status ?? "",
          offset: params.offset ? Number(params.offset) : 0,
          propertyId: params.property_id ?? "",
          q: params.q ?? "",
          renewalStatus: params.renewal_status ?? "",
          sort: params.sort ?? "end_asc",
          unitId: params.unit_id ?? "",
          view: params.view ?? "all",
        }}
        locale={locale}
        openCreateOnLoad={params.new === "1"}
        orgId={orgId}
        overview={overview}
        properties={properties as Record<string, unknown>[]}
        success={params.success ? successLabel(params.success) : ""}
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
