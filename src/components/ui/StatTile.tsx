import type { ReactNode } from 'react';

/**
 * A single headline figure. No plot, so no hover layer — the number *is* the
 * visualisation. Label in muted ink, value in primary ink, never in a series
 * colour.
 */
export function StatTile({
  label,
  value,
  unit,
  hint,
  emoji,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  emoji?: string;
}) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
        {emoji ? <span aria-hidden="true">{emoji}</span> : null}
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span className="text-2xl leading-none font-bold text-ink sm:text-3xl">{value}</span>
        {unit ? <span className="text-sm font-medium text-ink-2">{unit}</span> : null}
      </span>
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </div>
  );
}
