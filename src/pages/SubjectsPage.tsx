import { useState } from 'react';
import { CATEGORICAL_SLOTS, slotColor } from '@/domain/constants';
import type { Subject } from '@/domain/types';
import { slug } from '@/lib/ids';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { breakdownFor, completionRatio } from '@/services/progress';
import { useAppState, useDispatch } from '@/state/store';

const EMOJI_CHOICES = ['📖', '📚', '📐', '🧲', '⚗️', '🧬', '🏛️', '🌍', '🤔', '👥', '🇬🇧', '🎨', '🏃', '💻', '🎼', '🧮'];

export function SubjectsPage() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [editing, setEditing] = useState<Subject | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', shortName: '', emoji: '📘', colorSlot: 1 });

  const active = state.subjects.filter((s) => !s.archived);
  const archived = state.subjects.filter((s) => s.archived);

  function openCreate() {
    setDraft({ name: '', shortName: '', emoji: '📘', colorSlot: 1 });
    setCreating(true);
  }

  function openEdit(subject: Subject) {
    setDraft({
      name: subject.name,
      shortName: subject.shortName,
      emoji: subject.emoji,
      colorSlot: subject.colorSlot,
    });
    setEditing(subject);
  }

  function save() {
    const name = draft.name.trim();
    if (!name) return;
    const shortName = (draft.shortName.trim() || name.slice(0, 3)).toUpperCase();

    if (editing) {
      dispatch({
        type: 'subject/update',
        id: editing.id,
        patch: { name, shortName, emoji: draft.emoji, colorSlot: draft.colorSlot },
      });
      setEditing(null);
    } else {
      dispatch({
        type: 'subject/add',
        subject: {
          id: `custom-${slug(name)}`,
          name,
          shortName,
          emoji: draft.emoji,
          colorSlot: draft.colorSlot,
          custom: true,
        },
      });
      setCreating(false);
    }
  }

  const form = (
    <div className="space-y-4">
      <TextField
        label="Nome da disciplina"
        placeholder="Ex.: Redação"
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
      />
      <TextField
        label="Sigla"
        hint="até 4 letras"
        placeholder="RED"
        maxLength={4}
        value={draft.shortName}
        onChange={(e) => setDraft((d) => ({ ...d, shortName: e.target.value }))}
      />
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">Ícone</p>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_CHOICES.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-pressed={draft.emoji === emoji}
              onClick={() => setDraft((d) => ({ ...d, emoji }))}
              className={`grid size-10 place-items-center rounded-xl border text-lg transition ${
                draft.emoji === emoji
                  ? 'border-accent bg-accent-soft'
                  : 'border-hairline bg-surface-2 hover:bg-surface-hover'
              }`}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">Cor</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORICAL_SLOTS.map((slotIndex) => (
            <button
              key={slotIndex}
              type="button"
              aria-label={`Cor ${slotIndex}`}
              aria-pressed={draft.colorSlot === slotIndex}
              onClick={() => setDraft((d) => ({ ...d, colorSlot: slotIndex }))}
              className={`size-9 rounded-xl border-2 transition ${
                draft.colorSlot === slotIndex ? 'border-ink' : 'border-transparent'
              }`}
              style={{ background: slotColor(slotIndex) }}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-muted">
          As cores vêm de uma paleta testada para daltonismo e contraste. O nome sempre acompanha a
          cor.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-ink-2">
            As disciplinas do Ensino Médio já vêm cadastradas com a ementa. Você pode renomear,
            trocar a cor, adicionar novas ou arquivar as que não tem.
          </p>
          <Button size="sm" onClick={openCreate}>
            ＋ Nova
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader icon="📚" title={`Minhas disciplinas (${active.length})`} />
        <ul className="space-y-2">
          {active.map((subject) => {
            const ids = state.contents
              .filter((c) => c.subjectId === subject.id && c.year === state.profile.year)
              .map((c) => c.id);
            const ratio = completionRatio(breakdownFor(state, ids));
            const totalContents = state.contents.filter((c) => c.subjectId === subject.id).length;
            return (
              <li
                key={subject.id}
                className="rounded-xl border border-hairline bg-surface p-3"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-lg"
                    style={{ background: 'var(--surface-2)' }}
                  >
                    {subject.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-semibold text-ink">
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: slotColor(subject.colorSlot) }}
                      />
                      <span className="truncate">{subject.name}</span>
                    </p>
                    <p className="text-xs text-ink-muted">
                      {subject.shortName} · {totalContents} conteúdos na ementa
                    </p>
                    {ids.length > 0 ? (
                      <div className="mt-2">
                        <ProgressBar value={ratio} showValue={false} height={4} />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(subject)}
                      aria-label={`Editar ${subject.name}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-hover hover:text-ink"
                    >
                      <span aria-hidden="true">✏️</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'subject/remove', id: subject.id })}
                      aria-label={`Remover ${subject.name}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-hover hover:text-[var(--color-critical)]"
                    >
                      <span aria-hidden="true">🗑️</span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          Disciplinas com provas ou sessões registradas são arquivadas em vez de excluídas, para o
          seu histórico continuar legível.
        </p>
      </Card>

      {archived.length > 0 ? (
        <Card>
          <CardHeader icon="🗄️" title={`Arquivadas (${archived.length})`} />
          <ul className="space-y-2">
            {archived.map((subject) => (
              <li
                key={subject.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface-2 p-3"
              >
                <span className="min-w-0 truncate text-sm text-ink-2">
                  {subject.emoji} {subject.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    dispatch({ type: 'subject/update', id: subject.id, patch: { archived: false } })
                  }
                >
                  Restaurar
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Editar disciplina' : 'Nova disciplina'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </>
        }
      >
        {form}
      </Modal>
    </div>
  );
}
