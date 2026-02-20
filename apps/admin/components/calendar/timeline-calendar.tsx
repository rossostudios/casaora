"use client";

import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Calendar02Icon,
} from "@hugeicons/core-free-icons";
import { useHotkey } from "@tanstack/react-hotkeys";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isInputFocused } from "@/lib/hotkeys/is-input-focused";

import {
  addDays,
  buildVisibleUnits,
  type CalendarBar,
  computeBars,
  daysInMonth,
  getMonday,
  humanizeStatus,
  normalizeBlocks,
  normalizeReservations,
  STATUS_COLORS,
  shortDate,
  statusColor,
  toIso,
  type UnitOption,
} from "./calendar-shared";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type TimelineCalendarProps = {
  reservations: Record<string, unknown>[];
  blocks: Record<string, unknown>[];
  units: UnitOption[];
  isEn: boolean;
  locale: string;
  mode: "week" | "month";
  onClickDay?: (unitId: string, date: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Day name helpers                                                   */
/* ------------------------------------------------------------------ */

const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TimelineCalendar({
  reservations: rawReservations,
  blocks: rawBlocks,
  units,
  isEn,
  locale,
  mode,
  onClickDay,
}: TimelineCalendarProps) {
  const [offset, setOffset] = useState(0);

  const todayIso = useMemo(() => toIso(new Date()), []);

  /* ----- Window computation ----- */

  const isWeek = mode === "week";

  const baseDate = useMemo(() => {
    if (isWeek) {
      const base = getMonday(new Date());
      return addDays(base, offset * 7);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  }, [offset, isWeek]);

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const totalDays = isWeek ? 7 : daysInMonth(year, month);

  const windowDays = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const d = isWeek ? addDays(baseDate, i) : new Date(year, month, i + 1);
      return toIso(d);
    });
  }, [baseDate, totalDays, isWeek, year, month]);

  const windowStart = windowDays[0];
  const windowEnd = isWeek
    ? toIso(addDays(baseDate, 7))
    : toIso(addDays(new Date(year, month, totalDays), 1));

  /* ----- Navigation label ----- */

  const navLabel = useMemo(() => {
    if (isWeek) {
      return `${shortDate(windowDays[0], locale)} – ${shortDate(windowDays[6], locale)}`;
    }
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(baseDate);
  }, [baseDate, locale, isWeek, windowDays]);

  const dayNames = isWeek ? (isEn ? DAY_NAMES_EN : DAY_NAMES_ES) : null;

  /* ----- Normalize data ----- */

  const reservations = useMemo(
    () => normalizeReservations(rawReservations),
    [rawReservations]
  );

  const blockRows = useMemo(() => normalizeBlocks(rawBlocks), [rawBlocks]);

  const visibleUnits = useMemo(
    () => buildVisibleUnits(units, reservations, blockRows),
    [units, reservations, blockRows]
  );

  /* ----- Compute bars ----- */

  const bars = useMemo(
    () =>
      computeBars(
        reservations,
        blockRows,
        windowStart,
        windowEnd,
        totalDays,
        isEn
      ),
    [reservations, blockRows, windowStart, windowEnd, totalDays, isEn]
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

  /* ----- Keyboard navigation ----- */

  const goNext = useCallback(() => setOffset((o) => o + 1), []);
  const goPrev = useCallback(() => setOffset((o) => o - 1), []);

  useHotkey("J", (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    goNext();
  });

  useHotkey("K", (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    goPrev();
  });

  /* ----- Grid sizing ----- */

  const minWidth = isWeek ? "700px" : "900px";
  const gridCols = `minmax(140px, auto) repeat(${totalDays}, 1fr)`;

  return (
    <div className="space-y-3">
      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button onClick={goPrev} size="sm" variant="outline">
            <Icon icon={ArrowLeft02Icon} size={14} />
          </Button>
          <Button
            disabled={offset === 0}
            onClick={() => setOffset(0)}
            size="sm"
            variant="outline"
          >
            <Icon className="mr-1" icon={Calendar02Icon} size={14} />
            {isWeek
              ? isEn
                ? "This week"
                : "Esta semana"
              : isEn
                ? "This month"
                : "Este mes"}
          </Button>
          <Button onClick={goNext} size="sm" variant="outline">
            <Icon icon={ArrowRight02Icon} size={14} />
          </Button>
        </div>

        <span
          className={`font-medium text-muted-foreground text-sm ${isWeek ? "" : "capitalize"}`}
        >
          {navLabel}
        </span>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <div
          className={`min-w-[${minWidth}]`}
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            minWidth,
          }}
        >
          {/* Header row */}
          <div className="sticky left-0 z-10 border-border/40 border-r border-b bg-muted/50 px-3 py-2" />
          {windowDays.map((day, i) => {
            const isToday = day === todayIso;
            const date = new Date(`${day}T00:00:00`);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            return (
              <div
                className={`border-border/40 border-b px-0.5 py-1.5 text-center font-medium text-[10px] ${
                  isToday
                    ? "bg-primary/[0.06] text-primary"
                    : isWeekend
                      ? "bg-muted/70 text-muted-foreground"
                      : "bg-muted/50 text-muted-foreground"
                } ${i < totalDays - 1 ? "border-border/40 border-r" : ""}`}
                key={day}
              >
                {isWeek && dayNames ? (
                  <>
                    <div>{dayNames[i]}</div>
                    <div className="text-[11px] tabular-nums">
                      {date.getDate()}
                    </div>
                  </>
                ) : (
                  <div className="tabular-nums">{date.getDate()}</div>
                )}
              </div>
            );
          })}

          {/* Unit rows */}
          {visibleUnits.length === 0 ? (
            <div
              className="py-10 text-center text-muted-foreground text-sm"
              style={{ gridColumn: `1 / span ${totalDays + 1}` }}
            >
              {isEn ? "No units to display" : "No hay unidades para mostrar"}
            </div>
          ) : (
            visibleUnits.map((unit) => {
              const unitBars = barsByUnit.get(unit.id) ?? [];

              return (
                <div className="contents" key={unit.id}>
                  <div className="sticky left-0 z-10 flex items-center border-border/40 border-r border-b bg-background px-3 py-2">
                    <span className="truncate font-medium text-xs">
                      {unit.label}
                    </span>
                  </div>

                  <div
                    className="relative border-border/40 border-b"
                    style={{
                      gridColumn: `2 / span ${totalDays}`,
                      minHeight: isWeek ? 48 : 44,
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
                      {windowDays.map((day, i) => {
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
                            } ${i < totalDays - 1 ? "border-border/40 border-r" : ""}`}
                            key={day}
                          />
                        );
                      })}
                    </div>

                    {/* Clickable day overlay */}
                    {onClickDay ? (
                      <div
                        className="absolute inset-0 z-[1]"
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${totalDays}, 1fr)`,
                        }}
                      >
                        {windowDays.map((day) => (
                          <button
                            className="h-full w-full transition-colors hover:bg-primary/[0.04]"
                            key={day}
                            onClick={() => onClickDay(unit.id, day)}
                            title={day}
                            type="button"
                          />
                        ))}
                      </div>
                    ) : null}

                    {/* Bars */}
                    {unitBars.map((bar) =>
                      bar.kind === "reservation" ? (
                        <Tooltip key={bar.id}>
                          <TooltipTrigger asChild>
                            <Link
                              className={`absolute top-1 z-[2] flex h-[calc(100%-8px)] items-center overflow-hidden rounded-md border px-1 font-medium text-[10px] leading-tight transition-opacity hover:opacity-80 ${statusColor(bar.status).bg} ${statusColor(bar.status).border} ${statusColor(bar.status).text}`}
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
                              className="absolute top-1 z-[2] flex h-[calc(100%-8px)] items-center overflow-hidden rounded-md border border-muted-foreground/30 border-dashed bg-muted/60 px-1 font-medium text-[10px] text-muted-foreground leading-tight"
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
                      )
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
            className="inline-block h-2.5 w-2.5 rounded-sm border border-muted-foreground/30 border-dashed bg-muted/60"
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
