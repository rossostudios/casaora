"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  completeTaskAction,
  createTaskAction,
  setTaskAssigneeAction,
  updateTaskStatusAction,
} from "@/app/(admin)/module/tasks/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableRow } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { useActiveLocale } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type UnitRow = {
  id: string;
  name?: string | null;
  code?: string | null;
  property_name?: string | null;
};

type TaskRow = {
  id: string;
  title?: string | null;
  type?: string | null;
  status?: string | null;
  priority?: string | null;
  due_at?: string | null;
  completed_at?: string | null;

  assigned_user_id?: string | null;

  unit_id?: string | null;
  unit_name?: string | null;

  property_id?: string | null;
  property_name?: string | null;

  reservation_id?: string | null;

  checklist_total?: number | null;
  checklist_completed?: number | null;
  checklist_required_total?: number | null;
  checklist_required_remaining?: number | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : value ? String(value) : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shortId(value: string): string {
  const text = value.trim();
  if (text.length <= 14) return text;
  return `${text.slice(0, 8)}…${text.slice(-4)}`;
}

function taskStatusActions(status: string): { kind: string; next?: string }[] {
  const normalized = status.trim().toLowerCase();
  if (normalized === "todo") {
    return [
      { kind: "status", next: "in_progress" },
      { kind: "status", next: "cancelled" },
    ];
  }
  if (normalized === "in_progress") {
    return [
      { kind: "complete" },
      { kind: "status", next: "todo" },
      { kind: "status", next: "cancelled" },
    ];
  }
  return [];
}

function localizedTaskStatusLabel(isEn: boolean, status: string): string {
  const normalized = status.trim().toLowerCase();
  if (!isEn) {
    if (normalized === "todo") return "Pendiente";
    if (normalized === "in_progress") return "En progreso";
    if (normalized === "done") return "Hecha";
    if (normalized === "cancelled") return "Cancelada";
  }
  if (normalized === "todo") return "To do";
  if (normalized === "in_progress") return "In progress";
  if (normalized === "done") return "Done";
  if (normalized === "cancelled") return "Cancelled";
  return status;
}

function localizedTaskActionLabel(
  isEn: boolean,
  kind: string,
  next?: string
): string {
  if (kind === "complete") return isEn ? "Complete" : "Completar";

  if (next === "in_progress") return isEn ? "Start" : "Iniciar";
  if (next === "todo") return isEn ? "Back to todo" : "Volver";
  if (next === "cancelled") return isEn ? "Cancel" : "Cancelar";
  return next ?? kind;
}

function statusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "done") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300";
  }
  if (normalized === "cancelled") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300";
  }
  if (normalized === "in_progress") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300";
  }
  return "";
}

function TaskRowActions({
  currentUserId,
  nextPath,
  row,
}: {
  currentUserId: string | null;
  nextPath: string;
  row: DataTableRow;
}) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  const id = asString(row.id).trim();
  const status = asString(row.status).trim();
  if (!(id && status)) return null;

  const assignedUserId = asString(row.assigned_user_id).trim();

  const actions = taskStatusActions(status);

  const assignmentControl =
    currentUserId && !assignedUserId ? (
      <form action={setTaskAssigneeAction}>
        <input name="task_id" type="hidden" value={id} />
        <input name="assigned_user_id" type="hidden" value={currentUserId} />
        <input name="next" type="hidden" value={nextPath} />
        <Button size="sm" type="submit" variant="outline">
          {isEn ? "Take" : "Tomar"}
        </Button>
      </form>
    ) : currentUserId && assignedUserId === currentUserId ? (
      <form action={setTaskAssigneeAction}>
        <input name="task_id" type="hidden" value={id} />
        <input name="assigned_user_id" type="hidden" value="" />
        <input name="next" type="hidden" value={nextPath} />
        <Button size="sm" type="submit" variant="ghost">
          {isEn ? "Unassign" : "Soltar"}
        </Button>
      </form>
    ) : null;

  if (!(actions.length || assignmentControl)) return null;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {assignmentControl}
      {actions.map((action) => {
        if (action.kind === "complete") {
          return (
            <form action={completeTaskAction} key="complete">
              <input name="task_id" type="hidden" value={id} />
              <input name="next" type="hidden" value={nextPath} />
              <Button size="sm" type="submit" variant="secondary">
                {localizedTaskActionLabel(isEn, action.kind)}
              </Button>
            </form>
          );
        }

        return (
          <form action={updateTaskStatusAction} key={action.next}>
            <input name="task_id" type="hidden" value={id} />
            <input name="next" type="hidden" value={nextPath} />
            <input name="status" type="hidden" value={action.next ?? ""} />
            <Button size="sm" type="submit" variant="outline">
              {localizedTaskActionLabel(isEn, action.kind, action.next)}
            </Button>
          </form>
        );
      })}
    </div>
  );
}

