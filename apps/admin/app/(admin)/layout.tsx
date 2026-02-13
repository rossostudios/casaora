import { AdminShell } from "@/components/shell/admin-shell";
import { OrgBootstrap } from "@/components/shell/org-bootstrap";
import { fetchList } from "@/lib/api";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";

const ONBOARDING_TOTAL_STEPS = 3;

async function getOnboardingProgress(orgId: string | null): Promise<{
  completedSteps: number;
  totalSteps: number;
  percent: number;
}> {
  if (!orgId) {
    return {
      completedSteps: 0,
      totalSteps: ONBOARDING_TOTAL_STEPS,
      percent: 0,
    };
  }

  try {
    const [properties, units] = await Promise.all([
      fetchList("/properties", orgId, 1),
      fetchList("/units", orgId, 1),
    ]);
    const completedSteps = [
      true,
      properties.length > 0,
      units.length > 0,
    ].filter(Boolean).length;

    return {
      completedSteps,
      totalSteps: ONBOARDING_TOTAL_STEPS,
      percent: Math.round((completedSteps / ONBOARDING_TOTAL_STEPS) * 100),
    };
  } catch {
    return {
      completedSteps: 1,
      totalSteps: ONBOARDING_TOTAL_STEPS,
      percent: Math.round(100 / ONBOARDING_TOTAL_STEPS),
    };
  }
}

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const orgId = await getActiveOrgId();
  const locale = await getActiveLocale();
  const onboardingProgress = await getOnboardingProgress(orgId);

  return (
    <div className="pa-admin-shell-root h-[100dvh] min-h-0 overflow-y-auto bg-background">
      <AdminShell
        locale={locale}
        onboardingProgress={onboardingProgress}
        orgId={orgId}
      >
        {children}
      </AdminShell>
      <OrgBootstrap activeOrgId={orgId} />
    </div>
  );
}
