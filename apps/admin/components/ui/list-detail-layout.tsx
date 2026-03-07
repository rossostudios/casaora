import { cn } from "@/lib/utils";

export function ListDetailLayout({
  primary,
  aside,
  className,
}: {
  primary: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]",
        className
      )}
    >
      <div className="min-w-0">{primary}</div>
      {aside ? <div className="min-w-0">{aside}</div> : null}
    </div>
  );
}
