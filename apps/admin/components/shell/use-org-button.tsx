"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";
import { useActiveLocale } from "@/lib/i18n/client";

export function UseOrgButton({
  orgId,
  locale,
}: {
  orgId: string;
  locale?: Locale;
}) {
  const router = useRouter();
  const activeLocale = useActiveLocale();
  const [busy, setBusy] = useState(false);
  const isEn = (locale ?? activeLocale) === "en-US";

  const onClick = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/org", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ org_id: orgId }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        toast.error(
          isEn
            ? "Could not switch organization"
            : "No se pudo cambiar la organización",
          {
            description:
              text || (isEn ? "Request failed" : "Falló la solicitud"),
          }
        );
        return;
      }
      router.refresh();
    } catch (err) {
      toast.error(
        isEn
          ? "Could not switch organization"
          : "No se pudo cambiar la organización",
        {
          description: err instanceof Error ? err.message : String(err),
        }
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      className="gap-2"
      disabled={busy}
      onClick={onClick}
      size="sm"
      type="button"
      variant="secondary"
    >
      {isEn ? "Use" : "Usar"}
      <Icon icon={ArrowRight01Icon} size={14} />
    </Button>
  );
}
