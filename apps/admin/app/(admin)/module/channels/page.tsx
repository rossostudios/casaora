import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { fetchListingsOverview } from "@/lib/listings-overview";
import { getActiveOrgId } from "@/lib/org";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { ChannelsManager } from "./channels-manager";

export default async function ChannelsPage() {
  const [locale, orgId] = await Promise.all([getActiveLocale(), getActiveOrgId()]);
  const isEn = locale === "en-US";

  if (!orgId) {
    return <NoOrgCard isEn={isEn} resource={["channels", "canales"]} />;
  }

  try {
    const [overview, blocked] = await Promise.all([
      fetchListingsOverview({ org_id: orgId, limit: 6, offset: 0 }),
      fetchListingsOverview({
        org_id: orgId,
        lifecycle_state: "blocked",
        limit: 3,
        offset: 0,
      }),
    ]);

    return (
      <ChannelsManager
        blockedRows={blocked.rows}
        locale={locale}
        overview={overview}
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
