"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  PRESET_VIEWS_ES,
  type ReservationSavedView,
} from "@/lib/features/reservations/saved-views";

export function ReservationsToolbar({
  activeViewId,
  isEn,
  onApplySavedView,
  savedViews,
}: {
  activeViewId: string;
  isEn: boolean;
  onApplySavedView: (view: ReservationSavedView) => void;
  savedViews: ReservationSavedView[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-1.5">
        {savedViews.map((view) => (
          <Button
            key={view.id}
            onClick={() => onApplySavedView(view)}
            size="sm"
            variant={activeViewId === view.id ? "secondary" : "ghost"}
          >
            {!isEn && view.preset
              ? (PRESET_VIEWS_ES[view.id] ?? view.name)
              : view.name}
          </Button>
        ))}
      </div>

      <Link
        className={buttonVariants({ variant: "outline", size: "sm" })}
        href="/module/calendar"
      >
        <Icon icon={Calendar03Icon} size={14} />
        {isEn ? "Calendar" : "Calendario"}
      </Link>
    </div>
  );
}
