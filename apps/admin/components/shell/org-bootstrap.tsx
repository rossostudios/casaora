"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type OrgBootstrapProps = {
  activeOrgId: string | null;
};

export function OrgBootstrap({ activeOrgId }: OrgBootstrapProps) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          organizations?: Array<{ id: string }>;
        };
        const organizations = payload.organizations ?? [];
        if (!organizations.length) {
          // If the user has no orgs yet, clear any stale selection so the UI
          // falls back to the onboarding empty state instead of 403s.
          if (activeOrgId) {
            try {
              await fetch("/api/org", {
                method: "DELETE",
                headers: { Accept: "application/json" },
              });
            } catch {
              // Best-effort cleanup.
            }
            if (cancelled) return;
            router.refresh();
          }
          return;
        }

        const hasActive = activeOrgId
          ? organizations.some((org) => org.id === activeOrgId)
          : false;
        if (hasActive) return;

        const first = organizations[0]?.id;
        if (!first) return;

        await fetch("/api/org", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ org_id: first }),
        });

        if (cancelled) return;
        router.refresh();
      } catch {
        // Ignore bootstrap errors; the UI will display a helpful empty state.
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [activeOrgId, router]);

  return null;
}
