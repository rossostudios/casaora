import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { fetchList } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { safeDecode } from "@/lib/module-helpers";
import { getActiveOrgId } from "@/lib/org";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { fetchReservationsOverview } from "@/lib/reservations-overview";
import { ReservationsManager } from "./reservations-manager";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    source?: string;
    property_id?: string;
    unit_id?: string;
    stay_phase?: string;
    from?: string;
    to?: string;
    view?: string;
    sort?: string;
    limit?: string;
    offset?: string;
    success?: string;
    error?: string;
  }>;
};

function successLabel(raw: string): string {
  return safeDecode(raw).replaceAll("-", " ");
}

export default async function ReservationsModulePage({ searchParams }: PageProps) {
  const [locale, orgId, params] = await Promise.all([
    getActiveLocale(),
    getActiveOrgId(),
    searchParams,
  ]);
  const isEn = locale === "en-US";

  if (!orgId) {
    return <NoOrgCard isEn={isEn} resource={["reservations", "reservas"]} />;
  }

  try {
    const [overview, properties, units, guests] = await Promise.all([
      fetchReservationsOverview({
        org_id: orgId,
        q: params.q,
        status: params.status,
        source: params.source,
        property_id: params.property_id,
        unit_id: params.unit_id,
        stay_phase: params.stay_phase,
        from: params.from,
        to: params.to,
        view: params.view,
        sort: params.sort,
        limit: params.limit ? Number(params.limit) : 50,
        offset: params.offset ? Number(params.offset) : 0,
      }),
      fetchList("/properties", orgId, 300),
      fetchList("/units", orgId, 500),
      fetchList("/guests", orgId, 300).catch(() => [] as unknown[]),
    ]);

    return (
      <ReservationsManager
        error={params.error ? safeDecode(params.error) : ""}
        guests={guests as Record<string, unknown>[]}
        initialFilters={{
          from: params.from ?? "",
          limit: params.limit ? Number(params.limit) : 50,
          offset: params.offset ? Number(params.offset) : 0,
          propertyId: params.property_id ?? "",
          q: params.q ?? "",
          sort: params.sort ?? "check_in_asc",
          source: params.source ?? "",
          status: params.status ?? "",
          stayPhase: params.stay_phase ?? "",
          to: params.to ?? "",
          unitId: params.unit_id ?? "",
          view: params.view ?? "all",
        }}
        locale={locale}
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
