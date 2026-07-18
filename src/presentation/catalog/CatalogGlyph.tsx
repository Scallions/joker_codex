interface CatalogGlyphProps {
  readonly focalKey: string;
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

const PALETTE = ['#f1c56f', '#e86852', '#71b9ad', '#9b83d5', '#d78bad'] as const;

export function CatalogGlyph({ focalKey }: CatalogGlyphProps) {
  const hash = hashText(focalKey);
  const color = PALETTE[hash % PALETTE.length];
  const accent = PALETTE[(hash >>> 5) % PALETTE.length];
  const sides = 3 + ((hash >>> 10) % 6);
  const rotation = hash % 360;
  const radius = 20 + ((hash >>> 15) % 13);
  const points = Array.from({ length: sides }, (_, index) => {
    const angle = (Math.PI * 2 * index) / sides - Math.PI / 2;
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
  }).join(' ');
  const orbitX = 24 + ((hash >>> 19) % 53);
  const orbitY = 22 + ((hash >>> 24) % 57);

  return (
    <svg
      viewBox="0 0 100 100"
      className="catalog-glyph"
      data-focal-key={focalKey}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="39" fill="none" stroke={color} opacity="0.24" />
      <circle cx={orbitX} cy={orbitY} r="5" fill={accent} opacity="0.78" />
      <g transform={`rotate(${rotation} 50 50)`}>
        <polygon points={points} fill={`${color}33`} stroke={color} strokeWidth="2.4" />
        <path
          d={`M 23 ${35 + (hash % 20)} Q 50 ${18 + ((hash >>> 7) % 24)} 77 ${62 + ((hash >>> 12) % 20)}`}
          fill="none"
          stroke={accent}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </g>
      <circle cx="50" cy="50" r={4 + ((hash >>> 27) % 6)} fill={accent} />
    </svg>
  );
}
