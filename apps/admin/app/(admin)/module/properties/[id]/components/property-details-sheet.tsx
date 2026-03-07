"use client";

import { InformationCircleIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { createContext, type ReactNode, useContext, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { humanizeKey } from "@/lib/format";
import { FOREIGN_KEY_HREF_BASE_BY_KEY } from "@/lib/links";
import { cn } from "@/lib/utils";
import type { PropertyRelatedLink } from "../types";

/* ---------- helpers ---------- */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function shortId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function asDateLabel(value: string, locale: "en-US" | "es-PY"): string | null {
  if (!(ISO_DATE_TIME_RE.test(value) || ISO_DATE_RE.test(value))) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;

  if (ISO_DATE_RE.test(value)) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
      date
    );
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toLabel(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/* ---------- field grouping ---------- */

type FieldGroup = "overview" | "details" | "location" | "system";

function classifyKey(key: string): FieldGroup {
  if (
    ["id", "name", "title", "code", "public_name", "status", "property_type", "type", "kind"].includes(key)
  )
    return "overview";
  if (
    /^address|^city$|^district$|^neighborhood$|^country|^state$|^zip$|^postal|^location$|^latitude$|^longitude$|^region$/.test(
      key
    )
  )
    return "location";
  if (
    key === "organization_id" ||
    key.endsWith("_at") ||
    key.endsWith("_on") ||
    (key.endsWith("_id") && key !== "id")
  )
    return "system";
  return "details";
}

const GROUP_ORDER: FieldGroup[] = ["overview", "details", "location", "system"];

const GROUP_HEADINGS: Record<FieldGroup, { en: string; es: string }> = {
  overview: { en: "Overview", es: "Resumen" },
  details: { en: "Property Info", es: "Información" },
  location: { en: "Location", es: "Ubicación" },
  system: { en: "System", es: "Sistema" },
};

function groupKeys(keys: string[]) {
  const buckets: Record<FieldGroup, string[]> = {
    overview: [],
    details: [],
    location: [],
    system: [],
  };
  for (const key of keys) {
    buckets[classifyKey(key)].push(key);
  }
  return GROUP_ORDER.map((groupKey) => ({
    groupKey,
    fields: buckets[groupKey],
  }));
}

/* ---------- AI context derivation ---------- */

function deriveAiContext(
  record: Record<string, unknown>,
  isEn: boolean
): { line: string; cta: { label: string; href: string } } | null {
  const propertyId = String(record.id ?? "");
  const propertyName = String(record.name ?? record.title ?? "");
  if (!propertyId) return null;

  const playgroundHref = `/module/agent-playground?property_id=${encodeURIComponent(propertyId)}&property_name=${encodeURIComponent(propertyName)}`;

  return {
    line: isEn
      ? "Ask AI about this property's performance, pricing, or operations."
      : "Pregunta a la IA sobre rendimiento, precios u operaciones de esta propiedad.",
    cta: {
      label: isEn ? "Open playground" : "Abrir playground",
      href: `${playgroundHref}&agent=guest-concierge`,
    },
  };
}

/* ---------- context ---------- */

const DetailsCtx = createContext<{
  open: boolean;
  toggle: (next?: boolean) => void;
}>({ open: false, toggle: () => undefined });

export function DetailsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <DetailsCtx.Provider
      value={{
        open,
        toggle: (next) =>
          setOpen((o) => (typeof next === "boolean" ? next : !o)),
      }}
    >
      {children}
    </DetailsCtx.Provider>
  );
}

/* ---------- trigger button ---------- */

type DetailsTriggerProps = {
  isEn: boolean;
  fieldCount?: number;
};

export function DetailsTrigger({ isEn }: DetailsTriggerProps) {
  const { open, toggle } = useContext(DetailsCtx);

  return (
    <Button
      className={cn(
        "h-9 gap-2 rounded-xl border-border/40 bg-background/40 px-3 hover:bg-background/80",
        open && "bg-background/80 ring-1 ring-primary/30"
      )}
      onClick={() => toggle()}
      size="sm"
      variant="outline"
    >
      <Icon icon={InformationCircleIcon} size={16} />
      <span className="hidden sm:inline">
        {isEn ? "Details" : "Detalles"}
      </span>
    </Button>
  );
}

/* ---------- field value renderer ---------- */

function FieldValue({
  fieldKey,
  value,
  record,
  locale,
  isEn,
  isSystem,
}: {
  fieldKey: string;
  value: unknown;
  record: Record<string, unknown>;
  locale: "en-US" | "es-PY";
  isEn: boolean;
  isSystem: boolean;
}) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/30 text-sm">-</span>;
  }

  const text = typeof value === "string" ? value : null;
  const dateLabel = text ? asDateLabel(text, locale) : null;
  const isStatus =
    fieldKey === "status" && typeof value === "string" && value.trim().length > 0;

  // FK link
  const fkHref = (() => {
    const directBase = FOREIGN_KEY_HREF_BASE_BY_KEY[fieldKey];
    if (directBase && typeof value === "string" && isUuid(value)) {
      return `${directBase}/${value}`;
    }
    if (fieldKey.endsWith("_name")) {
      const idKey = `${fieldKey.slice(0, -5)}_id`;
      const rawId = record[idKey];
      const base = FOREIGN_KEY_HREF_BASE_BY_KEY[idKey];
      if (base && typeof rawId === "string" && isUuid(rawId)) {
        return `${base}/${rawId}`;
      }
    }
    return null;
  })();

  const showMono =
    typeof value === "string" &&
    (isUuid(value) || fieldKey === "id" || fieldKey.endsWith("_id"));

  if (isStatus) {
    return <StatusBadge value={String(value)} />;
  }

  if (dateLabel) {
    return (
      <span
        className={cn("text-sm", isSystem && "text-muted-foreground/50")}
        title={String(value)}
      >
        {dateLabel}
      </span>
    );
  }

  if (fkHref) {
    return (
      <Link
        className={cn(
          "text-primary underline-offset-4 hover:underline",
          fieldKey.endsWith("_name") ? "text-sm" : "font-mono text-xs",
          showMono && !fieldKey.endsWith("_name") && "break-all",
          isSystem && "text-muted-foreground/50"
        )}
        href={fkHref}
        prefetch={false}
      >
        {fieldKey.endsWith("_name") ? String(value) : shortId(String(value))}
      </Link>
    );
  }

  if (typeof value === "boolean") {
    if (fieldKey === "is_active") {
      return <StatusBadge value={value ? "active" : "inactive"} />;
    }
    return (
      <span className="text-sm">
        {value ? (isEn ? "Yes" : "Si") : isEn ? "No" : "No"}
      </span>
    );
  }

  if (typeof value === "number") {
    return (
      <span className="text-sm tabular-nums">
        {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
          value
        )}
      </span>
    );
  }

  if (typeof value === "object") {
    return (
      <pre className="max-h-40 overflow-auto rounded-md bg-muted/10 p-2 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return (
    <span
      className={cn(
        "text-sm",
        showMono && "break-all font-mono text-xs",
        isSystem && showMono && "text-muted-foreground/50"
      )}
    >
      {toLabel(value)}
    </span>
  );
}

