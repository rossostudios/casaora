import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  alt = false,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  alt?: boolean;
  id?: string;
}) {
  return (
    <section
      className={cn(
        "py-20 lg:py-28",
        alt && "bg-[var(--section-alt)]",
        className
      )}
      id={id}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}
