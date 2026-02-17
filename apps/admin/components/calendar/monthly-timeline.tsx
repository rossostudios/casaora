"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimelineUnit = {
  id: string;
  label: string;
};

type TimelineEvent = {
  id: string;
  unitId: string;
  startDate: string;
  endDate: string;
  label: string;
  type: "reservation" | "block";
  status?: string | null;
};

type MonthlyTimelineProps = {
  units: TimelineUnit[];
  events: TimelineEvent[];
  locale: string;
  isEn: boolean;
  onClickDay?: (unitId: string, date: string) => void;
};

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatMonthYear(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function eventColor(type: "reservation" | "block", status?: string | null): string {
  if (type === "block") return "bg-gray-400/60 dark:bg-gray-600/60";
  switch (status) {
    case "confirmed":
      return "bg-blue-500/70 dark:bg-blue-600/70";
    case "checked_in":
      return "bg-green-500/70 dark:bg-green-600/70";
    case "checked_out":
      return "bg-slate-400/60 dark:bg-slate-500/60";
    case "cancelled":
      return "bg-red-300/60 dark:bg-red-700/40";
    case "pending":
      return "bg-yellow-400/60 dark:bg-yellow-600/50";
    default:
      return "bg-blue-400/60 dark:bg-blue-500/60";
  }
}

export function MonthlyTimeline({
  units,
  events,
  locale,
  isEn,
  onClickDay,
}: MonthlyTimelineProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysCount = getDaysInMonth(year, month);
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const todayIso = today.toISOString().slice(0, 10);

  const eventsByUnit = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const unit of units) {
      map.set(unit.id, []);
    }
    for (const event of events) {
      const list = map.get(event.unitId);
      if (list) list.push(event);
    }
    return map;
  }, [units, events]);

  function prevMonth() {
    setViewDate((d) => addMonths(d, -1));
  }

  function nextMonth() {
    setViewDate((d) => addMonths(d, 1));
  }

  function goToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button onClick={prevMonth} size="sm" type="button" variant="outline">
            &larr;
          </Button>
          <Button onClick={goToday} size="sm" type="button" variant="ghost">
            {isEn ? "Today" : "Hoy"}
          </Button>
          <Button onClick={nextMonth} size="sm" type="button" variant="outline">
            &rarr;
          </Button>
        </div>
        <h3 className="text-lg font-semibold capitalize">
          {formatMonthYear(viewDate, locale)}
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-blue-500/70" />
            {isEn ? "Reservation" : "Reserva"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-gray-400/60" />
            {isEn ? "Block" : "Bloqueo"}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <div
          className="grid min-w-[900px]"
          style={{
            gridTemplateColumns: `180px repeat(${daysCount}, minmax(28px, 1fr))`,
          }}
        >
          {/* Header row: day numbers */}
          <div className="sticky left-0 z-10 border-b border-r bg-muted/50 px-2 py-1.5 font-medium text-muted-foreground text-xs">
            {isEn ? "Unit" : "Unidad"}
          </div>
          {days.map((day) => {
            const iso = toIsoDate(year, month, day);
            const isToday = iso === todayIso;
            const dayOfWeek = new Date(year, month, day).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <div
                className={cn(
                  "border-b px-0.5 py-1.5 text-center text-[10px] font-medium",
                  isToday
                    ? "bg-primary/10 font-bold text-primary"
                    : isWeekend
                      ? "bg-muted/30 text-muted-foreground"
                      : "text-muted-foreground"
                )}
                key={day}
              >
                {day}
              </div>
            );
          })}

          {/* Unit rows */}
          {units.map((unit) => {
            const unitEvents = eventsByUnit.get(unit.id) ?? [];

            return (
              <TimelineRow
                daysCount={daysCount}
                events={unitEvents}
                isEn={isEn}
                key={unit.id}
                month={month}
                onClickDay={onClickDay}
                todayIso={todayIso}
                unit={unit}
                year={year}
              />
            );
          })}

          {units.length === 0 ? (
            <div
              className="col-span-full px-4 py-8 text-center text-muted-foreground text-sm"
            >
              {isEn
                ? "No units found. Add units to see the timeline."
                : "No se encontraron unidades. Agrega unidades para ver la línea de tiempo."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TimelineRow({
  unit,
  events,
  year,
  month,
  daysCount,
  todayIso,
  isEn,
  onClickDay,
}: {
  unit: TimelineUnit;
  events: TimelineEvent[];
  year: number;
  month: number;
  daysCount: number;
  todayIso: string;
  isEn: boolean;
  onClickDay?: (unitId: string, date: string) => void;
}) {
  const monthStart = toIsoDate(year, month, 1);
  const monthEnd = toIsoDate(year, month, daysCount);

  const visibleEvents = useMemo(() => {
    return events.filter(
      (e) => e.startDate <= monthEnd && e.endDate >= monthStart
    );
  }, [events, monthStart, monthEnd]);

  const days = Array.from({ length: daysCount }, (_, i) => i + 1);

  // Build a lookup: day → events active on that day
  const dayEventMap = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>();
    for (let d = 1; d <= daysCount; d++) {
      map.set(d, []);
    }
    for (const event of visibleEvents) {
      for (let d = 1; d <= daysCount; d++) {
        const iso = toIsoDate(year, month, d);
        if (iso >= event.startDate && iso <= event.endDate) {
          map.get(d)!.push(event);
        }
      }
    }
    return map;
  }, [visibleEvents, daysCount, year, month]);

  return (
    <>
      <div className="sticky left-0 z-10 flex items-center border-b border-r bg-background px-2 py-1 text-sm">
        <span className="truncate" title={unit.label}>
          {unit.label}
        </span>
      </div>
      {days.map((day) => {
        const iso = toIsoDate(year, month, day);
        const isToday = iso === todayIso;
        const dayOfWeek = new Date(year, month, day).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayEvents = dayEventMap.get(day) ?? [];

        return (
          <button
            className={cn(
              "relative h-8 border-b border-r transition-colors hover:bg-muted/40",
              isToday && "bg-primary/5",
              isWeekend && !isToday && "bg-muted/20"
            )}
            key={day}
            onClick={() => onClickDay?.(unit.id, iso)}
            title={
              dayEvents.length > 0
                ? dayEvents.map((e) => e.label).join(", ")
                : iso
            }
            type="button"
          >
            {dayEvents.map((event) => {
              // Check if this is the first day of the event in this month
              const eventStartInMonth = Math.max(
                1,
                event.startDate >= monthStart
                  ? Number(event.startDate.slice(8, 10))
                  : 1
              );
              const isStart = day === eventStartInMonth;

              return (
                <span
                  className={cn(
                    "absolute inset-x-0 top-1 bottom-1",
                    eventColor(event.type, event.status),
                    isStart && "rounded-l-sm",
                    day ===
                      Math.min(
                        daysCount,
                        Number(event.endDate.slice(8, 10)) ||
                          daysCount
                      ) && "rounded-r-sm"
                  )}
                  key={event.id}
                >
                  {isStart ? (
                    <span className="absolute left-0.5 top-0 truncate text-[9px] font-medium leading-snug text-white drop-shadow-sm">
                      {event.label}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </button>
        );
      })}
    </>
  );
}
