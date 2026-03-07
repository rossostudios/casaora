import { notFound } from "next/navigation";
import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { fetchApplicationOverview } from "@/lib/applications-overview";
import { fetchList } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { safeDecode } from "@/lib/module-helpers";
import { getActiveOrgId } from "@/lib/org";
import { ApplicationWorkbench } from "./application-workbench";

type ApplicationWorkbenchPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    return_to?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function ApplicationWorkbenchPage({
  params,
  searchParams,
}: ApplicationWorkbenchPageProps) {
  const [{ id }, activeOrgId, locale, query] = await Promise.all([
    params,
    getActiveOrgId(),
    getActiveLocale(),
    searchParams,
  ]);
  const isEn = locale === "en-US";

  try {
    const data = await fetchApplicationOverview(id);
    const [members, messageTemplates] = await Promise.all([
      activeOrgId
        ? fetchList(`/organizations/${activeOrgId}/members`, activeOrgId, 150).catch(
            () => [] as unknown[]
          )
        : Promise.resolve([] as unknown[]),
      activeOrgId
        ? fetchList("/message-templates", activeOrgId, 120).catch(() => [] as unknown[])
        : Promise.resolve([] as unknown[]),
    ]);

    return (
      <ApplicationWorkbench
        data={data}
        error={query.error ? safeDecode(query.error) : ""}
        members={members as Record<string, unknown>[]}
        messageTemplates={messageTemplates as Record<string, unknown>[]}
        orgId={activeOrgId ?? ""}
        returnTo={query.return_to ? safeDecode(query.return_to) : "/module/applications"}
        success={query.success ? safeDecode(query.success).replaceAll("-", " ") : ""}
      />
    );
  } catch (err) {
    const message = errorMessage(err);
    if (message.includes("404")) {
      notFound();
    }
    if (isOrgMembershipError(message)) {
      return <OrgAccessChanged orgId={activeOrgId} />;
    }
    throw err;
  }
}
