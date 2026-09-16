import { useEffect, useMemo, useState } from 'react';
import { EVENT_TYPES, LEAD_DAY_OPTIONS, PRIORITIES } from '@/domain/constants';
import type { EventType, ID, Priority, SchoolEvent } from '@/domain/types';
import { today } from '@/lib/date';
import { nowISO, uid } from '@/lib/ids';
import { Button } from '@/components/ui/Button';
import { ChipGroup, SegmentedControl, SelectField, TextArea, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useAppState, useDispatch } from '@/state/store';

interface Draft {
  title: string;
  type: EventType;
  subjectId: string;
  date: string;
  time: string;
  description: string;
  priority: Priority;
  contentIds: ID[];
  leadDays: number[];
  useCustomLead: boolean;
}

function draftFrom(event: SchoolEvent | undefined, defaults: Partial<Draft>): Draft {
  if (event) {
    return {
      title: event.title,
      type: event.type,
      subjectId: event.subjectId ?? '',
      date: event.date,
      time: event.time ?? '',
      description: event.description ?? '',
      priority: event.priority,
      contentIds: event.contentIds,
      leadDays: event.leadDays ?? [],
      useCustomLead: Boolean(event.leadDays?.length),
    };
  }
  return {
    title: '',
    type: 'prova',
    subjectId: '',
    date: today(),
    time: '',
    description: '',
    priority: 'media',
    contentIds: [],
    leadDays: [],
    useCustomLead: false,
    ...defaults,
  };
}

/**
 * Create or edit anything that goes on the calendar.
 *
 * The content picker is the important part: linking an exam to syllabus topics
 * is what lets the study plan answer "what do I study for this exam?".
 */
