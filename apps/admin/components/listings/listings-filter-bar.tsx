"use client";

import {
  Bookmark01Icon,
  Cancel01Icon,
  FilterIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  type SavedView,
  PRESET_VIEWS,
  PRESET_VIEWS_ES,
  getCustomViews,
  saveCustomView,
  deleteCustomView,
} from "@/lib/features/listings/saved-views";
import { cn } from "@/lib/utils";

export type ListingStatusFilter = "all" | "published" | "draft";
export type ListingReadinessFilter =
  | "all"
  | "ready"
  | "incomplete"
  | "not_ready";

type ListingsFilterBarProps = {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  statusFilter: ListingStatusFilter;
  onStatusFilterChange: (value: ListingStatusFilter) => void;
  readinessFilter: ListingReadinessFilter;
  onReadinessFilterChange: (value: ListingReadinessFilter) => void;
  isEn: boolean;
  activeViewId?: string | null;
  onApplyView?: (view: SavedView) => void;
  sorting?: { id: string; desc: boolean }[];
};

export function ListingsFilterBar({
  globalFilter,
  onGlobalFilterChange,
  statusFilter,
  onStatusFilterChange,
  readinessFilter,
  onReadinessFilterChange,
  isEn,
  activeViewId,
  onApplyView,
  sorting,
}: ListingsFilterBarProps) {
  const [inputValue, setInputValue] = useState(globalFilter);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customViews, setCustomViews] = useState<SavedView[]>(() =>
    getCustomViews()
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onGlobalFilterChange(inputValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, onGlobalFilterChange]);

  // Sync external changes (e.g. reset)
  useEffect(() => {
    setInputValue(globalFilter);
  }, [globalFilter]);

  const activeCount =
    (statusFilter !== "all" ? 1 : 0) + (readinessFilter !== "all" ? 1 : 0);

  const allViews = [...PRESET_VIEWS, ...customViews];

  function handleSaveView() {
    const name = prompt(isEn ? "View name:" : "Nombre de la vista:");
    if (!name?.trim()) return;
    const view = saveCustomView({
      name: name.trim(),
      globalFilter,
      statusFilter,
      readinessFilter,
      sorting: sorting ?? [{ id: "created_at", desc: true }],
    });
    setCustomViews((prev) => [...prev, view]);
    onApplyView?.(view);
  }

  function handleDeleteView(id: string) {
    deleteCustomView(id);
    setCustomViews((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <div className="space-y-2">
      {onApplyView ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {allViews.map((view) => (
            <div className="group relative" key={view.id}>
              <button
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activeViewId === view.id
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/50 bg-background/80 text-muted-foreground hover:bg-muted"
                )}
                onClick={() => onApplyView(view)}
                type="button"
              >
                {view.preset
                  ? isEn
                    ? view.name
                    : PRESET_VIEWS_ES[view.id] ?? view.name
                  : view.name}
              </button>
              {!view.preset ? (
                <button
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteView(view.id);
                  }}
                  type="button"
                >
                  <Icon icon={Cancel01Icon} size={8} />
                </button>
              ) : null}
            </div>
          ))}
          <button
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/50 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
            onClick={handleSaveView}
            type="button"
          >
            <Icon icon={Bookmark01Icon} size={11} />
            {isEn ? "Save view" : "Guardar vista"}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/40 bg-card/30 p-2 shadow-sm backdrop-blur-sm">
        <div className="relative min-w-[14rem] flex-1">
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            icon={Search01Icon}
            size={15}
          />
          <Input
            className="h-10 rounded-xl border-border/50 bg-background/80 pl-10 focus-visible:ring-primary/20"
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              isEn
                ? "Search by title, city, property..."
                : "Buscar por título, ciudad, propiedad..."
            }
            value={inputValue}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              className="h-10 gap-2 rounded-xl border-border/60 font-semibold text-muted-foreground hover:bg-muted"
              size="sm"
              variant="outline"
            >
              <Icon icon={FilterIcon} size={15} />
              {isEn ? "Filters" : "Filtros"}
              {activeCount > 0 ? (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary font-bold text-[10px] text-primary-foreground">
                  {activeCount}
                </div>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem] rounded-xl">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
              {isEn ? "Status" : "Estado"}
            </DropdownMenuLabel>
            <DropdownMenuItem
              className={cn("m-1 rounded-lg", statusFilter === "all" && "bg-muted")}
              onClick={() => onStatusFilterChange("all")}
            >
              {isEn ? "All statuses" : "Todos los estados"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn(
                "m-1 rounded-lg",
                statusFilter === "published" && "bg-muted"
              )}
              onClick={() => onStatusFilterChange("published")}
            >
              {isEn ? "Published" : "Publicados"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn(
                "m-1 rounded-lg",
                statusFilter === "draft" && "bg-muted"
              )}
              onClick={() => onStatusFilterChange("draft")}
            >
              {isEn ? "Draft" : "Borrador"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
              {isEn ? "Readiness" : "Preparación"}
            </DropdownMenuLabel>
            <DropdownMenuItem
              className={cn(
                "m-1 rounded-lg",
                readinessFilter === "all" && "bg-muted"
              )}
              onClick={() => onReadinessFilterChange("all")}
            >
              {isEn ? "All" : "Todos"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn(
                "m-1 rounded-lg",
                readinessFilter === "ready" && "bg-muted"
              )}
              onClick={() => onReadinessFilterChange("ready")}
            >
              {isEn ? "Ready" : "Listo"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn(
                "m-1 rounded-lg",
                readinessFilter === "incomplete" && "bg-muted"
              )}
              onClick={() => onReadinessFilterChange("incomplete")}
            >
              {isEn ? "Incomplete" : "Incompleto"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn(
                "m-1 rounded-lg",
                readinessFilter === "not_ready" && "bg-muted"
              )}
              onClick={() => onReadinessFilterChange("not_ready")}
            >
              {isEn ? "Not ready" : "No listo"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
