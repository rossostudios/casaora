import { ActionCenterModule } from "@/components/workspace/action-center-module";
import { errorMessage } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";
import { ApiErrorCard, NoOrgCard } from "@/lib/page-helpers";
import { getWorkspaceActionCenter } from "@/lib/workspace";

type PageProps = {
  searchParams: Promise<{
    priority?: string | string[];
    q?: string | string[];
    source?: string | string[];
  }>;
};

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function ActionCenterPage({ searchParams }: PageProps) {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";
  const orgId = await getActiveOrgId();

  if (!orgId) {
    return (
      <NoOrgCard
        isEn={isEn}
        resource={["the action center", "el centro de acción"]}
      />
    );
  }

  const sp = await searchParams;

  try {
    const data = await getWorkspaceActionCenter(orgId, locale);

    return (
      <ActionCenterModule
        initialData={data}
        initialPriority={readParam(sp.priority)}
        initialQuery={readParam(sp.q)}
        initialSource={readParam(sp.source)}
        locale={locale}
        orgId={orgId}
      />
    );
  } catch (err) {
    return <ApiErrorCard isEn={isEn} message={errorMessage(err)} />;
  }
}