export function EventForm({
  open,
  onClose,
  event,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  event?: SchoolEvent;
  defaults?: Partial<Draft>;
}) {
  const state = useAppState();
  const dispatch = useDispatch();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(event, defaults ?? {}));
  const [contentQuery, setContentQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset whenever the sheet is reopened for a different event.
  useEffect(() => {
    if (open) {
      setDraft(draftFrom(event, defaults ?? {}));
      setContentQuery('');
      setError(null);
    }
  }, [open, event, defaults]);

  const subjects = state.subjects.filter((s) => !s.archived);

  const availableContents = useMemo(() => {
    const query = contentQuery.trim().toLowerCase();
    return state.contents
      .filter((c) => (draft.subjectId ? c.subjectId === draft.subjectId : false))
      .filter((c) => (query ? c.name.toLowerCase().includes(query) : true))
      .sort((a, b) => a.year - b.year || a.order - b.order);
  }, [state.contents, draft.subjectId, contentQuery]);

  const unitName = (unitId: string) => state.units.find((u) => u.id === unitId)?.name ?? '';

  function toggleContent(id: ID) {
    setDraft((d) => ({
      ...d,
      contentIds: d.contentIds.includes(id)
        ? d.contentIds.filter((c) => c !== id)
        : [...d.contentIds, id],
    }));
  }

  function submit() {
    if (!draft.title.trim()) {
      setError('Dê um nome ao compromisso.');
      return;
    }
    if (!draft.date) {
      setError('Escolha uma data.');
      return;
    }

    const payload = {
      title: draft.title.trim(),
      type: draft.type,
      subjectId: draft.subjectId || null,
      date: draft.date,
      time: draft.time || undefined,
      description: draft.description.trim() || undefined,
      priority: draft.priority,
      contentIds: draft.contentIds,
      leadDays: draft.useCustomLead && draft.leadDays.length > 0 ? draft.leadDays : undefined,
    };

    if (event) {
      dispatch({ type: 'event/update', id: event.id, patch: payload });
    } else {
      dispatch({
        type: 'event/add',
        event: {
          id: uid('ev'),
          ...payload,
          status: 'pendente',
          createdAt: nowISO(),
          updatedAt: nowISO(),
        },
      });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={event ? 'Editar compromisso' : 'Novo compromisso'}
      description="Provas, trabalhos, atividades, seminários, apresentações, projetos e simulados."
      footer={
        <>
          {event ? (
            <Button
              variant="ghost"
              onClick={() => {
                dispatch({ type: 'event/remove', id: event.id });
                onClose();
              }}
              className="mr-auto text-[var(--color-critical)]"
            >
              Excluir
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit}>{event ? 'Salvar' : 'Adicionar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-2">Tipo</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {EVENT_TYPES.map((type) => {
              const active = type.value === draft.type;
              return (
                <button
                  key={type.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDraft((d) => ({ ...d, type: type.value }))}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition ${
                    active
                      ? 'border-accent bg-accent-soft text-accent-soft-ink'
                      : 'border-hairline bg-surface-2 text-ink-2 hover:bg-surface-hover'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: type.color }}
                  />
                  <span className="truncate">
                    <span aria-hidden="true">{type.emoji}</span> {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <TextField
          label="Nome"
          placeholder="Ex.: Prova de Matemática — 2º bimestre"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Disciplina"
            value={draft.subjectId}
            onChange={(e) => setDraft((d) => ({ ...d, subjectId: e.target.value, contentIds: [] }))}
            options={[
              { value: '', label: 'Selecione…' },
              ...subjects.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <SegmentedControl
            label="Prioridade"
            value={draft.priority}
            onChange={(priority) => setDraft((d) => ({ ...d, priority }))}
            options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Data"
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
          />
          <TextField
            label="Horário"
            hint="opcional"
            type="time"
            value={draft.time}
            onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
          />
        </div>

        <TextArea
          label="Descrição"
          hint="opcional"
          placeholder="Capítulos, páginas, formato do trabalho, critérios de avaliação…"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
        />

        {/* Content linking — the bridge between the calendar and the syllabus */}
        <div className="rounded-xl border border-hairline bg-surface-2 p-3">
          <p className="text-sm font-medium text-ink-2">Conteúdo relacionado</p>
          <p className="mt-0.5 mb-2 text-xs text-ink-muted">
            Marque o que cai. O plano de estudos usa essa ligação para dizer o que estudar.
          </p>

          {!draft.subjectId ? (
            <p className="py-2 text-sm text-ink-muted">Escolha uma disciplina primeiro.</p>
          ) : (
            <>
              <input
                type="search"
                value={contentQuery}
                onChange={(e) => setContentQuery(e.target.value)}
                placeholder="Buscar conteúdo…"
                aria-label="Buscar conteúdo"
                className="mb-2 w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {availableContents.length === 0 ? (
                  <p className="py-2 text-sm text-ink-muted">Nenhum conteúdo encontrado.</p>
                ) : (
                  availableContents.map((content) => {
                    const checked = draft.contentIds.includes(content.id);
                    return (
                      <label
                        key={content.id}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 text-sm transition ${
                          checked ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface-hover'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleContent(content.id)}
                          className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                        />
                        <span className="min-w-0">
                          <span className={`block truncate ${checked ? 'font-semibold text-accent-soft-ink' : 'text-ink'}`}>
                            {content.name}
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            {content.year}º ano · {unitName(content.unitId)}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {draft.contentIds.length > 0 ? (
                <p className="mt-2 text-xs font-medium text-accent">
                  {draft.contentIds.length}{' '}
                  {draft.contentIds.length === 1 ? 'conteúdo marcado' : 'conteúdos marcados'}
                </p>
              ) : null}
            </>
          )}
        </div>

        {/* Per-event reminder override */}
        <div className="rounded-xl border border-hairline bg-surface-2 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-ink-2">
            <input
              type="checkbox"
              checked={draft.useCustomLead}
              onChange={(e) => setDraft((d) => ({ ...d, useCustomLead: e.target.checked }))}
              className="size-4 accent-[var(--accent)]"
            />
            Definir antecedência do lembrete só para este compromisso
          </label>
          {draft.useCustomLead ? (
            <div className="mt-3">
              <ChipGroup
                options={LEAD_DAY_OPTIONS.map((d) => ({
                  value: d,
                  label: d === 0 ? 'No dia' : d === 1 ? '1 dia antes' : `${d} dias antes`,
                }))}
                selected={draft.leadDays}
                onToggle={(value) =>
                  setDraft((d) => ({
                    ...d,
                    leadDays: d.leadDays.includes(value)
                      ? d.leadDays.filter((x) => x !== value)
                      : [...d.leadDays, value],
                  }))
                }
              />
            </div>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">
              Usando sua configuração geral:{' '}
              {state.reminderSettings.leadDays
                .slice()
                .sort((a, b) => b - a)
                .map((d) => (d === 0 ? 'no dia' : `${d}d`))
                .join(', ')}
              .
            </p>
          )}
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-[var(--color-critical)]">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
