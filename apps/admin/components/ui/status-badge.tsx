import { Badge } from "@/components/ui/badge";
import { humanizeKey } from "@/lib/format";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

type StatusBadgeProps = {
  value?: string | null;
  label?: string | null;
  tone?: StatusTone;
  className?: string;
};

const TONE_CLASS: Record<StatusTone, string> = {
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
  danger:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300",
  neutral: "",
};

const VALUE_TONE: Record<string, StatusTone> = {
  active: "success",
  confirmed: "success",
  checked_in: "success",
  checked_out: "success",
  done: "success",
  finalized: "success",
  sent: "success",
  paid: "success",
  processed: "success",
  completed: "success",
  contract_signed: "success",
  qualified: "info",
  offer_sent: "info",
  visit_scheduled: "info",
  met: "success",
  strong: "success",

  inactive: "danger",
  cancelled: "danger",
  failed: "danger",
  no_show: "danger",
  ignored: "danger",
  rejected: "danger",
  lost: "danger",
  terminated: "danger",
  delinquent: "danger",
  breached: "danger",
  late: "danger",

  pending: "warning",
  draft: "warning",
  todo: "warning",
  in_progress: "warning",
  received: "warning",
  queued: "warning",
  new: "warning",
  screening: "warning",
  scheduled: "warning",
  moderate: "warning",
  watch: "warning",

  waived: "neutral",
};

function inferredTone(value: string): StatusTone {
  return VALUE_TONE[value.trim().toLowerCase()] ?? "neutral";
}

export function StatusBadge({
  value,
  label,
  tone,
  className,
}: StatusBadgeProps) {
  const rawValue = (value ?? "").trim();
  const display =
    (label ?? "").trim() || (rawValue ? humanizeKey(rawValue) : "");

  if (!display) {
    return <span className="text-muted-foreground">-</span>;
  }

  const resolvedTone = tone ?? inferredTone(rawValue || display);
  const variant = resolvedTone === "neutral" ? "secondary" : "outline";

  return (
    <Badge
      className={cn("whitespace-nowrap", TONE_CLASS[resolvedTone], className)}
      variant={variant}
    >
      {display}
    </Badge>
  );
}
