export function CasaoraLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Casaora Logo"
      className={className}
      fill="none"
      role="img"
      stroke="currentColor"
      viewBox="0 0 100 100"
    >
      <g strokeLinecap="round" strokeLinejoin="round" strokeWidth="8">
        {/* The dominant hut roof canopy */}
        <path d="M 12 50 L 50 16 L 88 50" />

        {/* The brand accent 'Aura' dot */}
        <circle cx="50" cy="36" fill="currentColor" r="4" stroke="none" />

        {/* The continuous base and arched door */}
        <path d="M 26 60 L 26 84 L 42 84 L 42 72 A 8 8 0 0 1 58 72 L 58 84 L 74 84 L 74 60" />
      </g>
    </svg>
  );
}
