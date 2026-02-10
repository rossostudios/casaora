"use client";

import {
  Add01Icon,
  ArrowDown01Icon,
  Building01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Org = {
  id: string;
  name?: string | null;
};

type MeResponse = {
  organizations?: Org[];
};

function shortId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function OrgSwitcher({
  activeOrgId,
  locale,
}: {
  activeOrgId: string | null;
  locale: Locale;
}) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  const isEn = locale === "en-US";

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
        });
        if (!response.ok) {
          if (mounted) setLoading(false);
          return;
        }
        const payload = (await response.json()) as MeResponse;
        if (!mounted) return;
        setOrgs(payload.organizations ?? []);
        setLoading(false);
      } catch {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const activeOrg = useMemo(
    () => orgs.find((org) => org.id === activeOrgId) ?? null,
    [activeOrgId, orgs]
  );
  const label =
    activeOrg?.name?.trim() ||
    (activeOrgId
      ? shortId(activeOrgId)
      : isEn
        ? "Select organization"
        : "Seleccionar organización");

  const onSelect = async (orgId: string) => {
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
      if (detailsRef.current) detailsRef.current.open = false;
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
    }
  };

  return (
    <details className="relative" ref={detailsRef}>
      <summary
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "cursor-pointer list-none gap-2 [&::-webkit-details-marker]:hidden"
        )}
        title={
          activeOrgId ??
          (isEn ? "Select organization" : "Seleccionar organización")
        }
      >
        <Icon
          className="text-muted-foreground"
          icon={Building01Icon}
          size={16}
        />
        <span className="max-w-[14rem] truncate">
          {loading
            ? isEn
              ? "Loading organization..."
              : "Cargando organización..."
            : label}
        </span>
        <Icon
          className="text-muted-foreground"
          icon={ArrowDown01Icon}
          size={16}
        />
      </summary>

      <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg">
        <div className="border-b px-3 py-2">
          <p className="font-medium text-muted-foreground text-xs">
            {isEn ? "Organization" : "Organización"}
          </p>
        </div>

        <div className="max-h-72 overflow-auto p-1">
          {orgs.length ? (
            orgs.map((org) => {
              const selected = org.id === activeOrgId;
              return (
                <button
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted/40",
                    selected ? "bg-muted/40" : ""
                  )}
                  key={org.id}
                  onClick={() => onSelect(org.id)}
                  type="button"
                >
                  <Icon
                    className={cn(
                      selected ? "text-primary" : "text-muted-foreground",
                      "mt-0.5"
                    )}
                    icon={selected ? Tick01Icon : Building01Icon}
                    size={16}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">
                      {org.name || (isEn ? "Organization" : "Organización")}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {org.id}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-2 py-3 text-muted-foreground text-sm">
              {isEn
                ? "No organizations yet. Create your first one in Setup."
                : "Todavía no hay organizaciones. Crea tu primera en Configuración."}
            </div>
          )}
        </div>

        <div className="border-t p-2">
          <Link
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "w-full justify-start"
            )}
            href="/setup"
            onClick={() => {
              if (detailsRef.current) detailsRef.current.open = false;
            }}
          >
            <Icon icon={Add01Icon} size={16} />
            {isEn
              ? "Create / manage organizations"
              : "Crear / administrar organizaciones"}
          </Link>
        </div>
      </div>
    </details>
  );
}
