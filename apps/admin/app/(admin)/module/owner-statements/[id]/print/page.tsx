import { fetchJson } from "@/lib/api";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";

import { AdminStatementPrint } from "./admin-statement-print";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminStatementPrintPage({ params }: PageProps) {
  const [{ id }, locale, orgId] = await Promise.all([
    params,
    getActiveLocale(),
    getActiveOrgId(),
  ]);

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
    if (Array.isArray(res.collections)) {
      collections = res.collections as Record<string, unknown>[];
    } else {
      collections = [];
    }
    if (Array.isArray(res.expenses)) {
      expenses = res.expenses as Record<string, unknown>[];
    } else {
      expenses = [];
    }
    const rawOrgName = res.organization_name;
    if (rawOrgName != null) {
      orgName = String(rawOrgName);
    } else {
      orgName = "";
    }
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
