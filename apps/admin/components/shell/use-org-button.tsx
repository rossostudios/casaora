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
    const errTitle = isEn
      ? "Could not switch organization"
      : "No se pudo cambiar la organización";
    const fallbackDesc = isEn ? "Request failed" : "Falló la solicitud";
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
        let desc = fallbackDesc;
        if (text) {
          desc = text;
        }
        toast.error(errTitle, { description: desc });
        setBusy(false);
        return;
      }
      router.refresh();
      setBusy(false);
    } catch (err) {
      let desc = String(err);
      if (err instanceof Error) {
        desc = err.message;
      }
      toast.error(errTitle, { description: desc });
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
