/**
 * Progress bar — a single-series magnitude mark.
 *
 * Per the data-viz rules: one sequential hue (never a hue per category), a thin
 * mark, rounded data ends, a recessive track, and the value always written out
 * so the bar never carries the number by length alone.
 */
export function ProgressBar({
  value,
  label,
  showValue = true,
  height = 8,
  color = 'var(--seq)',
  className = '',
}: {
  /** 0..1 */
  value: number;
  label?: string;
  showValue?: boolean;
  height?: number;
  color?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const pct = Math.round(clamped * 100);

  return (
    <div className={className}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label ? <span className="truncate text-sm text-ink-2">{label}</span> : <span />}
          {showValue ? (
            <span className="tabular text-sm font-semibold text-ink">{pct}%</span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progresso'}
        className="w-full overflow-hidden rounded-full"
        style={{ height, background: 'var(--seq-track)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-soft)]"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/**
 * Circular variant for the one headline figure on the progress page.
 * `size` is the outer diameter in pixels.
 */
export function ProgressRing({
  value,
  size = 128,
  thickness = 10,
  children,
}: {
  value: number;
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.round(clamped * 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`Progresso de ${pct}%`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--seq-track)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--seq)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 600ms var(--ease-out-soft)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? <span className="text-2xl font-bold text-ink">{pct}%</span>}
      </div>
    </div>
  );
}
