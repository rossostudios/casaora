const cdX = 32;
const cdY = 18;

const Cube = ({
  cx,
  cy,
  h,
  withStar,
}: {
  cx: number;
  cy: number;
  h: number;
  withStar?: boolean;
}) => (
  <g>
    {/* Top face */}
    <path
      d={`M ${cx} ${cy} L ${cx + cdX} ${cy - cdY} L ${cx} ${cy - cdY * 2} L ${
        cx - cdX
      } ${cy - cdY} Z`}
      fill="rgba(255, 255, 255, 0.02)"
    />
    {/* Left face */}
    <path
      d={`M ${cx} ${cy} L ${cx - cdX} ${cy - cdY} L ${cx - cdX} ${
        cy - cdY + h
      } L ${cx} ${cy + h} Z`}
    />
    {/* Right face */}
    <path
      d={`M ${cx} ${cy} L ${cx + cdX} ${cy - cdY} L ${cx + cdX} ${
        cy - cdY + h
      } L ${cx} ${cy + h} Z`}
    />
    {withStar && (
      <path
        d={`M ${cx - 4} ${cy - cdY} L ${cx + 4} ${cy - cdY} M ${cx} ${
          cy - cdY - 2
        } L ${cx} ${cy - cdY + 2}`}
      />
    )}
  </g>
);

const sdX = 46;
const sdY = 26;

const Slab = ({
  cx,
  cy,
  h,
  withCircle,
}: {
  cx: number;
  cy: number;
  h: number;
  withCircle?: boolean;
}) => (
  <g>
    <path
      d={`M ${cx} ${cy} L ${cx + sdX} ${cy - sdY} L ${cx} ${cy - sdY * 2} L ${
        cx - sdX
      } ${cy - sdY} Z`}
      fill={"rgba(255,255,255,0.02)"}
    />
    <path
      d={`M ${cx} ${cy} L ${cx - sdX} ${cy - sdY} L ${cx - sdX} ${
        cy - sdY + h
      } L ${cx} ${cy + h} Z`}
    />
    <path
      d={`M ${cx} ${cy} L ${cx + sdX} ${cy - sdY} L ${cx + sdX} ${
        cy - sdY + h
      } L ${cx} ${cy + h} Z`}
    />
    {withCircle && (
      <ellipse
        cx={cx}
        cy={cy - sdY}
        rx={sdX * 0.5}
        ry={sdY * 0.5}
        strokeDasharray="3 3"
      />
    )}
  </g>
);

export function ChannelManagerIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-labelledby="channel-manager-title"
      className={className}
      fill="none"
      role="img"
      stroke="currentColor"
      strokeWidth="0.75"
      viewBox="0 0 300 300"
    >
      <title id="channel-manager-title">Channel Manager</title>
      <g strokeOpacity="0.4">
        {/* Back cube */}
        <Cube cx={150} cy={110} h={70} withStar />
        {/* Left cube */}
        <Cube cx={150 - cdX} cy={110 + cdY} h={40} withStar />
        {/* Right cube */}
        <Cube cx={150 + cdX} cy={110 + cdY} h={50} withStar />
        {/* Front cube */}
        <Cube cx={150} cy={110 + cdY * 2} h={45} withStar />
      </g>
    </svg>
  );
}

export function UnifiedInboxIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-labelledby="unified-inbox-title"
      className={className}
      fill="none"
      role="img"
      stroke="currentColor"
      strokeWidth="0.75"
      viewBox="0 0 300 300"
    >
      <title id="unified-inbox-title">Unified Inbox</title>
      <g strokeOpacity="0.4">
        <Slab cx={150} cy={200} h={10} />
        <Slab cx={150} cy={170} h={10} />
        <Slab cx={150} cy={140} h={10} />
        <Slab cx={150} cy={100} h={10} withCircle />

        <path
          d={"M 150 100 L 150 200"}
          strokeDasharray="2 3"
          strokeOpacity="0.3"
        />
        <path
          d={`M ${150 - sdX} ${100 - sdY} L ${150 - sdX} ${200 - sdY}`}
          strokeDasharray="2 3"
          strokeOpacity="0.3"
        />
        <path
          d={`M ${150 + sdX} ${100 - sdY} L ${150 + sdX} ${200 - sdY}`}
          strokeDasharray="2 3"
          strokeOpacity="0.3"
        />
      </g>
    </svg>
  );
}

export function OperationsIcon({ className }: { className?: string }) {
  const cdx = 55;
  const cdy = 31; // Represents depth

  return (
    <svg
      aria-labelledby="operations-title"
      className={className}
      fill="none"
      role="img"
      stroke="currentColor"
      strokeWidth="0.75"
      viewBox="0 0 300 300"
    >
      <title id="operations-title">Operations & Finance</title>
      <g strokeOpacity="0.4">
        {/* Render back to front */}
        {Array.from({ length: 8 })
          .reverse()
          .map((_, index) => {
            const i = 7 - index; // Ensure we still render back-to-front by z-index logic if we map reverse, wait mapping reverse reverses everything.
            // i=7 is back, i=0 is front
            const idx = 7 - i; // mapped back to 0-7
            const cx = 90 + idx * 8;
            const cy = 230 - idx * 14;
            const h = 25 + idx * 10;
            return (
              <g key={`operation-card-${idx}`}>
                <path
                  d={`M ${cx} ${cy} L ${cx - cdx} ${cy - cdy} L ${cx - cdx} ${
                    cy - cdy - h
                  } L ${cx} ${cy - h} Z`}
                  fill="rgba(0,0,0,0.5)"
                />
                <path
                  d={`M ${cx} ${cy - h} L ${cx - cdx} ${cy - cdy - h} L ${
                    cx - cdx + 3
                  } ${cy - cdy - h - 1.5} L ${cx + 3} ${cy - h - 1.5} Z`}
                  fill="rgba(255,255,255,0.02)"
                />
                <path
                  d={`M ${cx} ${cy} L ${cx + 3} ${cy - 1.5} L ${cx + 3} ${
                    cy - h - 1.5
                  } L ${cx} ${cy - h} Z`}
                />
                {/* Add a tiny text line on the tallest back card */}
                {idx === 7 && (
                  <path
                    d={`M ${cx - 40} ${cy - cdy - h + 15} L ${cx - 15} ${
                      cy - h + 5
                    }`}
                    strokeDasharray="2 2"
                    strokeOpacity="0.5"
                  />
                )}
              </g>
            );
          })}
      </g>
    </svg>
  );
}
