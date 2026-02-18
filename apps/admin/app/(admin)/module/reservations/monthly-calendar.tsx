"use client";

import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Calendar02Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ReservationRow = {
  id: string;
  status: string;
  check_in_date: string | null;
  check_out_date: string | null;
  guest_name: string | null;
  unit_id: string | null;
  unit_name: string | null;
};

type BlockRow = {
  id: string;
  starts_on: string | null;
  ends_on: string | null;
  reason: string | null;
  unit_id: string | null;
  unit_name: string | null;
};

type UnitOption = { id: string; label: string };

export type MonthlyCalendarProps = {
  reservations: Record<string, unknown>[];
  blocks: Record<string, unknown>[];
  units: UnitOption[];
  isEn: boolean;
  locale: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function asStr(v: unknown): string {
  return typeof v === "string" ? v : v ? String(v) : "";
}

function isIso(v: unknown): v is string {
  return typeof v === "string" && ISO_RE.test(v);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/* Status → color mapping */
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pending:     { bg: "bg-amber-100 dark:bg-amber-900/30",   border: "border-amber-300 dark:border-amber-700",   text: "text-amber-800 dark:text-amber-300" },
  confirmed:   { bg: "bg-indigo-100 dark:bg-indigo-900/30", border: "border-indigo-300 dark:border-indigo-700", text: "text-indigo-800 dark:text-indigo-300" },
  checked_in:  { bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-300 dark:border-emerald-700", text: "text-emerald-800 dark:text-emerald-300" },
  checked_out: { bg: "bg-slate-100 dark:bg-slate-800/40",   border: "border-slate-300 dark:border-slate-600",   text: "text-slate-600 dark:text-slate-400" },
  cancelled:   { bg: "bg-red-100 dark:bg-red-900/30",       border: "border-red-300 dark:border-red-700",       text: "text-red-700 dark:text-red-400" },
  no_show:     { bg: "bg-red-100 dark:bg-red-900/30",       border: "border-red-300 dark:border-red-700",       text: "text-red-700 dark:text-red-400" },
};

const DEFAULT_STATUS_COLOR = { bg: "bg-muted", border: "border-border", text: "text-muted-foreground" };

function statusColor(status: string) {
  return STATUS_COLORS[status.trim().toLowerCase()] ?? DEFAULT_STATUS_COLOR;
}

function humanizeStatus(status: string, isEn: boolean): string {
  const s = status.trim().toLowerCase();
  if (isEn) {
    if (s === "pending") return "Pending";
    if (s === "confirmed") return "Confirmed";
    if (s === "checked_in") return "Checked In";
    if (s === "checked_out") return "Checked Out";
    if (s === "cancelled") return "Cancelled";
    if (s === "no_show") return "No Show";
    return status;
  }
  if (s === "pending") return "Pendiente";
  if (s === "confirmed") return "Confirmada";
  if (s === "checked_in") return "Check-in";
  if (s === "checked_out") return "Check-out";
  if (s === "cancelled") return "Cancelada";
  if (s === "no_show") return "No show";
  return status;
}

/* ------------------------------------------------------------------ */
/*  Bar computation                                                    */
/* ------------------------------------------------------------------ */

type CalendarBar = {
  id: string;
  unitId: string;
  label: string;
  tooltipLabel: string;
  status: string;
  leftPercent: number;
  widthPercent: number;
  kind: "reservation" | "block";
};

function computeBars(
  reservations: ReservationRow[],
  blocks: BlockRow[],
  monthStart: string,
  monthEnd: string,
  totalDays: number,
  isEn: boolean,
): CalendarBar[] {
  const bars: CalendarBar[] = [];

  for (const r of reservations) {
    if (!(r.check_in_date && r.check_out_date && r.unit_id)) continue;
    if (r.check_out_date <= monthStart || r.check_in_date >= monthEnd) continue;

    const clampedStart = r.check_in_date < monthStart ? monthStart : r.check_in_date;
    const clampedEnd = r.check_out_date > monthEnd ? monthEnd : r.check_out_date;

    const startDay = (new Date(`${clampedStart}T00:00:00`).getTime() - new Date(`${monthStart}T00:00:00`).getTime()) / 86_400_000;
    const daySpan = (new Date(`${clampedEnd}T00:00:00`).getTime() - new Date(`${clampedStart}T00:00:00`).getTime()) / 86_400_000;

    if (daySpan <= 0) continue;

    bars.push({
      id: r.id,
      unitId: r.unit_id,
      label: r.guest_name || (isEn ? "Guest" : "Huésped"),
      tooltipLabel: `${r.guest_name || (isEn ? "Guest" : "Huésped")} — ${humanizeStatus(r.status, isEn)} — ${r.check_in_date} → ${r.check_out_date}`,
      status: r.status,
      leftPercent: (startDay / totalDays) * 100,
      widthPercent: (daySpan / totalDays) * 100,
      kind: "reservation",
    });
  }

  for (const b of blocks) {
    if (!(b.starts_on && b.ends_on && b.unit_id)) continue;
    if (b.ends_on <= monthStart || b.starts_on >= monthEnd) continue;

    const clampedStart = b.starts_on < monthStart ? monthStart : b.starts_on;
    const clampedEnd = b.ends_on > monthEnd ? monthEnd : b.ends_on;

    const startDay = (new Date(`${clampedStart}T00:00:00`).getTime() - new Date(`${monthStart}T00:00:00`).getTime()) / 86_400_000;
    const daySpan = (new Date(`${clampedEnd}T00:00:00`).getTime() - new Date(`${clampedStart}T00:00:00`).getTime()) / 86_400_000;

    if (daySpan <= 0) continue;

    bars.push({
      id: b.id,
      unitId: b.unit_id,
      label: b.reason || (isEn ? "Blocked" : "Bloqueado"),
      tooltipLabel: `${b.reason || (isEn ? "Blocked" : "Bloqueado")} — ${b.starts_on} → ${b.ends_on}`,
      status: "block",
      leftPercent: (startDay / totalDays) * 100,
      widthPercent: (daySpan / totalDays) * 100,
      kind: "block",
    });
  }

  return bars;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MonthlyCalendar({
  reservations: rawReservations,
  blocks: rawBlocks,
  units,
  isEn,
  locale,
}: MonthlyCalendarProps) {
  const [monthOffset, setMonthOffset] = useState(0);

  const todayIso = useMemo(() => toIso(new Date()), []);

  const baseDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const totalDays = daysInMonth(year, month);

  const monthDays = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return toIso(d);
    });
  }, [year, month, totalDays]);

  const monthStart = monthDays[0];
  const monthEnd = toIso(addDays(new Date(year, month, totalDays), 1));

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(baseDate);
  }, [baseDate, locale]);

  const reservations = useMemo<ReservationRow[]>(
    () =>
      (rawReservations as Record<string, unknown>[]).map((r) => ({
        id: asStr(r.id).trim(),
        status: asStr(r.status).trim(),
        check_in_date: isIso(r.check_in_date) ? r.check_in_date : null,
        check_out_date: isIso(r.check_out_date) ? r.check_out_date : null,
        guest_name: asStr(r.guest_name).trim() || null,
        unit_id: asStr(r.unit_id).trim() || null,
        unit_name: asStr(r.unit_name).trim() || null,
      })),
    [rawReservations],
  );

  const blockRows = useMemo<BlockRow[]>(
    () =>
      (rawBlocks as Record<string, unknown>[]).map((b) => ({
        id: asStr(b.id).trim(),
        starts_on: isIso(b.starts_on) ? b.starts_on : null,
        ends_on: isIso(b.ends_on) ? b.ends_on : null,
        reason: asStr(b.reason).trim() || null,
        unit_id: asStr(b.unit_id).trim() || null,
        unit_name: asStr(b.unit_name).trim() || null,
      })),
    [rawBlocks],
  );

  const visibleUnits = useMemo(() => {
    const unitMap = new Map<string, string>();
    for (const u of units) unitMap.set(u.id, u.label);
    for (const r of reservations) {
      if (r.unit_id && !unitMap.has(r.unit_id)) unitMap.set(r.unit_id, r.unit_name || r.unit_id);
    }
    for (const b of blockRows) {
      if (b.unit_id && !unitMap.has(b.unit_id)) unitMap.set(b.unit_id, b.unit_name || b.unit_id);
    }
    return Array.from(unitMap.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [units, reservations, blockRows]);

  const bars = useMemo(
    () => computeBars(reservations, blockRows, monthStart, monthEnd, totalDays, isEn),
    [reservations, blockRows, monthStart, monthEnd, totalDays, isEn],
  );

  const barsByUnit = useMemo(() => {
    const map = new Map<string, CalendarBar[]>();
    for (const bar of bars) {
      const arr = map.get(bar.unitId) ?? [];
      arr.push(bar);
      map.set(bar.unitId, arr);
    }
    return map;
  }, [bars]);

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            onClick={() => setMonthOffset((o) => o - 1)}
            size="sm"
            variant="outline"
          >
            <Icon icon={ArrowLeft02Icon} size={14} />
          </Button>
          <Button
            disabled={monthOffset === 0}
            onClick={() => setMonthOffset(0)}
            size="sm"
            variant="outline"
          >
            <Icon className="mr-1" icon={Calendar02Icon} size={14} />
            {isEn ? "This month" : "Este mes"}
          </Button>
          <Button
            onClick={() => setMonthOffset((o) => o + 1)}
            size="sm"
            variant="outline"
          >
            <Icon icon={ArrowRight02Icon} size={14} />
          </Button>
        </div>

        <span className="font-medium text-sm text-muted-foreground capitalize">
          {monthLabel}
        </span>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <div
          className="min-w-[900px]"
          style={{
            display: "grid",
            gridTemplateColumns: `minmax(140px, auto) repeat(${totalDays}, 1fr)`,
          }}
        >
          {/* Header row */}
          <div className="sticky left-0 z-10 border-b border-r border-border/40 bg-muted/50 px-3 py-2" />
          {monthDays.map((day, i) => {
            const isToday = day === todayIso;
            const date = new Date(`${day}T00:00:00`);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            return (
              <div
                className={`border-b border-border/40 px-0.5 py-1.5 text-center text-[10px] font-medium ${
                  isToday
                    ? "bg-primary/[0.06] text-primary"
                    : isWeekend
                      ? "bg-muted/70 text-muted-foreground"
                      : "bg-muted/50 text-muted-foreground"
                } ${i < totalDays - 1 ? "border-r border-border/40" : ""}`}
                key={day}
              >
                <div className="tabular-nums">{date.getDate()}</div>
              </div>
            );
          })}

          {/* Unit rows */}
          {visibleUnits.length === 0 ? (
            <div
              className="py-10 text-center text-sm text-muted-foreground"
              style={{ gridColumn: `1 / span ${totalDays + 1}` }}
            >
              {isEn ? "No units to display" : "No hay unidades para mostrar"}
            </div>
          ) : (
            visibleUnits.map((unit) => {
              const unitBars = barsByUnit.get(unit.id) ?? [];

              return (
                <div className="contents" key={unit.id}>
                  <div className="sticky left-0 z-10 flex items-center border-b border-r border-border/40 bg-background px-3 py-2">
                    <span className="truncate text-xs font-medium">
                      {unit.label}
                    </span>
                  </div>

                  <div
                    className="relative border-b border-border/40"
                    style={{
                      gridColumn: `2 / span ${totalDays}`,
                      minHeight: 44,
                    }}
                  >
                    {/* Day column borders + today/weekend highlight */}
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${totalDays}, 1fr)`,
                      }}
                    >
                      {monthDays.map((day, i) => {
                        const date = new Date(`${day}T00:00:00`);
                        const dayOfWeek = date.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        return (
                          <div
                            className={`${
                              day === todayIso
                                ? "bg-primary/[0.03]"
                                : isWeekend
                                  ? "bg-muted/30"
                                  : ""
                            } ${i < totalDays - 1 ? "border-r border-border/40" : ""}`}
                            key={day}
                          />
                        );
                      })}
                    </div>

                    {/* Bars */}
                    {unitBars.map((bar) =>
                      bar.kind === "reservation" ? (
                        <Tooltip key={bar.id}>
                          <TooltipTrigger asChild>
                            <Link
                              className={`absolute top-1 flex h-[calc(100%-8px)] items-center overflow-hidden rounded-md border px-1 text-[10px] font-medium leading-tight transition-opacity hover:opacity-80 ${statusColor(bar.status).bg} ${statusColor(bar.status).border} ${statusColor(bar.status).text}`}
                              href={`/module/reservations/${bar.id}`}
                              style={{
                                left: `${bar.leftPercent}%`,
                                width: `${bar.widthPercent}%`,
                              }}
                            >
                              <span className="truncate">
                                {bar.widthPercent > 8 ? bar.label : ""}
                              </span>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            <span className="text-xs">{bar.tooltipLabel}</span>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip key={bar.id}>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute top-1 flex h-[calc(100%-8px)] items-center overflow-hidden rounded-md border border-dashed border-muted-foreground/30 bg-muted/60 px-1 text-[10px] font-medium leading-tight text-muted-foreground"
                              style={{
                                left: `${bar.leftPercent}%`,
                                width: `${bar.widthPercent}%`,
                                backgroundImage:
                                  "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)",
                              }}
                            >
                              <span className="truncate">
                                {bar.widthPercent > 8 ? bar.label : ""}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            <span className="text-xs">{bar.tooltipLabel}</span>
                          </TooltipContent>
                        </Tooltip>
                      ),
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {Object.entries(STATUS_COLORS).map(([key, colors]) => (
          <div className="flex items-center gap-1.5" key={key}>
            <span
              className={`inline-block h-2.5 w-2.5 rounded-sm border ${colors.bg} ${colors.border}`}
            />
            {humanizeStatus(key, isEn)}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-muted-foreground/30 bg-muted/60"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
            }}
          />
          {isEn ? "Block" : "Bloqueo"}
        </div>
      </div>
    </div>
  );
}
