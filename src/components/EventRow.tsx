import { EVENT_TYPE_MAP, PRIORITY_MAP } from '@/domain/constants';
import type { SchoolEvent } from '@/domain/types';
import { formatCountdown, formatShort } from '@/lib/date';
import { eventStatus } from '@/services/selectors';
import { useAppState, useDispatch } from '@/state/store';
import { SubjectTag } from './SubjectTag';

/**
 * One row in a list of exams, assignments or activities.
 *
 * Type is shown with an emoji, a colour chip and the written type; status with
 * an icon and a word. Nothing here depends on colour alone.
 */
export function EventRow({
  event,
  onEdit,
  compact = false,
}: {
  event: SchoolEvent;
  onEdit?: (event: SchoolEvent) => void;
  compact?: boolean;
}) {
  const state = useAppState();
  const dispatch = useDispatch();
  const subject = state.subjects.find((s) => s.id === event.subjectId);
  const type = EVENT_TYPE_MAP[event.type];
  const status = eventStatus(event);
  const done = status === 'concluido';
  const late = status === 'atrasado';

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border p-3 transition ${
        late ? 'border-[var(--color-critical)]/40 bg-[var(--color-critical)]/5' : 'border-hairline bg-surface'
      }`}
    >
      <button
        type="button"
        onClick={() => dispatch({ type: 'event/toggleDone', id: event.id })}
        aria-pressed={done}
        aria-label={done ? `Reabrir ${event.title}` : `Marcar ${event.title} como concluído`}
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 text-xs transition ${
          done
            ? 'border-[var(--color-good)] bg-[var(--color-good)] text-white'
            : 'border-hairline-strong text-transparent hover:border-accent'
        }`}
      >
        <span aria-hidden="true">✓</span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`min-w-0 font-semibold ${done ? 'text-ink-muted line-through' : 'text-ink'}`}
          >
            <span aria-hidden="true" className="mr-1">
              {type.emoji}
            </span>
            {event.title}
          </p>
          <span
            className={`shrink-0 text-xs font-semibold whitespace-nowrap ${
              late ? 'text-[var(--color-critical)]' : done ? 'text-ink-muted' : 'text-ink-2'
            }`}
          >
            {late ? `Atrasado · ${formatShort(event.date)}` : formatCountdown(event.date)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <SubjectTag subject={subject} size="sm" />
          <span className="flex items-center gap-1 text-xs text-ink-muted">
            <span aria-hidden="true" className="size-2 rounded-sm" style={{ background: type.color }} />
            {type.label}
          </span>
          {event.time ? <span className="tabular text-xs text-ink-muted">{event.time}</span> : null}
          {event.priority !== 'media' ? (
            <span className="text-xs text-ink-muted">
              <span aria-hidden="true" style={{ color: PRIORITY_MAP[event.priority].color }}>
                {PRIORITY_MAP[event.priority].emoji}
              </span>{' '}
              Prioridade {PRIORITY_MAP[event.priority].label.toLowerCase()}
            </span>
          ) : null}
          {event.contentIds.length > 0 ? (
            <span className="text-xs text-ink-muted">
              {event.contentIds.length} {event.contentIds.length === 1 ? 'conteúdo' : 'conteúdos'}
            </span>
          ) : null}
        </div>

        {!compact && event.description ? (
          <p className="mt-1.5 text-sm text-ink-muted">{event.description}</p>
        ) : null}
      </div>

      {onEdit ? (
        <button
          type="button"
          onClick={() => onEdit(event)}
          aria-label={`Editar ${event.title}`}
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-hover hover:text-ink"
        >
          <span aria-hidden="true">✏️</span>
        </button>
      ) : null}
    </li>
  );
}