/* ---------- panel ---------- */

type DetailsPanelProps = {
  record: Record<string, unknown>;
  keys: string[];
  locale: "en-US" | "es-PY";
  isEn: boolean;
  links: PropertyRelatedLink[];
  title: string;
};

export function DetailsPanel({
  record,
  keys,
  locale,
  isEn,
  links,
  title,
}: DetailsPanelProps) {
  const { open, toggle } = useContext(DetailsCtx);

  const aiCtx = deriveAiContext(record, isEn);

  return (
    <Sheet
      contentClassName="w-[min(96vw,37.5rem)]"
      description={
        isEn ? "Property profile" : "Perfil de propiedad"
      }
      onOpenChange={toggle}
      open={open}
      side="right"
      title={title}
    >
      <div className="space-y-10">
        {/* AI Context */}
        {aiCtx && (
          <div className="flex items-start gap-3">
            <Icon
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40"
              icon={SparklesIcon}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-muted-foreground/60 text-[13px] leading-relaxed">
                {aiCtx.line}
              </p>
              <Link
                className="inline-flex text-[12px] text-primary underline-offset-4 hover:underline"
                href={aiCtx.cta.href}
              >
                {aiCtx.cta.label}
              </Link>
            </div>
          </div>
        )}

        {/* Related workflows */}
        {links.length > 0 && (
          <div className="space-y-3">
            <p className="font-semibold text-[10px] text-muted-foreground/40 uppercase tracking-[0.12em]">
              {isEn ? "Related workflows" : "Flujos relacionados"}
            </p>
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <Link
                  className="rounded-md px-2.5 py-1 text-[11px] text-muted-foreground/70 transition-colors hover:bg-muted/20 hover:text-foreground"
                  href={link.href}
                  key={link.href}
                  prefetch={false}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Grouped fields */}
        {groupKeys(keys).map(({ groupKey, fields }) => {
          if (fields.length === 0) return null;
          const isSystem = groupKey === "system";
          const heading = isEn
            ? GROUP_HEADINGS[groupKey].en
            : GROUP_HEADINGS[groupKey].es;

          return (
            <div className="space-y-4" key={groupKey}>
              <p className="font-semibold text-[10px] text-muted-foreground/40 uppercase tracking-[0.12em]">
                {heading}
              </p>
              <div className={cn(isSystem && "opacity-50")}>
                {fields.map((key) => {
                  const value = record[key];
                  return (
                    <div
                      className="grid grid-cols-[160px_1fr] items-baseline gap-x-4 py-2.5"
                      key={key}
                    >
                      <span className="text-[13px] text-muted-foreground/50">
                        {humanizeKey(key)}
                      </span>
                      <div className="min-w-0">
                        <FieldValue
                          fieldKey={key}
                          isEn={isEn}
                          isSystem={isSystem}
                          locale={locale}
                          record={record}
                          value={value}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/* ---------- re-exports ---------- */

export { DetailsProvider as PropertyDetailsProvider };
export { DetailsTrigger as PropertyDetailsTrigger };
export { DetailsPanel as PropertyDetailsPanel };
