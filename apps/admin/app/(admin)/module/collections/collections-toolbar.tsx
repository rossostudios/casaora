"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function CollectionsToolbar({
  rowCount,
  viewMode,
  onViewModeChange,
  onExportCsv,
  onNewCollection,
  isEn,
}: {
  rowCount: number;
  viewMode: "list" | "aging";
  onViewModeChange: (mode: "list" | "aging") => void;
  onExportCsv: () => void;
  onNewCollection: () => void;
  isEn: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <p className="text-muted-foreground text-sm">
          {rowCount} {isEn ? "collections" : "cobros"}
        </p>
        <div className="flex rounded-md border">
          <button
            className={cn(
              "px-3 py-1 font-medium text-xs transition-colors",
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => onViewModeChange("list")}
            type="button"
          >
            {isEn ? "List" : "Lista"}
          </button>
          <button
            className={cn(
              "px-3 py-1 font-medium text-xs transition-colors",
              viewMode === "aging"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => onViewModeChange("aging")}
            type="button"
          >
            {isEn ? "Aging" : "Antigüedad"}
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onExportCsv} type="button" variant="outline">
          {isEn ? "Export CSV" : "Exportar CSV"}
        </Button>
        <Button onClick={onNewCollection} type="button">
          <Icon icon={PlusSignIcon} size={16} />
          {isEn ? "New collection" : "Nuevo cobro"}
        </Button>
      </div>
    </div>
  );
}
