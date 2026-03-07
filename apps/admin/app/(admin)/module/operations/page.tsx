import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { fetchList } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { safeDecode } from "@/lib/module-helpers";
import { fetchOperationsOverview } from "@/lib/operations-overview";
import { getActiveOrgId } from "@/lib/org";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { OperationsManager } from "./operations-manager";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    property_id?: string;
    unit_id?: string;
    assigned_user_id?: string;
    reservation_id?: string;
    task_id?: string;
    request_id?: string;
    kind?: string;
    tab?: string;
    view?: string;
    sort?: string;
    limit?: string;
    offset?: string;
    success?: string;
    error?: string;
  }>;
};

function normalizeKind(params: Awaited<PageProps["searchParams"]>): string {
  if (params.kind === "task" || params.kind === "maintenance") return params.kind;
  if (params.tab === "tasks") return "task";
  if (params.tab === "maintenance") return "maintenance";
  return "";
}

export default async function OperationsModulePage({ searchParams }: PageProps) {
  const [locale, orgId, params] = await Promise.all([
    getActiveLocale(),
    getActiveOrgId(),
    searchParams,
  ]);
  const isEn = locale === "en-US";

  if (!orgId) {
    return <NoOrgCard isEn={isEn} resource={["operations", "operaciones"]} />;
  }

  const kind = normalizeKind(params);

  try {
    const [overview, properties, units, members] = await Promise.all([
      fetchOperationsOverview({
        org_id: orgId,
        q: params.q,
        property_id: params.property_id,
        unit_id: params.unit_id,
        assigned_user_id: params.assigned_user_id,
        reservation_id: params.reservation_id,
        task_id: params.task_id,
        request_id: params.request_id,
        kind: kind || undefined,
        view: params.view,
        sort: params.sort,
        limit: params.limit ? Number(params.limit) : 50,
        offset: params.offset ? Number(params.offset) : 0,
      }),
      fetchList("/properties", orgId, 300),
      fetchList("/units", orgId, 500),
      fetchList(`/organizations/${orgId}/members`, orgId, 200).catch(
        () => [] as unknown[]
      ),
    ]);

    return (
      <OperationsManager
        error={params.error ? safeDecode(params.error) : ""}
        focusedItemId={params.task_id ?? params.request_id ?? ""}
        initialFilters={{
          assignedUserId: params.assigned_user_id ?? "",
          kind,
          limit: params.limit ? Number(params.limit) : 50,
          offset: params.offset ? Number(params.offset) : 0,
          propertyId: params.property_id ?? "",
          q: params.q ?? "",
          reservationId: params.reservation_id ?? "",
          sort: params.sort ?? "priority_desc",
          unitId: params.unit_id ?? "",
          view: params.view ?? "all",
        }}
        locale={locale}
        members={members as Record<string, unknown>[]}
        orgId={orgId}
        overview={overview}
        properties={properties as Record<string, unknown>[]}
        success={params.success ? safeDecode(params.success).replaceAll("-", " ") : ""}
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
