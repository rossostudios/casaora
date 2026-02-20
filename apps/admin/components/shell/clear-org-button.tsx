"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { useActiveLocale } from "@/lib/i18n/client";

export function ClearOrgButton({
  className,
  locale,
}: {
  className?: string;
  locale?: Locale;
}) {
  const router = useRouter();
  const activeLocale = useActiveLocale();
  const [busy, setBusy] = useState(false);
  const isEn = (locale ?? activeLocale) === "en-US";

  const onClick = async () => {
    setBusy(true);
    const errTitle = isEn
      ? "Could not clear selection"
      : "No se pudo borrar la selección";
    const fallbackDesc = isEn ? "Request failed" : "Falló la solicitud";
    const successTitle = isEn ? "Selection cleared" : "Selección borrada";
    const successDesc = isEn
      ? "Select a workspace to continue."
      : "Selecciona un espacio de trabajo para continuar.";
    try {
      const response = await fetch("/api/org", {
        method: "DELETE",
        headers: { Accept: "application/json" },
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

      toast.success(successTitle, { description: successDesc });
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
      className={className}
      disabled={busy}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {isEn ? "Clear selection" : "Borrar selección"}
    </Button>
  );
}
