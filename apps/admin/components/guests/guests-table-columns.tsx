"use client";

import {
  CalendarCheckIn01Icon,
  NoteEditIcon,
} from "@hugeicons/core-free-icons";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import type { DataTableRow } from "@/components/ui/data-table";
import { HoverLink } from "@/components/ui/hover-link";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";

import { type GuestCrmRow, asDateLabel, initials } from "./guests-crm-types";

export function buildGuestColumns(
  locale: string,
  t: (en: string, es: string) => string
): ColumnDef<DataTableRow>[] {
  return [
    {
      id: "guest",
      header: t("Guest", "Huésped"),
      accessorFn: (row) => {
        const fn = (row as GuestCrmRow).full_name;
        if (fn != null) return String(fn);
        return "";
      },
      cell: ({ row }) => {
        const guest = row.original as GuestCrmRow;
        const href = `/module/guests/${guest.id}`;
        const guestEmailVal = guest.email != null ? guest.email.trim() : "";
        const guestPhoneVal = guest.phone_e164 != null ? guest.phone_e164.trim() : "";
        let contact: string;
        if (guestEmailVal) {
          contact = guestEmailVal;
        } else if (guestPhoneVal) {
          contact = guestPhoneVal;
        } else {
          contact = t("No contact", "Sin contacto");
        }

        return (
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/20 font-semibold text-primary">
                {initials(guest.full_name)}
              </div>
              <div className="min-w-0">
                <HoverLink
                  className="block max-w-[22rem] truncate font-medium text-foreground underline-offset-4 hover:underline"
                  description={t(
                    "Open guest CRM profile.",
                    "Abrir el perfil CRM del huésped."
                  )}
                  href={href}
                  id={guest.id}
                  label={guest.full_name}
                  meta={t("Guest", "Huésped")}
                  prefetch={false}
                >
                  {guest.full_name}
                </HoverLink>
                <p className="max-w-[22rem] truncate text-muted-foreground text-xs">
                  {contact}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {guest.next_stay_start ? (
                    <Badge className="gap-1" variant="secondary">
                      <Icon icon={CalendarCheckIn01Icon} size={14} />
                      {t("Upcoming", "Próxima")}
                    </Badge>
                  ) : null}
                  {guest.reservation_count > 1 ? (
                    <Badge variant="outline">
                      {t("Returning", "Recurrente")}
                    </Badge>
                  ) : null}
                  {(() => {
                    let gn: string;
                    if (guest.notes != null) { gn = guest.notes; } else { gn = ""; }
                    if (!gn.trim()) return null;
                    return (
                      <Badge className="gap-1" variant="outline">
                        <Icon icon={NoteEditIcon} size={14} />
                        {t("Notes", "Notas")}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "stays",
      header: t("Stays", "Estancias"),
      accessorFn: (row) => (row as GuestCrmRow).reservation_count,
      cell: ({ row }) => {
        const guest = row.original as GuestCrmRow;
        return (
          <span className="inline-flex items-center rounded-full border bg-background/60 px-2 py-1 font-mono text-[11px]">
            {guest.reservation_count}
          </span>
        );
      },
    },
    {
      id: "next",
      header: t("Next stay", "Próxima estancia"),
      accessorFn: (row) => {
        const val = (row as GuestCrmRow).next_stay_start;
        if (val != null) return val;
        return "";
      },
      cell: ({ row }) => {
        const guest = row.original as GuestCrmRow;
        const label = asDateLabel(locale, guest.next_stay_start);
        const titleVal = guest.next_stay_start != null ? guest.next_stay_start : undefined;
        return label ? (
          <span title={titleVal}>{label}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: "last",
      header: t("Last stay", "Última estancia"),
      accessorFn: (row) => {
        const val = (row as GuestCrmRow).last_stay_end;
        if (val != null) return val;
        return "";
      },
      cell: ({ row }) => {
        const guest = row.original as GuestCrmRow;
        const label = asDateLabel(locale, guest.last_stay_end);
        const titleVal = guest.last_stay_end != null ? guest.last_stay_end : undefined;
        return label ? (
          <span title={titleVal}>{label}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: "value",
      header: "LTV",
      accessorFn: (row) => (row as GuestCrmRow).lifetime_value,
      cell: ({ row }) => {
        const guest = row.original as GuestCrmRow;
        return (
          <span className="tabular-nums">
            {formatCurrency(guest.lifetime_value, "PYG", locale)}
          </span>
        );
      },
    },
    {
      id: "verification",
      header: t("Verified", "Verificado"),
      accessorFn: (row) => {
        const val = (row as GuestCrmRow).verification_status;
        if (val != null) return val;
        return "";
      },
      cell: ({ row }) => {
        const guest = row.original as GuestCrmRow;
        const status = guest.verification_status;
        if (!status)
          return <span className="text-muted-foreground">{"\u2014"}</span>;
        return (
          <StatusBadge
            value={status}
            tone={
              status === "verified"
                ? "success"
                : status === "pending"
                  ? "warning"
                  : status === "rejected"
                    ? "danger"
                    : "neutral"
            }
          />
        );
      },
    },
  ];
}
