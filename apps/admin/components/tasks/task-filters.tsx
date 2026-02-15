"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  localizedTaskStatusLabel,
  localizedTaskTypeLabel,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from "@/lib/features/tasks/helpers";

type UnitOption = { id: string; label: string };

type StatusCounts = {
  todo: number;
  in_progress: number;
  done: number;
  cancelled: number;
};

export function TaskFilters({
  isEn,
  locale,
  query,
  onQueryChange,
  status,
  onStatusChange,
  type,
  onTypeChange,
  unitId,
  onUnitIdChange,
  unitOptions,
  dueOn,
  onDueOnChange,
  counts,
  onNewTask,
}: {
  isEn: boolean;
  locale: "es-PY" | "en-US";
  query: string;
  onQueryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  type: string;
  onTypeChange: (value: string) => void;
  unitId: string;
  onUnitIdChange: (value: string) => void;
  unitOptions: UnitOption[];
  dueOn: string;
  onDueOnChange: (value: string) => void;
  counts: StatusCounts;
  onNewTask: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="grid w-full gap-2 md:grid-cols-4">
        <label className="space-y-1">
          <span className="block font-medium text-muted-foreground text-xs">
            {isEn ? "Search" : "Buscar"}
          </span>
          <Input
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={
              isEn ? "Title, unit, status..." : "Título, unidad, estado..."
            }
            value={query}
          />
        </label>

        <label className="space-y-1">
          <span className="block font-medium text-muted-foreground text-xs">
            {isEn ? "Status" : "Estado"}
          </span>
          <Select
            onChange={(event) => onStatusChange(event.target.value)}
            value={status}
          >
            <option value="all">{isEn ? "All" : "Todos"}</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {localizedTaskStatusLabel(isEn, opt)}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1">
          <span className="block font-medium text-muted-foreground text-xs">
            {isEn ? "Type" : "Tipo"}
          </span>
          <Select
            onChange={(event) => onTypeChange(event.target.value)}
            value={type}
          >
            <option value="all">{isEn ? "All" : "Todos"}</option>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {localizedTaskTypeLabel(isEn, opt)}
              </option>
            ))}
          </Select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="block font-medium text-muted-foreground text-xs">
              {isEn ? "Unit" : "Unidad"}
            </span>
            <Select
              onChange={(event) => onUnitIdChange(event.target.value)}
              value={unitId}
            >
              <option value="all">{isEn ? "All" : "Todas"}</option>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1">
            <span className="block font-medium text-muted-foreground text-xs">
              {isEn ? "Due" : "Vence"}
            </span>
            <DatePicker
              locale={locale}
              onValueChange={onDueOnChange}
              value={dueOn}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <StatusBadge
              key={opt}
              label={`${localizedTaskStatusLabel(isEn, opt)} ${counts[opt as keyof StatusCounts] ?? 0}`}
              value={opt}
            />
          ))}
        </div>

        <Button onClick={onNewTask} type="button" variant="secondary">
          <Icon icon={PlusSignIcon} size={16} />
          {isEn ? "New task" : "Nueva tarea"}
        </Button>
      </div>
    </div>
  );
}
