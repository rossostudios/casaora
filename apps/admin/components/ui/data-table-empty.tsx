"use client";

import { FileSearchIcon, InboxIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

import type { EmptyStateConfig } from "./data-table-types";

export function DataTableEmpty({
  dataLength,
  emptyStateConfig,
  rowHrefBase,
  active,
  reset,
  isEn,
}: {
  dataLength: number;
  emptyStateConfig?: EmptyStateConfig;
  rowHrefBase?: string;
  active: boolean;
  reset: () => void;
  isEn: boolean;
}) {
  if (dataLength === 0) {
    return (
      <EmptyState
        action={
          emptyStateConfig ? (
            <>
              {emptyStateConfig.actionLabel && emptyStateConfig.actionHref ? (
                <Link
                  className={cn(
                    buttonVariants({
                      variant: "default",
                      size: "sm",
                    })
                  )}
                  href={emptyStateConfig.actionHref}
                >
                  {emptyStateConfig.actionLabel}
                </Link>
              ) : null}
              {emptyStateConfig.secondaryActions?.map((sa) => (
                <Link
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })
                  )}
                  href={sa.href}
                  key={sa.href}
                >
                  {sa.label}
                </Link>
              ))}
            </>
          ) : rowHrefBase &&
            ["organizations", "properties", "units", "integrations"].includes(
              String(rowHrefBase.split("/").filter(Boolean).pop())
            ) ? (
            <Link
              className={cn(
                buttonVariants({
                  variant: "outline",
                  size: "sm",
                })
              )}
              href="/setup"
            >
              {isEn ? "Open onboarding" : "Abrir onboarding"}
            </Link>
          ) : null
        }
        className="py-14"
        description={
          emptyStateConfig?.description ??
          (isEn
            ? "As you add data (onboarding, operations, or channels), it will show up here."
            : "Cuando agregues datos (onboarding, operaciones o canales), aparecerán aquí.")
        }
        icon={emptyStateConfig?.icon ?? InboxIcon}
        title={
          emptyStateConfig?.title ?? (isEn ? "No records" : "Sin registros")
        }
      />
    );
  }

  return (
    <EmptyState
      action={
        active ? (
          <Button onClick={reset} size="sm" type="button" variant="outline">
            {isEn ? "Reset table" : "Reiniciar tabla"}
          </Button>
        ) : null
      }
      className="py-14"
      description={
        active
          ? isEn
            ? "Try clearing filters or showing hidden columns."
            : "Prueba limpiar filtros o mostrar columnas ocultas."
          : isEn
            ? "There are no rows to show."
            : "No hay filas para mostrar."
      }
      icon={FileSearchIcon}
      title={isEn ? "No results" : "Sin resultados"}
    />
  );
}
