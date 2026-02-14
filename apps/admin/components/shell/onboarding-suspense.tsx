import React, { Suspense } from "react";
import { getOnboardingProgress } from "@/lib/onboarding";
import { Skeleton } from "@/components/ui/skeleton";

type OnboardingSuspenseProps = {
    orgId: string | null;
    children: (progress: {
        completedSteps: number;
        totalSteps: number;
        percent: number;
    }) => React.ReactNode;
};

async function OnboardingFetch({ orgId, children }: OnboardingSuspenseProps) {
    const progress = await getOnboardingProgress(orgId);
    return <>{children(progress)}</>;
}

export function OnboardingSuspense({ orgId, children }: OnboardingSuspenseProps) {
    return (
        <Suspense fallback={<OnboardingSkeleton />}>
            <OnboardingFetch orgId={orgId}>{children}</OnboardingFetch>
        </Suspense>
    );
}

function OnboardingSkeleton() {
    return (
        <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full" />
        </div>
    );
}
