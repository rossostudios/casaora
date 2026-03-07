import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { safeDecode } from "@/lib/module-helpers";
import { getActiveOrgId } from "@/lib/org";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { fetchApplicationsOverview } from "@/lib/applications-overview";
import { fetchList } from "@/lib/api";
import { ApplicationsManager } from "./applications-manager";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    assigned_user_id?: string;
    listing_id?: string;
    property_id?: string;
    qualification_band?: string;
    response_sla_status?: string;
    source?: string;
    view?: string;
    sort?: string;
    limit?: string;
    offset?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function ApplicationsModulePage({ searchParams }: PageProps) {
  const [locale, orgId, params] = await Promise.all([
    getActiveLocale(),
    getActiveOrgId(),
    searchParams,
  ]);
  const isEn = locale === "en-US";

  if (!orgId) {
    return <NoOrgCard isEn={isEn} resource={["applications", "aplicaciones"]} />;
  }

  const successMessage = params.success
    ? safeDecode(params.success).replaceAll("-", " ")
    : "";
  const errorLabel = params.error ? safeDecode(params.error) : "";

  try {
    const [overview, members, messageTemplates] = await Promise.all([
      fetchApplicationsOverview({
        org_id: orgId,
        q: params.q,
        status: params.status,
        assigned_user_id: params.assigned_user_id,
        listing_id: params.listing_id,
        property_id: params.property_id,
        qualification_band: params.qualification_band,
        response_sla_status: params.response_sla_status,
        source: params.source,
        view: params.view,
        sort: params.sort,
        limit: params.limit ? Number(params.limit) : 50,
        offset: params.offset ? Number(params.offset) : 0,
      }),
      fetchList(`/organizations/${orgId}/members`, orgId, 150).catch(
        () => [] as unknown[]
      ),
      fetchList("/message-templates", orgId, 120).catch(() => [] as unknown[]),
    ]);

    return (
      <ApplicationsManager
        error={errorLabel}
        initialFilters={{
          assignedUserId: params.assigned_user_id ?? "",
          limit: params.limit ? Number(params.limit) : 50,
          listingId: params.listing_id ?? "",
          offset: params.offset ? Number(params.offset) : 0,
          propertyId: params.property_id ?? "",
          q: params.q ?? "",
          qualificationBand: params.qualification_band ?? "",
          responseSlaStatus: params.response_sla_status ?? "",
          sort: params.sort ?? "last_touch_desc",
          source: params.source ?? "",
          status: params.status ?? "",
          view: params.view ?? "all",
        }}
        members={members as Record<string, unknown>[]}
        messageTemplates={messageTemplates as Record<string, unknown>[]}
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
