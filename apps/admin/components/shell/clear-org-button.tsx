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
    try {
      const response = await fetch("/api/org", {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        toast.error(
          isEn ? "Could not clear selection" : "No se pudo borrar la selección",
          {
            description:
              text || (isEn ? "Request failed" : "Falló la solicitud"),
          }
        );
        return;
      }

      toast.success(isEn ? "Selection cleared" : "Selección borrada", {
        description: isEn
          ? "Select a workspace to continue."
          : "Selecciona un espacio de trabajo para continuar.",
      });
      router.refresh();
    } catch (err) {
      toast.error(
        isEn ? "Could not clear selection" : "No se pudo borrar la selección",
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
