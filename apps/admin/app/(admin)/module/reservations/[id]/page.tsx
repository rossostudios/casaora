import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { fetchList } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { safeDecode } from "@/lib/module-helpers";
import { getActiveOrgId } from "@/lib/org";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { fetchReservationDetailOverview } from "@/lib/reservations-overview";
import { ReservationWorkbench } from "./reservation-workbench";

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
  if (!decoded.startsWith("/")) return "/module/reservations";
  return decoded;
}

export default async function ReservationWorkbenchPage({
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
    return <NoOrgCard isEn={isEn} resource={["reservations", "reservas"]} />;
  }

  try {
    const [detail, guests] = await Promise.all([
      fetchReservationDetailOverview(route.id, orgId),
      fetchList("/guests", orgId, 300).catch(() => [] as unknown[]),
    ]);

    return (
      <ReservationWorkbench
        detail={detail}
        error={query.error ? safeDecode(query.error) : ""}
        guests={guests as Record<string, unknown>[]}
        locale={locale}
        orgId={orgId}
        returnTo={normalizeReturnTo(query.return_to)}
        success={
          query.success ? safeDecode(query.success).replaceAll("-", " ") : ""
        }
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
