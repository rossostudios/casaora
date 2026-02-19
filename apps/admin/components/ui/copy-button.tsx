"use client";

import { Copy01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useActiveLocale } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
};

function shortId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";
  const resolvedLabel = label ?? (isEn ? "Copy" : "Copiar");

  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const successMsg = isEn ? "Copied" : "Copiado";
    const errorTitle = isEn ? "Could not copy" : "No se pudo copiar";
    const errorDesc = isEn
      ? "Your browser blocked clipboard access."
      : "Tu navegador bloqueó el acceso al portapapeles.";

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(successMsg, {
        description: shortId(value),
      });
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error(errorTitle, {
        description: errorDesc,
      });
    }
  };

  return (
    <button
      aria-label={resolvedLabel}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "gap-2",
        className
      )}
      onClick={onCopy}
      title={resolvedLabel}
      type="button"
    >
      <Icon icon={copied ? Tick01Icon : Copy01Icon} size={14} />
      {copied ? (isEn ? "Copied" : "Copiado") : resolvedLabel}
    </button>
  );
}
