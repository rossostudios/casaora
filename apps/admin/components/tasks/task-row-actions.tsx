"use client";

import {
  completeTaskAction,
  setTaskAssigneeAction,
  updateTaskStatusAction,
} from "@/app/(admin)/module/tasks/actions";
import { Button } from "@/components/ui/button";
import { type DataTableRow } from "@/components/ui/data-table";
import { Form } from "@/components/ui/form";
import {
  asString,
  localizedTaskActionLabel,
  taskStatusActions,
} from "@/lib/features/tasks/helpers";
import { useActiveLocale } from "@/lib/i18n/client";

export function TaskRowActions({
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
      <Form action={setTaskAssigneeAction}>
        <input name="task_id" type="hidden" value={id} />
        <input name="assigned_user_id" type="hidden" value={currentUserId} />
        <input name="next" type="hidden" value={nextPath} />
        <Button size="sm" type="submit" variant="outline">
          {isEn ? "Take" : "Tomar"}
        </Button>
      </Form>
    ) : currentUserId && assignedUserId === currentUserId ? (
      <Form action={setTaskAssigneeAction}>
        <input name="task_id" type="hidden" value={id} />
        <input name="assigned_user_id" type="hidden" value="" />
        <input name="next" type="hidden" value={nextPath} />
        <Button size="sm" type="submit" variant="ghost">
          {isEn ? "Unassign" : "Soltar"}
        </Button>
      </Form>
    ) : null;

  if (!(actions.length || assignmentControl)) return null;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {assignmentControl}
      {actions.map((action) => {
        if (action.kind === "complete") {
          return (
            <Form action={completeTaskAction} key="complete">
              <input name="task_id" type="hidden" value={id} />
              <input name="next" type="hidden" value={nextPath} />
              <Button size="sm" type="submit" variant="secondary">
                {localizedTaskActionLabel(isEn, action.kind)}
              </Button>
            </Form>
          );
        }

        return (
          <Form action={updateTaskStatusAction} key={action.next}>
            <input name="task_id" type="hidden" value={id} />
            <input name="next" type="hidden" value={nextPath} />
            <input name="status" type="hidden" value={action.next ?? ""} />
            <Button size="sm" type="submit" variant="outline">
              {localizedTaskActionLabel(isEn, action.kind, action.next)}
            </Button>
          </Form>
        );
      })}
    </div>
  );
}
