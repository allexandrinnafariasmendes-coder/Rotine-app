import { Link } from 'react-router-dom';
import { NAV_ITEMS } from '@/components/layout/nav';
import { Card } from '@/components/ui/Card';
import { activeReminders } from '@/services/reminders';
import { overallProgress } from '@/services/progress';
import { useAppState } from '@/state/store';
import { formatMinutes } from '@/lib/date';

/** Secondary navigation for phones, where the bottom bar only fits five tabs. */
export function MorePage() {
  const state = useAppState();
  const progress = overallProgress(state);
  const reminders = activeReminders(state);
  const secondary = NAV_ITEMS.filter((item) => !item.primary);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-2xl"
          >
            {state.profile.emoji}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{state.profile.name.trim() || 'Estudante'}</p>
            <p className="text-xs text-ink-muted">
              {state.profile.year}º ano · {Math.round(progress.ratio * 100)}% da ementa ·{' '}
              {formatMinutes(progress.totalMinutes)} estudados
            </p>
          </div>
        </div>
      </Card>

      <Card padded={false}>
        <ul className="divide-y divide-hairline">
          {secondary.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-hover"
              >
                <span aria-hidden="true" className="text-lg">
                  {item.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{item.label}</span>
                {item.to === '/ajustes' && reminders.length > 0 ? (
                  <span className="tabular rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-ink">
                    {reminders.length}
                  </span>
                ) : null}
                <span aria-hidden="true" className="text-ink-muted">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <p className="px-2 text-center text-xs text-ink-muted">
        Rotine · organização escolar, ementa do Ensino Médio, plano de estudos e lembretes em um só
        lugar.
      </p>
    </div>
  );
}
