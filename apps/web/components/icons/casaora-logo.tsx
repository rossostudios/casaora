import { cn } from "@/lib/utils";

export function CasaoraLogo({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  const fontSize = Math.round(size * 0.56);

  return (
    <span
      aria-label="Casaora"
      className={cn(
        "inline-flex select-none items-center font-black tracking-tighter",
        className
      )}
      style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}
    >
      casaora
    </span>
  );
}
