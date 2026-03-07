import { TodayWorkspace } from "@/components/workspace/today-workspace";
import { getActiveLocale } from "@/lib/i18n/server";
import { NoOrgCard } from "@/lib/page-helpers";
import { getActiveOrgId } from "@/lib/org";
import { getTodayWorkspaceData } from "@/lib/workspace";

export default async function AppHomePage() {
  const [locale, orgId] = await Promise.all([
    getActiveLocale(),
    getActiveOrgId(),
  ]);
  const isEn = locale === "en-US";

  if (!orgId) {
    return <NoOrgCard isEn={isEn} resource={["today's workspace", "el espacio de hoy"]} />;
  }

  const data = await getTodayWorkspaceData(orgId, locale);

  return <TodayWorkspace data={data} locale={locale} />;
}
