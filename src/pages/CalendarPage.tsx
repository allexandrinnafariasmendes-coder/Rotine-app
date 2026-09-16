import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EVENT_TYPES, EVENT_TYPE_MAP } from '@/domain/constants';
import type { EventType, SchoolEvent } from '@/domain/types';
import {
  addDays,
  addMonths,
  formatDayMonth,
  formatMonthYear,
  fromDayISO,
  isToday,
  monthGrid,
  sameMonth,
  startOfWeek,
  today,
  WEEKDAY_SHORT,
  weekDays,
} from '@/lib/date';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChipGroup, SegmentedControl } from '@/components/ui/Field';
import { EventRow } from '@/components/EventRow';
import { EventForm } from '@/components/forms/EventForm';
import { eventStatus, eventsInRange, eventsOnDay, subjectById } from '@/services/selectors';
import { useAppState } from '@/state/store';

type View = 'mes' | 'semana' | 'lista';

export function CalendarPage() {
  const state = useAppState();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>('mes');
  const [cursor, setCursor] = useState(today());
  const [selected, setSelected] = useState(today());
  const [typeFilter, setTypeFilter] = useState<EventType[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolEvent | undefined>();

  // Deep link from a reminder: `?evento=<id>` opens that event for editing.
  useEffect(() => {
    const id = params.get('evento');
    if (!id) return;
    const event = state.events.find((e) => e.id === id);
    if (event) {
      setEditing(event);
      setFormOpen(true);
      setCursor(event.date);
      setSelected(event.date);
    }
    const next = new URLSearchParams(params);
    next.delete('evento');
    setParams(next, { replace: true });
  }, [params, setParams, state.events]);

  const matchesFilter = (event: SchoolEvent) =>
    typeFilter.length === 0 || typeFilter.includes(event.type);

  const days = view === 'semana' ? weekDays(cursor) : monthGrid(cursor);

  const countsByDay = useMemo(() => {
    const from = days[0];
    const to = days[days.length - 1];
    const map = new Map<string, SchoolEvent[]>();
    for (const event of eventsInRange(state, from, to)) {
      if (!matchesFilter(event)) continue;
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, days[0], days[days.length - 1], typeFilter]);

  const selectedEvents = eventsOnDay(state, selected).filter(matchesFilter);

  const listEvents = useMemo(
    () =>
      state.events
        .filter(matchesFilter)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.events, typeFilter],
  );

  function openNew(date: string) {
    setEditing(undefined);
    setSelected(date);
    setFormOpen(true);
  }

  function shift(direction: -1 | 1) {
    if (view === 'semana') setCursor((c) => addDays(c, direction * 7));
    else setCursor((c) => addMonths(c, direction));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <SegmentedControl
            value={view}
            onChange={(v) => setView(v)}
            options={[
              { value: 'mes', label: 'Mês' },
              { value: 'semana', label: 'Semana' },
              { value: 'lista', label: 'Lista' },
            ]}
          />
        </div>
        <Button icon="＋" onClick={() => openNew(selected)}>
          Novo
        </Button>
      </div>

      <ChipGroup
        options={EVENT_TYPES.map((t) => ({
          value: t.value,
          label: t.label,
          emoji: t.emoji,
          color: t.color,
        }))}
        selected={typeFilter}
        onToggle={(value) =>
          setTypeFilter((f) => (f.includes(value) ? f.filter((v) => v !== value) : [...f, value]))
        }
        hint={typeFilter.length === 0 ? '(mostrando todos)' : undefined}
        label="Filtrar por tipo"
      />

      {view !== 'lista' ? (
        <Card padded={false}>
          <div className="flex items-center justify-between gap-2 border-b border-hairline px-3 py-2.5">
            <Button variant="ghost" size="sm" onClick={() => shift(-1)} aria-label="Anterior">
              ‹
            </Button>
            <p className="text-sm font-semibold">
              {view === 'semana'
                ? `${formatDayMonth(startOfWeek(cursor))} – ${formatDayMonth(addDays(startOfWeek(cursor), 6))}`
                : formatMonthYear(cursor)}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setCursor(today())}>
                Hoje
              </Button>
              <Button variant="ghost" size="sm" onClick={() => shift(1)} aria-label="Próximo">
                ›
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-hairline">
            {WEEKDAY_SHORT.map((label) => (
              <span
                key={label}
                className="py-1.5 text-center text-[11px] font-medium text-ink-muted uppercase"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const events = countsByDay.get(day) ?? [];
              const outside = view === 'mes' && !sameMonth(day, cursor);
              const isSelected = day === selected;
              const hasLate = events.some((e) => eventStatus(e) === 'atrasado');
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelected(day)}
                  onDoubleClick={() => openNew(day)}
                  aria-current={isToday(day) ? 'date' : undefined}
                  aria-label={`${fromDayISO(day).getDate()} de ${formatDayMonth(day)}, ${events.length} compromissos`}
                  className={`relative flex min-h-16 flex-col items-center gap-1 border-b border-r border-hairline/60 p-1.5 text-center transition last:border-r-0 sm:min-h-20 ${
                    isSelected ? 'bg-accent-soft' : 'hover:bg-surface-hover'
                  } ${outside ? 'opacity-40' : ''}`}
                >
                  <span
                    className={`tabular grid size-6 place-items-center rounded-full text-xs font-semibold ${
                      isToday(day)
                        ? 'bg-accent text-accent-ink'
                        : isSelected
                          ? 'text-accent-soft-ink'
                          : 'text-ink-2'
                    }`}
                  >
                    {fromDayISO(day).getDate()}
                  </span>
                  <span className="flex max-w-full flex-wrap items-center justify-center gap-0.5">
                    {events.slice(0, 4).map((event) => (
                      <span
                        key={event.id}
                        title={`${EVENT_TYPE_MAP[event.type].label}: ${event.title}`}
                        aria-hidden="true"
                        className="size-1.5 rounded-full"
                        style={{
                          background:
                            eventStatus(event) === 'concluido'
                              ? 'var(--hairline-strong)'
                              : EVENT_TYPE_MAP[event.type].color,
                        }}
                      />
                    ))}
                    {events.length > 4 ? (
                      <span className="text-[9px] leading-none text-ink-muted">
                        +{events.length - 4}
                      </span>
                    ) : null}
                  </span>
                  {hasLate ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-1 text-[9px]"
                      title="Há item atrasado"
                    >
                      ⚠️
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Legend — required whenever more than one category is on screen */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-hairline px-3 py-2">
            {EVENT_TYPES.map((type) => (
              <span key={type.value} className="flex items-center gap-1 text-[11px] text-ink-muted">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ background: type.color }}
                />
                {type.label}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      {view === 'lista' ? (
        <Card>
          <CardHeader icon="🗂️" title={`Todos os compromissos (${listEvents.length})`} />
          {listEvents.length === 0 ? (
            <EmptyState
              emoji="📅"
              title="Sua agenda está vazia"
              description="Cadastre a primeira prova ou atividade para o app começar a te ajudar."
              action={<Button size="sm" onClick={() => openNew(today())}>Adicionar</Button>}
            />
          ) : (
            <ul className="space-y-2">
              {listEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onEdit={(e) => {
                    setEditing(e);
                    setFormOpen(true);
                  }}
                />
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader
            icon="📍"
            title={formatDayMonth(selected)}
            subtitle={
              selectedEvents.length === 0
                ? 'Nenhum compromisso neste dia'
                : `${selectedEvents.length} ${selectedEvents.length === 1 ? 'compromisso' : 'compromissos'}`
            }
            action={
              <Button variant="secondary" size="sm" onClick={() => openNew(selected)}>
                Adicionar
              </Button>
            }
          />
          {selectedEvents.length === 0 ? (
            <p className="py-3 text-sm text-ink-muted">
              Toque duas vezes em um dia do calendário para criar algo direto nele.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onEdit={(e) => {
                    setEditing(e);
                    setFormOpen(true);
                  }}
                />
              ))}
            </ul>
          )}
          {selectedEvents.some((e) => e.contentIds.length > 0) ? (
            <div className="mt-3 rounded-xl border border-hairline bg-surface-2 p-3">
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-2 uppercase">
                Conteúdos deste dia
              </p>
              <ul className="space-y-1">
                {selectedEvents.flatMap((event) =>
                  event.contentIds.map((contentId) => {
                    const content = state.contents.find((c) => c.id === contentId);
                    if (!content) return null;
                    return (
                      <li key={`${event.id}-${contentId}`} className="text-sm text-ink-2">
                        <span
                          aria-hidden="true"
                          className="mr-1.5 inline-block size-2 rounded-full align-middle"
                          style={{
                            background: subjectById(state, content.subjectId)
                              ? `var(--c${subjectById(state, content.subjectId)!.colorSlot})`
                              : 'var(--ink-muted)',
                          }}
                        />
                        {content.name}
                      </li>
                    );
                  }),
                )}
              </ul>
            </div>
          ) : null}
        </Card>
      )}

      <EventForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        event={editing}
        defaults={{ date: selected }}
      />
    </div>
  );
}
