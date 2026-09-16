import { Link } from 'react-router-dom';
import type { Reminder } from '@/domain/types';
import { useDispatch } from '@/state/store';
import { Button } from '@/components/ui/Button';

const TONE: Record<Reminder['severity'], { color: string; emoji: string; label: string }> = {
  critical: { color: 'var(--color-critical)', emoji: '⚠️', label: 'Urgente' },
  warning: { color: 'var(--color-warning)', emoji: '⏳', label: 'Atenção' },
  info: { color: 'var(--c1)', emoji: 'ℹ️', label: 'Aviso' },
};

/**
 * The reminder inbox. Severity is carried by an icon and a written label, not
 * by the colour strip alone.
 */
export function ReminderPanel({
  reminders,
  onClose,
}: {
  reminders: Reminder[];
  onClose: () => void;
}) {
  const dispatch = useDispatch();

  return (
    <div className="border-t border-hairline bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            Lembretes {reminders.length > 0 ? `(${reminders.length})` : ''}
          </h2>
          {reminders.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'reminders/dismissAll', ids: reminders.map((r) => r.id) })}
            >
              Marcar tudo como visto
            </Button>
          ) : null}
        </div>

        {reminders.length === 0 ? (
          <p className="py-4 text-sm text-ink-muted">
            Nenhum lembrete agora. Cadastre provas e atividades para ser avisado com antecedência.
          </p>
        ) : (
          <ul className="max-h-[50dvh] space-y-2 overflow-y-auto">
            {reminders.map((reminder) => {
              const tone = TONE[reminder.severity];
              return (
                <li
                  key={reminder.id}
                  className="flex items-start gap-3 rounded-xl border border-hairline bg-surface-2 p-3"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 w-1 self-stretch rounded-full"
                    style={{ background: tone.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <span aria-hidden="true">{tone.emoji}</span>
                      <span className="truncate">{reminder.title}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-ink-2">{reminder.body}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
                        {tone.label}
                      </span>
                      {reminder.href ? (
                        <Link
                          to={reminder.href.replace('#', '')}
                          onClick={onClose}
                          className="text-xs font-semibold text-accent underline underline-offset-2"
                        >
                          Abrir
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'reminders/dismiss', id: reminder.id })}
                        className="text-xs font-medium text-ink-muted underline underline-offset-2 hover:text-ink-2"
                      >
                        Dispensar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
