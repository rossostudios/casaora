"use client";

import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import type { ImportRowResult } from "@/app/(admin)/setup/import-actions";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ImportProgressProps = {
  total: number;
  processed: number;
  results: ImportRowResult[];
  isEn: boolean;
};

export function ImportProgress({
  total,
  processed,
  results,
  isEn,
}: ImportProgressProps) {
  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const done = processed === total;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {done
            ? isEn
              ? "Import complete"
              : "Importación completada"
            : isEn
              ? "Importing..."
              : "Importando..."}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {processed}/{total}
        </span>
      </div>
      <Progress className="h-2.5" value={percent} />
      {done ? (
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-primary">
              <Icon icon={CheckmarkCircle02Icon} size={16} />
              {succeeded} {isEn ? "succeeded" : "exitosos"}
            </span>
            {failed > 0 ? (
              <span className="flex items-center gap-1.5 text-destructive">
                <Icon icon={Cancel01Icon} size={16} />
                {failed} {isEn ? "failed" : "fallidos"}
              </span>
            ) : null}
          </div>
          {results.filter((r) => !r.ok).length > 0 ? (
            <div className="max-h-40 overflow-auto rounded-lg border bg-muted/20 p-2">
              {results
                .filter((r) => !r.ok)
                .map((r) => (
                  <div
                    className="flex items-start gap-2 px-2 py-1 text-xs"
                    key={r.index}
                  >
                    <span
                      className={cn("shrink-0 font-medium text-destructive")}
                    >
                      {isEn ? "Row" : "Fila"} {r.index + 1}:
                    </span>
                    <span className="text-muted-foreground">{r.error}</span>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
