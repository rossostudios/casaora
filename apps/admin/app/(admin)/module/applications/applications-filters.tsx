"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

import { buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function ApplicationsFilters({
  isEn,
  statusFilter,
  setStatusFilter,
  assigneeFilter,
  setAssigneeFilter,
  slaFilter,
  setSlaFilter,
  qualificationFilter,
  setQualificationFilter,
  statusFilterOptions,
  assigneeFilterOptions,
  slaFilterOptions,
  qualificationFilterOptions,
}: {
  isEn: boolean;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (value: string) => void;
  slaFilter: string;
  setSlaFilter: (value: string) => void;
  qualificationFilter: string;
  setQualificationFilter: (value: string) => void;
  statusFilterOptions: ComboboxOption[];
  assigneeFilterOptions: ComboboxOption[];
  slaFilterOptions: ComboboxOption[];
  qualificationFilterOptions: ComboboxOption[];
}) {
  return (
    <Collapsible defaultOpen>
      <div className="rounded-2xl border border-border/80 bg-card/80 p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            {isEn ? "Pipeline filters" : "Filtros del pipeline"}
          </h3>
          <CollapsibleTrigger
            className={(state) =>
              cn(
                buttonVariants({ size: "sm", variant: "ghost" }),
                "h-8 rounded-xl px-2",
                state.open ? "text-foreground" : "text-muted-foreground"
              )
            }
            type="button"
          >
            <Icon icon={ArrowDown01Icon} size={14} />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                {isEn ? "Status" : "Estado"}
              </span>
              <Combobox
                onValueChange={(next) => setStatusFilter(next.toLowerCase())}
                options={statusFilterOptions}
                searchPlaceholder={
                  isEn ? "Filter status..." : "Filtrar estado..."
                }
                value={statusFilter}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                {isEn ? "Assignee" : "Responsable"}
              </span>
              <Combobox
                onValueChange={setAssigneeFilter}
                options={assigneeFilterOptions}
                searchPlaceholder={
                  isEn ? "Filter assignee..." : "Filtrar responsable..."
                }
                value={assigneeFilter}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                {isEn ? "SLA level" : "Nivel SLA"}
              </span>
              <Combobox
                onValueChange={setSlaFilter}
                options={slaFilterOptions}
                searchPlaceholder={isEn ? "Filter SLA..." : "Filtrar SLA..."}
                value={slaFilter}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                {isEn ? "Qualification" : "Calificación"}
              </span>
              <Combobox
                onValueChange={setQualificationFilter}
                options={qualificationFilterOptions}
                searchPlaceholder={
                  isEn ? "Filter qualification..." : "Filtrar calificación..."
                }
                value={qualificationFilter}
              />
            </label>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
