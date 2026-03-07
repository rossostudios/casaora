import {
  Calendar02Icon,
  Door01Icon,
  Invoice01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Fragment } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PropertyOverview as PropertyOverviewData } from "../types";
import { isUuid } from "./property-overview-utils";

type PropertyOverviewOperationsProps = {
  overview: PropertyOverviewData;
  recordId: string;
  locale: "en-US" | "es-PY";
  isEn: boolean;
};

export function PropertyOverviewOperations({
  overview,
  recordId,
  locale,
  isEn,
}: PropertyOverviewOperationsProps) {
  const workflowSteps = [
    {
      id: "listings",
      icon: Door01Icon,
      label: isEn ? "Listings" : "Anuncios",
      value: overview.publishedListingCount,
      micro:
        overview.publishedListingCount > 0
          ? `${overview.publishedListingCount} ${isEn ? "active" : "activos"}`
          : isEn
            ? "none active"
            : "sin activos",
      href: `/module/listings?property_id=${encodeURIComponent(recordId)}`,
    },
    {
      id: "applications",
      icon: UserGroupIcon,
      label: isEn ? "Applications" : "Aplicaciones",
      value: overview.pipelineApplicationCount,
      micro:
        overview.pipelineApplicationCount > 0
          ? `${overview.pipelineApplicationCount} ${isEn ? "pending" : "pendientes"}`
          : isEn
            ? "none pending"
            : "sin pendientes",
      href: `/module/applications?property_id=${encodeURIComponent(recordId)}`,
    },
    {
      id: "leases",
      icon: Calendar02Icon,
      label: isEn ? "Leases" : "Contratos",
      value: overview.activeLeaseCount,
      micro:
        overview.activeLeaseCount > 0
          ? `${overview.activeLeaseCount} ${isEn ? "active" : "activos"}`
          : isEn
            ? "none active"
            : "sin activos",
      href: `/module/leases?property_id=${encodeURIComponent(recordId)}`,
    },
    {
      id: "collections",
      icon: Invoice01Icon,
      label: isEn ? "Collections" : "Cobros",
      value: overview.openCollectionCount,
      micro:
        overview.openCollectionCount > 0
          ? `${overview.openCollectionCount} ${isEn ? "due" : "pendientes"}`
          : isEn
            ? "none due"
            : "sin pendientes",
      href: `/module/collections?property_id=${encodeURIComponent(recordId)}`,
    },
  ] as const;

  return (
    <section className="space-y-8">
      {/* ---- Workflow Lane ---- */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em]">
          {isEn ? "Workflow" : "Flujo operativo"}
        </h3>

        <div className="flex items-center gap-1">
          {workflowSteps.map((step, i) => {
            const isActive = step.value > 0;
            return (
              <Fragment key={step.id}>
                <Link
                  className={cn(
                    "group flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-3 transition-colors",
                    isActive
                      ? "bg-amber-500/5 dark:bg-amber-500/10"
                      : "hover:bg-muted/30"
                  )}
                  href={step.href}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-amber-500 text-white dark:bg-amber-600"
                        : "bg-muted/50 text-muted-foreground/60"
                    )}
                  >
                    <Icon icon={step.icon} size={14} />
                  </div>
                  <span
                    className={cn(
                      "text-[11px]",
                      isActive
                        ? "font-medium text-foreground"
                        : "text-muted-foreground/60"
                    )}
                  >
                    {step.label}
                  </span>
                  <span
                    className={cn(
                      "font-bold text-lg tabular-nums leading-tight tracking-tight",
                      isActive
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-foreground"
                    )}
                  >
                    {step.value}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40">
                    {step.micro}
                  </span>
                </Link>
                {i < workflowSteps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="hidden shrink-0 text-border/40 sm:inline"
                  >
                    <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
                      <path
                        d="M10 6l6 6-6 6"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </span>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* ---- Unit Matrix ---- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em]">
            {isEn ? "Units" : "Unidades"}
          </h3>
          <Link
            className={cn(
              buttonVariants({ size: "sm", variant: "ghost" }),
              "h-7 px-2 text-[11px] text-muted-foreground"
            )}
            href={`/module/units?property_id=${encodeURIComponent(recordId)}`}
          >
            {overview.unitCount > overview.unitCards.length
              ? isEn
                ? `View all ${overview.unitCount}`
                : `Ver las ${overview.unitCount}`
              : isEn
                ? "View all"
                : "Ver todas"}
          </Link>
        </div>

        {overview.unitCards.length ? (
          <div className="space-y-3">
            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-border/30">
              {/* Header */}
              <div className="flex items-center gap-0 bg-muted/20 px-4 py-2">
                <span className="w-16 text-[10px] text-muted-foreground/50 uppercase tracking-wide">
                  {isEn ? "Code" : "Código"}
                </span>
                <span className="flex-1 text-[10px] text-muted-foreground/50 uppercase tracking-wide">
                  {isEn ? "Name" : "Nombre"}
                </span>
                <span className="w-28 text-[10px] text-muted-foreground/50 uppercase tracking-wide">
                  {isEn ? "Status" : "Estado"}
                </span>
                <span className="w-24 text-[10px] text-muted-foreground/50 uppercase tracking-wide">
                  {isEn ? "Tenant" : "Inquilino"}
                </span>
                <span className="w-24 text-right text-[10px] text-muted-foreground/50 uppercase tracking-wide">
                  {isEn ? "Rent" : "Renta"}
                </span>
              </div>
              {/* Rows */}
              {overview.unitCards.map((unit, i) => {
                const unitHref =
                  unit.unitId && isUuid(unit.unitId)
                    ? `/module/units/${unit.unitId}`
                    : `/module/units?property_id=${encodeURIComponent(recordId)}`;
                return (
                  <Link
                    className={cn(
                      "flex items-center gap-0 px-4 py-3 transition-colors hover:bg-muted/10",
                      i < overview.unitCards.length - 1 &&
                        "border-border/15 border-b"
                    )}
                    href={unitHref}
                    key={unit.id}
                  >
                    <span className="w-16 font-medium text-[13px] tabular-nums">
                      {unit.label}
                    </span>
                    <span className="flex-1 truncate text-[13px] text-muted-foreground">
                      {unit.subtitle}
                    </span>
                    <span className="flex w-28 items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 font-medium text-[11px]",
                          unit.statusTone === "occupied"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : unit.statusTone === "maintenance"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}
                      >
                        {unit.statusLabel}
                      </span>
                      {unit.statusTone === "vacant" && (
                        <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                          ⚠
                        </span>
                      )}
                      {unit.openTaskCount > 0 &&
                        unit.statusTone !== "vacant" && (
                          <span className="text-[10px] text-muted-foreground/50">
                            {unit.openTaskCount}t
                          </span>
                        )}
                    </span>
                    <span className="w-24 truncate text-[13px] text-muted-foreground/60">
                      {unit.tenantName || "--"}
                    </span>
                    <span className="w-24 text-right text-[13px] text-muted-foreground tabular-nums">
                      {formatCurrency(unit.monthlyRentPyg, "PYG", locale)}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4">
              {overview.vacantUnitCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500/60" />
                  <span className="text-[11px] text-muted-foreground/50">
                    {overview.vacantUnitCount} {isEn ? "Vacant" : "Vacantes"}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                <span className="text-[11px] text-muted-foreground/50">
                  {overview.unitCount - overview.vacantUnitCount}{" "}
                  {isEn ? "Occupied" : "Ocupadas"}
                </span>
              </div>
              {overview.openTaskCount > 0 && (
                <span className="text-[11px] text-muted-foreground/40">
                  {overview.openTaskCount}{" "}
                  {isEn ? "tasks open" : "tareas abiertas"}
                </span>
              )}
            </div>

            {overview.unitCount > overview.unitCards.length ? (
              <p className="text-muted-foreground/50 text-xs">
                {isEn
                  ? `Showing ${overview.unitCards.length} of ${overview.unitCount}`
                  : `Mostrando ${overview.unitCards.length} de ${overview.unitCount}`}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-border/20 border-dashed py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "No units yet for this property."
                : "Esta propiedad aún no tiene unidades."}
            </p>
            <p className="mt-1 text-muted-foreground/50 text-xs">
              {isEn
                ? "Create your first unit to unlock leasing, maintenance, and collections."
                : "Crea la primera unidad para activar contratos, mantenimiento y cobros."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
