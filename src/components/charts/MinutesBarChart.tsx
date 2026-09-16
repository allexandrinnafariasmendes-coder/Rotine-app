import { useState } from 'react';
import type { DailyMinutes } from '@/services/progress';
import { fromDayISO, formatMinutes, formatShort, isToday, WEEKDAY_SHORT } from '@/lib/date';

/**
 * Study minutes per day.
 *
 * One series, so there is no legend: the heading names it. The bars use the
 * single sequential hue, sit on a real baseline, keep a 2px surface gap between
 * neighbours and have 4px rounded data ends. Only the tallest bar and today are
 * labelled directly — a number on every bar would be noise. A hover tooltip is
 * present by default, and a table view is available for anyone the colour or
 * the geometry does not serve.
 */
export function MinutesBarChart({
  data,
  goalMinutes,
  height = 140,
}: {
  data: DailyMinutes[];
  /** Draws a reference line for the student's daily goal. */
  goalMinutes?: number;
  height?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(60, ...data.map((d) => d.minutes));
  const peakIndex = data.reduce(
    (best, d, i) => (d.minutes > (data[best]?.minutes ?? -1) ? i : best),
    0,
  );
  const total = data.reduce((sum, d) => sum + d.minutes, 0);

  if (showTable) {
    return (
      <div>
        <table className="w-full text-sm">
          <caption className="sr-only">Minutos estudados por dia</caption>
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-muted uppercase">
              <th scope="col" className="py-1.5 font-medium">
                Dia
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                Tempo
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date} className="border-b border-hairline/60 last:border-0">
                <td className="py-1.5 text-ink-2">{formatShort(d.date)}</td>
                <td className="tabular py-1.5 text-right text-ink">
                  {d.minutes === 0 ? '—' : formatMinutes(d.minutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => setShowTable(false)}
          className="mt-3 text-xs font-medium text-accent underline underline-offset-2"
        >
          Ver gráfico
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative" style={{ height }}>
        {goalMinutes && goalMinutes <= max ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-hairline-strong"
            style={{ bottom: `${(goalMinutes / max) * 100}%` }}
          >
            <span className="absolute -top-4 right-0 text-[10px] text-ink-muted">
              meta {formatMinutes(goalMinutes)}
            </span>
          </div>
        ) : null}

        <div className="flex h-full items-end gap-0.5">
          {data.map((d, i) => {
            const ratio = d.minutes / max;
            const isPeak = i === peakIndex && d.minutes > 0;
            const label = isPeak || isToday(d.date);
            return (
              <div
                key={d.date}
                className="group relative flex h-full flex-1 flex-col justify-end"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                role="img"
                aria-label={`${formatShort(d.date)}: ${d.minutes === 0 ? 'nada estudado' : formatMinutes(d.minutes)}`}
              >
                {label && d.minutes > 0 ? (
                  <span className="tabular mb-1 text-center text-[10px] font-semibold text-ink-2">
                    {Math.round(d.minutes / 60) >= 1
                      ? `${Math.round((d.minutes / 60) * 10) / 10}h`
                      : `${d.minutes}m`}
                  </span>
                ) : null}
                <div
                  className="w-full rounded-t transition-[height,filter] duration-500 ease-[var(--ease-out-soft)] group-hover:brightness-110"
                  style={{
                    height: `${Math.max(d.minutes > 0 ? 3 : 1, ratio * 100)}%`,
                    background: d.minutes > 0 ? 'var(--seq)' : 'var(--seq-track)',
                    borderRadius: '4px 4px 0 0',
                  }}
                />
                {hovered === i ? (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg border border-hairline bg-surface px-2 py-1 text-center text-xs whitespace-nowrap shadow-lg">
                    <span className="block font-semibold text-ink">
                      {d.minutes === 0 ? 'Nada estudado' : formatMinutes(d.minutes)}
                    </span>
                    <span className="block text-ink-muted">{formatShort(d.date)}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="mt-1 border-t"
        style={{ borderColor: 'var(--baseline)' }}
      />
      <div className="mt-1 flex gap-0.5">
        {data.map((d) => (
          <span
            key={d.date}
            className={`flex-1 text-center text-[10px] ${isToday(d.date) ? 'font-bold text-ink-2' : 'text-ink-muted'}`}
          >
            {WEEKDAY_SHORT[fromDayISO(d.date).getDay()].charAt(0).toUpperCase()}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-ink-muted">
          {total === 0 ? 'Sem registros ainda' : `Total: ${formatMinutes(total)}`}
        </span>
        <button
          type="button"
          onClick={() => setShowTable(true)}
          className="text-xs font-medium text-accent underline underline-offset-2"
        >
          Ver tabela
        </button>
      </div>
    </div>
  );
}
