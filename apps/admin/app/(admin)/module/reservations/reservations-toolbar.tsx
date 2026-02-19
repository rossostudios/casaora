"use client";

import {
  Calendar02Icon,
  Calendar03Icon,
  LeftToRightListBulletIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  type ReservationSavedView,
  PRESET_VIEWS_ES,
} from "@/lib/features/reservations/saved-views";

export function ReservationsToolbar({
  activeViewId,
  isEn,
  onApplySavedView,
  onSetViewMode,
  savedViews,
  viewMode,
}: {
  activeViewId: string;
  isEn: boolean;
  onApplySavedView: (view: ReservationSavedView) => void;
  onSetViewMode: (mode: "list" | "calendar" | "month") => void;
  savedViews: ReservationSavedView[];
  viewMode: "list" | "calendar" | "month";
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
              ? PRESET_VIEWS_ES[view.id] ?? view.name
              : view.name}
          </Button>
        ))}
      </div>

      <div className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-background/40 p-1">
        <Button
          className="h-8 w-8 rounded-lg p-0 transition-all"
          onClick={() => onSetViewMode("list")}
          size="sm"
          variant={viewMode === "list" ? "secondary" : "ghost"}
        >
          <Icon icon={LeftToRightListBulletIcon} size={14} />
        </Button>
        <Button
          className="h-8 w-8 rounded-lg p-0 transition-all"
          onClick={() => onSetViewMode("calendar")}
          size="sm"
          variant={viewMode === "calendar" ? "secondary" : "ghost"}
        >
          <Icon icon={Calendar02Icon} size={14} />
        </Button>
        <Button
          className="h-8 w-8 rounded-lg p-0 transition-all"
          onClick={() => onSetViewMode("month")}
          size="sm"
          variant={viewMode === "month" ? "secondary" : "ghost"}
        >
          <Icon icon={Calendar03Icon} size={14} />
        </Button>
      </div>
    </div>
  );
}
