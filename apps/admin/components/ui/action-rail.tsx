import { cn } from "@/lib/utils";

export function ActionRail({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm",
        className
      )}
    >
      <div className="mb-4 space-y-1">
        <h2 className="font-semibold text-base tracking-tight">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </aside>
  );
}
