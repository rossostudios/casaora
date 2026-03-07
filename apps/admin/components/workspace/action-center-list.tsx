import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  ActionCenterItem,
  ActionCenterPriority,
  ActionCenterSource,
} from "@/lib/workspace-types";

function priorityTone(priority: ActionCenterPriority): string {
  switch (priority) {
    case "critical":
      return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    case "high":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "medium":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    default:
      return "border-border/70 bg-muted/60 text-muted-foreground";
  }
}

function formatTimestamp(value: string, locale: Locale): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function priorityLabel(priority: ActionCenterPriority, isEn: boolean): string {
  switch (priority) {
    case "critical":
      return isEn ? "Critical" : "Crítico";
    case "high":
      return isEn ? "High" : "Alta";
    case "medium":
      return isEn ? "Medium" : "Media";
    default:
      return isEn ? "Low" : "Baja";
  }
}

function sourceLabel(source: ActionCenterSource, isEn: boolean): string {
  switch (source) {
    case "approval":
      return isEn ? "Approval" : "Aprobación";
    case "message":
      return isEn ? "Reply needed" : "Respuesta pendiente";
    case "notification":
      return isEn ? "Notification" : "Notificación";
    default:
      return isEn ? "Anomaly" : "Anomalía";
  }
}

export function ActionCenterList({
  items,
  locale,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  items: ActionCenterItem[];
  locale: Locale;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  const isEn = locale === "en-US";

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <Card className="border border-border/60 bg-card/70">
          <CardContent className="p-5">
            <EmptyState
              action={emptyAction}
              description={
                emptyDescription ??
                (isEn
                  ? "No urgent items right now."
                  : "No hay items urgentes en este momento.")
              }
              title={
                emptyTitle ??
                (isEn ? "Queue is clear" : "La cola está despejada")
              }
            />
          </CardContent>
        </Card>
      ) : null}

      {items.map((item) => (
        <Card className="border border-border/60 bg-card/70" key={item.id}>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn("border", priorityTone(item.priority))}
                  variant="outline"
                >
                  {priorityLabel(item.priority, isEn)}
                </Badge>
                <Badge variant="secondary">{sourceLabel(item.source, isEn)}</Badge>
                {item.unread ? (
                  <Badge
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    variant="outline"
                  >
                    {isEn ? "Unread" : "No leído"}
                  </Badge>
                ) : null}
                <span className="text-muted-foreground text-xs">
                  {formatTimestamp(item.createdAt, locale)}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-base tracking-tight">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm">{item.subtitle}</p>
                {item.entityLabel ? (
                  item.entityHref ? (
                    <Link
                      className="inline-flex text-[13px] text-primary underline-offset-4 hover:underline"
                      href={item.entityHref}
                    >
                      {item.entityLabel}
                    </Link>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      {item.entityLabel}
                    </p>
                  )
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {item.secondaryAction?.href ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={item.secondaryAction.href}>
                    {item.secondaryAction.label}
                  </Link>
                </Button>
              ) : null}
              {item.primaryAction.href ? (
                <Button asChild size="sm">
                  <Link href={item.primaryAction.href}>
                    {item.primaryAction.label}
                    <Icon icon={ArrowRight01Icon} size={14} />
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
