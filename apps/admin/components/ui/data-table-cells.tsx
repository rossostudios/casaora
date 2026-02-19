"use client";

import { Copy01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { HoverLink } from "@/components/ui/hover-link";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { humanizeKey } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { DataTableRow } from "./data-table-types";
import {
  asDateLabel,
  baseKeyFromIdKey,
  idKeyFromNameKey,
  isIdKey,
  isUuidString,
  metaFromHrefBase,
  shortId,
  stripTrailingSlash,
} from "./data-table-types";

export function DataIdCell({
  value,
  href,
  label,
  meta,
  locale,
}: {
  value: string;
  href?: string | null;
  label?: string;
  meta?: string | null;
  locale: Locale;
}) {
  const [copied, setCopied] = useState(false);
  const isEn = locale === "en-US";

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      let copiedMsg: string;
      if (isEn) { copiedMsg = "Copied to clipboard"; } else { copiedMsg = "Copiado al portapapeles"; }
      toast.success(copiedMsg, { description: shortId(value) });
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      let copyErrTitle: string;
      if (isEn) { copyErrTitle = "Could not copy"; } else { copyErrTitle = "No se pudo copiar"; }
      let copyErrDesc: string;
      if (isEn) { copyErrDesc = "Your browser blocked clipboard access."; } else { copyErrDesc = "Tu navegador bloqueó el acceso al portapapeles."; }
      toast.error(copyErrTitle, { description: copyErrDesc });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {href ? (
        <HoverLink
          className="font-mono text-primary text-xs underline-offset-4 hover:underline"
          description={
            isEn ? "Open record details." : "Abrir el detalle del registro."
          }
          href={href}
          id={value}
          label={label ?? (isEn ? "Open details" : "Abrir detalle")}
          meta={meta ?? undefined}
        >
          <span
            title={
              isEn ? `Open details for ${value}` : `Abrir detalle de ${value}`
            }
          >
            {shortId(value)}
          </span>
        </HoverLink>
      ) : (
        <span className="font-mono text-xs" title={value}>
          {shortId(value)}
        </span>
      )}
      <button
        aria-label={isEn ? "Copy value" : "Copiar valor"}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-7 w-7"
        )}
        onClick={onCopy}
        title={isEn ? "Copy" : "Copiar"}
        type="button"
      >
        <Icon icon={copied ? Tick01Icon : Copy01Icon} size={14} />
      </button>
    </div>
  );
}

export function DataCell({
  columnKey,
  value,
  row,
  rowHrefBase,
  foreignKeyHrefBaseByKey,
  locale,
}: {
  columnKey: string;
  value: unknown;
  row: DataTableRow;
  rowHrefBase?: string;
  foreignKeyHrefBaseByKey?: Record<string, string>;
  locale: Locale;
}) {
  const isEn = locale === "en-US";

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (typeof value === "string") {
    if (columnKey === "status") {
      return <StatusBadge value={value} />;
    }

    const dateLabel = asDateLabel(value, locale);
    if (dateLabel) {
      return <span title={value}>{dateLabel}</span>;
    }

    const normalizedKey = columnKey.trim();
    const normalizedValue = value.trim();

    if (
      rowHrefBase &&
      ["name", "title", "public_name", "code"].includes(normalizedKey)
    ) {
      const id = typeof row.id === "string" ? row.id.trim() : "";
      if (isUuidString(id)) {
        const meta = metaFromHrefBase(rowHrefBase);
        return (
          <HoverLink
            className="hover:underline"
            description={
              isEn ? "Open record details." : "Abrir el detalle del registro."
            }
            href={`${stripTrailingSlash(rowHrefBase)}/${id}`}
            id={id}
            label={normalizedValue}
            meta={meta ?? undefined}
            prefetch={false}
          >
            {normalizedValue}
          </HoverLink>
        );
      }
    }

    if (normalizedKey.endsWith("_name")) {
      const idKey = idKeyFromNameKey(normalizedKey);
      const idValue =
        typeof row[idKey] === "string" ? String(row[idKey]).trim() : "";
      const base = foreignKeyHrefBaseByKey?.[idKey];
      if (base && isUuidString(idValue)) {
        const meta = humanizeKey(baseKeyFromIdKey(idKey));
        return (
          <HoverLink
            className="text-primary underline-offset-4 hover:underline"
            description={
              isEn ? `Open ${meta} details.` : `Abrir detalle de ${meta}.`
            }
            href={`${stripTrailingSlash(base)}/${idValue}`}
            id={idValue}
            label={normalizedValue}
            meta={meta}
            prefetch={false}
          >
            {normalizedValue}
          </HoverLink>
        );
      }
    }

    if (isIdKey(columnKey) || isUuidString(value)) {
      let href: string | null = null;
      let meta: string | null = null;
      if (
        normalizedKey === "id" &&
        rowHrefBase &&
        isUuidString(normalizedValue)
      ) {
        href = `${stripTrailingSlash(rowHrefBase)}/${normalizedValue}`;
        meta = metaFromHrefBase(rowHrefBase);
      } else if (
        normalizedKey !== "id" &&
        foreignKeyHrefBaseByKey?.[normalizedKey] &&
        isUuidString(normalizedValue)
      ) {
        const base = foreignKeyHrefBaseByKey[normalizedKey];
        href = `${stripTrailingSlash(base)}/${normalizedValue}`;
        meta = metaFromHrefBase(base);
      }

      return (
        <DataIdCell
          href={href}
          label={humanizeKey(normalizedKey)}
          locale={locale}
          meta={meta}
          value={normalizedValue}
        />
      );
    }

    const trimmed = normalizedValue;
    const display =
      trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
    return (
      <span
        className={cn(
          "break-words",
          trimmed.length > 120 ? "text-muted-foreground" : ""
        )}
        title={trimmed}
      >
        {display}
      </span>
    );
  }

  if (typeof value === "number") {
    const formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(value);
    return <span className="tabular-nums">{formatted}</span>;
  }

  if (typeof value === "boolean") {
    if (columnKey === "is_active") {
      return <StatusBadge value={value ? "active" : "inactive"} />;
    }
    return (
      <span className="font-medium">
        {value ? (isEn ? "Yes" : "Sí") : "No"}
      </span>
    );
  }

  if (Array.isArray(value)) {
    return (
      <span className="text-muted-foreground">{`Array(${value.length})`}</span>
    );
  }

  const raw = (() => {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  })();

  const preview = raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
  return (
    <span
      className="break-all font-mono text-muted-foreground text-xs"
      title={raw}
    >
      {preview}
    </span>
  );
}