export function TasksManager({
  currentUserId,
  orgId,
  tasks,
  units,
}: {
  currentUserId: string | null;
  orgId: string;
  tasks: Record<string, unknown>[];
  units: Record<string, unknown>[];
}) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const suffix = searchParams.toString();
    return suffix ? `${pathname}?${suffix}` : pathname;
  }, [pathname, searchParams]);

  const [open, setOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [unitId, setUnitId] = useState("all");

  const [dueOn, setDueOn] = useState("");

  const unitOptions = useMemo(() => {
    return (units as UnitRow[])
      .map((unit) => {
        const id = asString(unit.id).trim();
        if (!id) return null;
        const name = asString(unit.name).trim();
        const code = asString(unit.code).trim();
        const property = asString(unit.property_name).trim();
        const label = [property, code || name || id]
          .filter(Boolean)
          .join(" · ");
        return { id, label: label || id };
      })
      .filter((item): item is { id: string; label: string } => Boolean(item))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [units]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const normalizedStatus = status.trim().toLowerCase();
    const normalizedType = type.trim().toLowerCase();

    return (tasks as TaskRow[])
      .filter((task) => {
        const rowStatus = asString(task.status).trim().toLowerCase();
        if (normalizedStatus !== "all" && rowStatus !== normalizedStatus) {
          return false;
        }

        const rowType = asString(task.type).trim().toLowerCase();
        if (normalizedType !== "all" && rowType !== normalizedType) {
          return false;
        }

        const rowUnitId = asString(task.unit_id).trim();
        if (unitId !== "all" && rowUnitId !== unitId) {
          return false;
        }

        if (dueOn) {
          const dueAt = asString(task.due_at).trim();
          if (!dueAt.startsWith(dueOn)) {
            return false;
          }
        }

        if (!needle) return true;

        const haystack = [
          task.id,
          task.title,
          task.type,
          task.status,
          task.priority,
          task.unit_name,
          task.property_name,
          task.reservation_id,
        ]
          .map((value) => asString(value).trim().toLowerCase())
          .filter(Boolean)
          .join(" | ");

        return haystack.includes(needle);
      })
      .map((task) => {
        const id = asString(task.id).trim();
        const title = asString(task.title).trim();
        const statusValue = asString(task.status).trim();

        return {
          id,
          title,
          type: asString(task.type).trim() || null,
          status: statusValue || null,
          status_label: statusValue
            ? localizedTaskStatusLabel(isEn, statusValue)
            : null,
          priority: asString(task.priority).trim() || null,
          due_at: asString(task.due_at).trim() || null,
          completed_at: asString(task.completed_at).trim() || null,
          assigned_user_id: asString(task.assigned_user_id).trim() || null,
          unit_id: asString(task.unit_id).trim() || null,
          unit_name: asString(task.unit_name).trim() || null,
          property_id: asString(task.property_id).trim() || null,
          property_name: asString(task.property_name).trim() || null,
          reservation_id: asString(task.reservation_id).trim() || null,
          checklist_total: asNumber(task.checklist_total),
          checklist_completed: asNumber(task.checklist_completed),
          checklist_required_total: asNumber(task.checklist_required_total),
          checklist_required_remaining: asNumber(
            task.checklist_required_remaining
          ),
        } satisfies DataTableRow;
      });
  }, [dueOn, isEn, query, status, tasks, type, unitId]);

  const columns = useMemo<ColumnDef<DataTableRow>[]>(() => {
    return [
      {
        accessorKey: "title",
        header: isEn ? "Task" : "Tarea",
        cell: ({ row, getValue }) => {
          const title = asString(getValue()).trim();
          const typeValue = asString(row.original.type).trim();
          const priorityValue = asString(row.original.priority).trim();
          const unit = asString(row.original.unit_name).trim();
          const property = asString(row.original.property_name).trim();
          const subtitle = [property, unit].filter(Boolean).join(" · ");

          return (
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 truncate font-medium">
                  {title || (isEn ? "Task" : "Tarea")}
                </span>
                {typeValue ? (
                  <Badge className="text-[11px]" variant="secondary">
                    {typeValue}
                  </Badge>
                ) : null}
                {priorityValue ? (
                  <Badge className="text-[11px]" variant="outline">
                    {priorityValue}
                  </Badge>
                ) : null}
              </div>
              {subtitle ? (
                <p className="truncate text-muted-foreground text-xs">
                  {subtitle}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: isEn ? "Status" : "Estado",
        cell: ({ row }) => {
          const raw = asString(row.original.status).trim();
          const label =
            asString(row.original.status_label).trim() || raw || "-";
          if (!raw) return <span className="text-muted-foreground">-</span>;
          return (
            <Badge
              className={cn("whitespace-nowrap", statusBadgeClass(raw))}
              variant="outline"
            >
              {label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "due_at",
        header: isEn ? "Due" : "Vence",
        cell: ({ getValue }) => {
          const value = asString(getValue()).trim();
          if (!value) return <span className="text-muted-foreground">-</span>;
          const date = new Date(value);
          if (Number.isNaN(date.valueOf())) return value;
          return (
            <span className="whitespace-nowrap">
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                date
              )}
            </span>
          );
        },
      },
      {
        id: "checklist",
        header: isEn ? "Checklist" : "Checklist",
        accessorFn: (row) => row.checklist_total,
        enableSorting: false,
        cell: ({ row }) => {
          const total = asNumber(row.original.checklist_total);
          if (!total) return <span className="text-muted-foreground">-</span>;
          const completed = asNumber(row.original.checklist_completed);
          const remainingRequired = asNumber(
            row.original.checklist_required_remaining
          );

          const tone =
            remainingRequired > 0
              ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
              : completed >= total
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                : "";

          return (
            <Badge className={cn("font-mono text-xs", tone)} variant="outline">
              {completed}/{total}
              {remainingRequired > 0
                ? ` · ${remainingRequired} ${isEn ? "req" : "req"}`
                : null}
            </Badge>
          );
        },
      },
      {
        accessorKey: "assigned_user_id",
        header: isEn ? "Assignee" : "Asignada",
        cell: ({ getValue }) => {
          const value = asString(getValue()).trim();
          if (!value) return <span className="text-muted-foreground">-</span>;
          if (currentUserId && value === currentUserId) {
            return (
              <Badge className="text-[11px]" variant="secondary">
                {isEn ? "Me" : "Yo"}
              </Badge>
            );
          }
          return (
            <span className="break-words font-mono text-xs">
              {shortId(value)}
            </span>
          );
        },
      },
    ];
  }, [currentUserId, isEn, locale]);

  const counts = useMemo(() => {
    const base = { todo: 0, in_progress: 0, done: 0, cancelled: 0 };
    for (const task of tasks as TaskRow[]) {
      const value = asString(task.status).trim().toLowerCase();
      if (value in base) {
        base[value as keyof typeof base] += 1;
      }
    }
    return base;
  }, [tasks]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid w-full gap-2 md:grid-cols-4">
          <label className="space-y-1">
            <span className="block font-medium text-muted-foreground text-xs">
              {isEn ? "Search" : "Buscar"}
            </span>
            <Input
              onChange={(event) => setQuery(event.target.value)}
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
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="all">{isEn ? "All" : "Todos"}</option>
              <option value="todo">todo</option>
              <option value="in_progress">in_progress</option>
              <option value="done">done</option>
              <option value="cancelled">cancelled</option>
            </Select>
          </label>

          <label className="space-y-1">
            <span className="block font-medium text-muted-foreground text-xs">
              {isEn ? "Type" : "Tipo"}
            </span>
            <Select
              onChange={(event) => setType(event.target.value)}
              value={type}
            >
              <option value="all">{isEn ? "All" : "Todos"}</option>
              <option value="cleaning">cleaning</option>
              <option value="maintenance">maintenance</option>
              <option value="check_in">check_in</option>
              <option value="check_out">check_out</option>
              <option value="inspection">inspection</option>
              <option value="custom">custom</option>
            </Select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="block font-medium text-muted-foreground text-xs">
                {isEn ? "Unit" : "Unidad"}
              </span>
              <Select
                onChange={(event) => setUnitId(event.target.value)}
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
              <Input
                onChange={(event) => setDueOn(event.target.value)}
                type="date"
                value={dueOn}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge className={cn(statusBadgeClass("todo"))} variant="outline">
              todo {counts.todo}
            </Badge>
            <Badge
              className={cn(statusBadgeClass("in_progress"))}
              variant="outline"
            >
              in_progress {counts.in_progress}
            </Badge>
            <Badge className={cn(statusBadgeClass("done"))} variant="outline">
              done {counts.done}
            </Badge>
            <Badge
              className={cn(statusBadgeClass("cancelled"))}
              variant="outline"
            >
              cancelled {counts.cancelled}
            </Badge>
          </div>

          <Button
            onClick={() => setOpen(true)}
            type="button"
            variant="secondary"
          >
            <Icon icon={PlusSignIcon} size={16} />
            {isEn ? "New task" : "Nueva tarea"}
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        renderRowActions={(row) => (
          <TaskRowActions
            currentUserId={currentUserId}
            nextPath={nextPath}
            row={row}
          />
        )}
        rowActionsHeader={isEn ? "Actions" : "Acciones"}
        rowHrefBase="/module/tasks"
        searchPlaceholder={isEn ? "Filter..." : "Filtrar..."}
      />

      <Sheet
        description={
          isEn
            ? "Create a task for cleaning, maintenance, or follow-up work."
            : "Crea una tarea de limpieza, mantenimiento o seguimiento."
        }
        onOpenChange={setOpen}
        open={open}
        title={isEn ? "New task" : "Nueva tarea"}
      >
        <form action={createTaskAction} className="space-y-4">
          <input name="organization_id" type="hidden" value={orgId} />

          <label className="block space-y-1">
            <span className="block font-medium text-muted-foreground text-xs">
              {isEn ? "Title" : "Título"}
            </span>
            <Input
              name="title"
              placeholder={isEn ? "e.g. Cleaning" : "Ej. Limpieza"}
              required
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="block font-medium text-muted-foreground text-xs">
                {isEn ? "Type" : "Tipo"}
              </span>
              <Select defaultValue="custom" name="type">
                <option value="cleaning">cleaning</option>
                <option value="maintenance">maintenance</option>
                <option value="check_in">check_in</option>
                <option value="check_out">check_out</option>
                <option value="inspection">inspection</option>
                <option value="custom">custom</option>
              </Select>
            </label>

            <label className="block space-y-1">
              <span className="block font-medium text-muted-foreground text-xs">
                {isEn ? "Priority" : "Prioridad"}
              </span>
              <Select defaultValue="medium" name="priority">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </Select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="block font-medium text-muted-foreground text-xs">
              {isEn ? "Unit (optional)" : "Unidad (opcional)"}
            </span>
            <Select defaultValue="" name="unit_id">
              <option value="">{isEn ? "No unit" : "Sin unidad"}</option>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </Select>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="block font-medium text-muted-foreground text-xs">
                {isEn
                  ? "Reservation ID (optional)"
                  : "ID de reserva (opcional)"}
              </span>
              <Input
                name="reservation_id"
                placeholder={isEn ? "Paste UUID" : "Pega el UUID"}
              />
            </label>

            <label className="block space-y-1">
              <span className="block font-medium text-muted-foreground text-xs">
                {isEn ? "Due date (optional)" : "Vence (opcional)"}
              </span>
              <Input name="due_on" type="date" />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="block font-medium text-muted-foreground text-xs">
              {isEn ? "Description (optional)" : "Descripción (opcional)"}
            </span>
            <Input
              name="description"
              placeholder={isEn ? "Optional" : "Opcional"}
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              {isEn ? "Cancel" : "Cancelar"}
            </Button>
            <Button type="submit" variant="secondary">
              {isEn ? "Create" : "Crear"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
