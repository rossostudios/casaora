"use client";

import { ArrowDown01Icon, Tick01Icon } from "@hugeicons/core-free-icons";

import { getModelDisplayName, getModelShortName } from "@/components/agent/model-display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { AgentModelOption } from "@/lib/api";

export function ModelSelectorPill({
  selectedModel,
  modelOptions,
  onModelChange,
  isEn,
}: {
  selectedModel: string;
  modelOptions: AgentModelOption[];
  onModelChange: (model: string) => void;
  isEn: boolean;
}) {
  const isAuto = selectedModel === "";
  const label = isAuto ? "AUTO" : getModelShortName(selectedModel).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-[11px] font-semibold text-background",
          "transition-opacity hover:opacity-80"
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>{label}</span>
        <Icon className="h-3 w-3 opacity-60" icon={ArrowDown01Icon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuItem
          className="flex cursor-pointer items-center justify-between gap-2"
          onClick={() => onModelChange("")}
        >
          <div>
            <div className="font-medium text-[13px]">Auto</div>
            <div className="text-[11px] text-muted-foreground">
              {isEn ? "Best model for each task" : "Mejor modelo para cada tarea"}
            </div>
          </div>
          {isAuto ? (
            <Icon className="h-3.5 w-3.5 shrink-0 text-foreground" icon={Tick01Icon} />
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {modelOptions.map((opt) => (
          <DropdownMenuItem
            className="flex cursor-pointer items-center justify-between gap-2"
            key={opt.model}
            onClick={() => onModelChange(opt.model)}
          >
            <span className="text-[13px]">{getModelDisplayName(opt.model)}</span>
            {selectedModel === opt.model ? (
              <Icon className="h-3.5 w-3.5 shrink-0 text-foreground" icon={Tick01Icon} />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
