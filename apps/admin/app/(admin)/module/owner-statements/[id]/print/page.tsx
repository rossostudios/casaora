import { fetchJson } from "@/lib/api";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";

import { AdminStatementPrint } from "./admin-statement-print";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminStatementPrintPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getActiveLocale();
  const orgId = await getActiveOrgId();

  let statement: Record<string, unknown> | null = null;
  let collections: Record<string, unknown>[] = [];
  let expenses: Record<string, unknown>[] = [];
  let orgName = "";

  try {
    const res = await fetchJson<Record<string, unknown>>(
      `/owner-statements/${encodeURIComponent(id)}`,
      { org_id: orgId },
    );
    statement = res;
    collections = (Array.isArray(res.collections) ? res.collections : []) as Record<string, unknown>[];
    expenses = (Array.isArray(res.expenses) ? res.expenses : []) as Record<string, unknown>[];
    orgName = String(res.organization_name ?? "");
  } catch {
    // Will render empty state
  }

  return (
    <AdminStatementPrint
      collections={collections}
      expenses={expenses}
      locale={locale}
      orgName={orgName}
      statement={statement}
    />
  );
}
