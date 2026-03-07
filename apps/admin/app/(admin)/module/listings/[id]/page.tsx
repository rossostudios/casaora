import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { fetchList } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { fetchListingDetailOverview } from "@/lib/listings-overview";
import { safeDecode } from "@/lib/module-helpers";
import { getActiveOrgId } from "@/lib/org";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { ListingWorkbench } from "./listing-workbench";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    field?: string;
    return_to?: string;
    preview?: string;
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

function normalizeReturnTo(value: string | undefined): string {
  const decoded = value ? safeDecode(value).trim() : "";
  if (!decoded.startsWith("/")) return "/module/listings";
  return decoded;
}

export default async function ListingWorkbenchPage({
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
    return <NoOrgCard isEn={isEn} resource={["listings", "anuncios"]} />;
  }

  try {
    const [detail, properties, units, pricingTemplates] = await Promise.all([
      fetchListingDetailOverview(route.id, orgId),
      fetchList("/properties", orgId, 300),
      fetchList("/units", orgId, 500),
      fetchList("/pricing/templates", orgId, 200).catch(() => [] as unknown[]),
    ]);

    return (
      <ListingWorkbench
        detail={detail}
        error={query.error ? safeDecode(query.error) : ""}
        initialField={query.field ? safeDecode(query.field) : undefined}
        initialPreviewOpen={query.preview === "1"}
        locale={locale}
        orgId={orgId}
        pricingTemplates={pricingTemplates as Record<string, unknown>[]}
        properties={properties as Record<string, unknown>[]}
        returnTo={normalizeReturnTo(query.return_to)}
        success={query.success ? successLabel(isEn, query.success) : ""}
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
