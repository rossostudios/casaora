import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { fetchList } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { fetchLeaseDetailOverview } from "@/lib/leases-overview";
import { safeDecode } from "@/lib/module-helpers";
import { getActiveOrgId } from "@/lib/org";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { LeaseWorkbench } from "./lease-workbench";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    return_to?: string;
    success?: string;
    error?: string;
  }>;
};

function normalizeReturnTo(value: string | undefined): string {
  const decoded = value ? safeDecode(value).trim() : "";
  if (!decoded.startsWith("/")) return "/module/leases";
  return decoded;
}

export default async function LeaseWorkbenchPage({
  params,
  searchParams,
}: PageProps) {
  const [locale, orgId, route, query] = await Promise.all([
    getActiveLocale(),
    getActiveOrgId(),
    params,
    searchParams,
  ]);
  const isEn = locale === "en-US";

  if (!orgId) {
    return <NoOrgCard isEn={isEn} resource={["leases", "contratos"]} />;
  }

  try {
    const [detail, properties, units] = await Promise.all([
      fetchLeaseDetailOverview(route.id, orgId),
      fetchList("/properties", orgId, 300),
      fetchList("/units", orgId, 500),
    ]);

    return (
      <LeaseWorkbench
        detail={detail}
        error={query.error ? safeDecode(query.error) : ""}
        locale={locale}
        orgId={orgId}
        properties={properties as Record<string, unknown>[]}
        returnTo={normalizeReturnTo(query.return_to)}
        success={
          query.success ? safeDecode(query.success).replaceAll("-", " ") : ""
        }
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
