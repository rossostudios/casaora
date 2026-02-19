"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import type { Segment } from "./guests-crm-types";

function SegmentButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "bg-background/60 text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="font-medium">{label}</span>
      <span className="rounded-full bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
        {count}
      </span>
    </button>
  );
}

export type SegmentCounts = {
  all: number;
  upcoming: number;
  returning: number;
  no_contact: number;
  notes: number;
};

export function GuestsSegments({
  segment,
  counts,
  onSegmentChange,
  onCreateClick,
  t,
}: {
  segment: Segment;
  counts: SegmentCounts;
  onSegmentChange: (s: Segment) => void;
  onCreateClick: () => void;
  t: (en: string, es: string) => string;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentButton
          active={segment === "all"}
          count={counts.all}
          label={t("All", "Todos")}
          onClick={() => onSegmentChange("all")}
        />
        <SegmentButton
          active={segment === "upcoming"}
          count={counts.upcoming}
          label={t("Upcoming", "Próximos")}
          onClick={() => onSegmentChange("upcoming")}
        />
        <SegmentButton
          active={segment === "returning"}
          count={counts.returning}
          label={t("Returning", "Recurrentes")}
          onClick={() => onSegmentChange("returning")}
        />
        <SegmentButton
          active={segment === "notes"}
          count={counts.notes}
          label={t("Notes", "Notas")}
          onClick={() => onSegmentChange("notes")}
        />
        <SegmentButton
          active={segment === "no_contact"}
          count={counts.no_contact}
          label={t("No contact", "Sin contacto")}
          onClick={() => onSegmentChange("no_contact")}
        />
      </div>

      <Button
        className="gap-2"
        onClick={onCreateClick}
        type="button"
        variant="secondary"
      >
        <Icon icon={Add01Icon} size={16} />
        {t("New guest", "Nuevo huésped")}
      </Button>
    </div>
  );
}
