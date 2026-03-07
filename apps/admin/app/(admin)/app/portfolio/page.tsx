import { PortfolioDashboard } from "@/components/portfolio/portfolio-dashboard";
import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { fetchJson } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import {
  fetchPortfolioOverview,
  normalizePortfolioOverviewPeriod,
} from "@/lib/portfolio-analytics";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { getActiveOrgId } from "@/lib/org";

type PageProps = {
  searchParams: Promise<{
    period?: string;
  }>;
};

export default async function PortfolioPage({ searchParams }: PageProps) {
  const [locale, orgId, params] = await Promise.all([
    getActiveLocale(),
    getActiveOrgId(),
    searchParams,
  ]);
  const isEn = locale === "en-US";

  if (!orgId) {
    return (
      <NoOrgCard isEn={isEn} resource={["portfolio analytics", "analítica de portafolio"]} />
    );
  }

  const period = normalizePortfolioOverviewPeriod(params.period);

  try {
    const [overview, org] = await Promise.all([
      fetchPortfolioOverview(orgId, period),
      fetchJson<Record<string, unknown>>(`/organizations/${encodeURIComponent(orgId)}`).catch(
        () => null
      ),
    ]);
    const rawCurrency =
      typeof org?.default_currency === "string"
        ? org.default_currency.trim().toUpperCase()
        : "";
    const defaultCurrency = rawCurrency || "PYG";

    return (
      <PageScaffold
        description={
          isEn
            ? "Scan portfolio health, spot issues quickly, and jump into properties or units with the right context."
            : "Revisa la salud del portafolio, detecta problemas rápido y entra a propiedades o unidades con el contexto correcto."
        }
        eyebrow={isEn ? "Portfolio" : "Portafolio"}
        title={isEn ? "Portfolio analytics" : "Analítica de portafolio"}
      >
        <PortfolioDashboard
          currency={defaultCurrency}
          initialOverview={overview}
          initialPeriod={period}
          locale={locale}
          orgId={orgId}
        />
      </PageScaffold>
    );
  } catch (err) {
    const message = errorMessage(err);
    if (isOrgMembershipError(message)) {
      return <OrgAccessChanged orgId={orgId} />;
    }
    return <ApiErrorCard isEn={isEn} message={message} />;
  }
}
