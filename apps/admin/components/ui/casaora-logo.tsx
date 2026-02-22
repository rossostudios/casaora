import { cn } from "@/lib/utils";

export function CasaoraLogo({
  className,
  size = 32,
}: {
  size?: number;
  className?: string;
}) {
  // Scale font size proportionally: size 32 → ~18px, size 24 → ~14px, size 14 → ~8px
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
