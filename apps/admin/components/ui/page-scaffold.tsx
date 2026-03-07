import { cn } from "@/lib/utils";

export function PageScaffold({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-6", className)}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-1">
            <h1 className="font-semibold text-3xl tracking-tight">{title}</h1>
            {description ? (
              <p className="max-w-3xl text-muted-foreground text-sm md:text-base">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
