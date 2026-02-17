export function CasaoraLogo({
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      CASAORA
    </span>
  );
}
