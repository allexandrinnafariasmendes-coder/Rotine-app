import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DIFFICULTIES, SCHOOL_YEARS, STUDY_STATUSES, STUDY_STATUS_MAP, slotColor } from '@/domain/constants';
import type { CurriculumContent, SchoolYear, StudyStatus } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SegmentedControl, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { breakdownFor, completionRatio } from '@/services/progress';
import { contentsOfUnit, progressOf, unitsOfSubject } from '@/services/selectors';
import { useAppState, useDispatch } from '@/state/store';
import { slug, uid } from '@/lib/ids';

/** The four status cycling buttons. Icon plus label, colour as reinforcement. */
function StatusPicker({
  value,
  onChange,
}: {
  value: StudyStatus;
  onChange: (status: StudyStatus) => void;
}) {
  return (
    <div role="group" aria-label="Situação do conteúdo" className="flex flex-wrap gap-1">
      {STUDY_STATUSES.map((status) => {
        const active = status.value === value;
        return (
          <button
            key={status.value}
            type="button"
            aria-pressed={active}
            title={status.label}
            onClick={() => onChange(status.value)}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition ${
              active
                ? 'border-transparent text-white'
                : 'border-hairline bg-surface-2 text-ink-muted hover:bg-surface-hover'
            }`}
            style={active ? { background: status.color, color: '#fff' } : undefined}
          >
            <span aria-hidden="true">{status.emoji}</span>
            <span className={active ? '' : 'hidden sm:inline'}>{status.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ContentRow({ content }: { content: CurriculumContent }) {
  const state = useAppState();
  const dispatch = useDispatch();
  const progress = progressOf(state, content.id);
  const [open, setOpen] = useState(false);
  const status = STUDY_STATUS_MAP[progress.status];
  const doneCount = progress.doneSubtopics.length;
  const subtopicRatio =
    content.subtopics.length === 0 ? 0 : doneCount / content.subtopics.length;

  return (
    <li className="rounded-xl border border-hairline bg-surface">
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <p className="flex items-center gap-1.5 font-medium text-ink">
            <span aria-hidden="true" style={{ color: status.color }}>
              {status.emoji}
            </span>
            <span className="min-w-0 truncate">{content.name}</span>
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {content.subtopics.length} {content.subtopics.length === 1 ? 'subtópico' : 'subtópicos'}
            {doneCount > 0 ? ` · ${doneCount} concluídos` : ''} · {status.label}
            {progress.difficulty ? ` · ${DIFFICULTIES.find((d) => d.value === progress.difficulty)?.label}` : ''}
          </p>
        </button>
        <Link
          to={`/estudar?conteudo=${content.id}`}
          className="shrink-0 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-ink-2 transition hover:bg-surface-hover hover:text-ink"
        >
          Estudar
        </Link>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-hairline px-3 py-3">
          <StatusPicker
            value={progress.status}
            onChange={(status) =>
              dispatch({ type: 'progress/setStatus', contentId: content.id, status })
            }
          />

          {content.subtopics.length > 0 ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-ink-2 uppercase">
                  Subconteúdos
                </p>
                <span className="tabular text-xs text-ink-muted">
                  {doneCount}/{content.subtopics.length}
                </span>
              </div>
              <ProgressBar value={subtopicRatio} showValue={false} height={4} />
              <ul className="mt-2 space-y-1">
                {content.subtopics.map((subtopic) => {
                  const checked = progress.doneSubtopics.includes(subtopic);
                  return (
                    <li key={subtopic}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm transition hover:bg-surface-hover">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            dispatch({
                              type: 'progress/toggleSubtopic',
                              contentId: content.id,
                              subtopic,
                            })
                          }
                          className="size-4 accent-[var(--accent)]"
                        />
                        <span className={checked ? 'text-ink-muted line-through' : 'text-ink-2'}>
                          {subtopic}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-2 uppercase">
              Como você se sente nesse conteúdo?
            </p>
            <div className="flex flex-wrap gap-1">
              {DIFFICULTIES.map((difficulty) => {
                const active = progress.difficulty === difficulty.value;
                return (
                  <button
                    key={difficulty.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      dispatch({
                        type: 'progress/setDifficulty',
                        contentId: content.id,
                        difficulty: active ? undefined : difficulty.value,
                      })
                    }
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? 'border-accent bg-accent-soft text-accent-soft-ink'
                        : 'border-hairline bg-surface-2 text-ink-muted hover:bg-surface-hover'
                    }`}
                  >
                    <span aria-hidden="true">{difficulty.emoji}</span>
                    {difficulty.label}
                  </button>
                );
              })}
            </div>
          </div>

          {progress.notes ? (
            <p className="rounded-lg bg-surface-2 p-2.5 text-sm text-ink-2">
              <span className="font-semibold">Sua anotação: </span>
              {progress.notes}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function SyllabusPage() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [year, setYear] = useState<SchoolYear>(state.profile.year);
  const [subjectId, setSubjectId] = useState<string>(state.subjects[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudyStatus | 'todos'>('todos');
  const [addOpen, setAddOpen] = useState(false);
  const [newContent, setNewContent] = useState({ unitId: '', name: '', subtopics: '' });

  const subjects = state.subjects.filter((s) => !s.archived);
  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  const units = subject ? unitsOfSubject(state, subject.id, year) : [];

  const subjectRatio = useMemo(() => {
    if (!subject) return 0;
    const ids = state.contents
      .filter((c) => c.subjectId === subject.id && c.year === year)
      .map((c) => c.id);
    return completionRatio(breakdownFor(state, ids));
  }, [state, subject, year]);

  const filterContents = (contents: CurriculumContent[]) => {
    const q = query.trim().toLowerCase();
    return contents.filter((content) => {
      if (statusFilter !== 'todos' && progressOf(state, content.id).status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        content.name.toLowerCase().includes(q) ||
        content.subtopics.some((s) => s.toLowerCase().includes(q))
      );
    });
  };

  function addCustomContent() {
    if (!subject || !newContent.name.trim()) return;
    const unitId = newContent.unitId || units[0]?.id;
    if (!unitId) return;
    dispatch({
      type: 'content/add',
      content: {
        id: `custom-${slug(newContent.name)}-${uid('c').slice(-6)}`,
        unitId,
        subjectId: subject.id,
        year,
        name: newContent.name.trim(),
        subtopics: newContent.subtopics
          .split(/[,\n;]/)
          .map((s) => s.trim())
          .filter(Boolean),
        order: 999,
        custom: true,
      },
    });
    setNewContent({ unitId: '', name: '', subtopics: '' });
    setAddOpen(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-ink-2">
          A ementa do Ensino Médio organizada em{' '}
          <strong className="font-semibold text-ink">ano → disciplina → unidade → conteúdo → subconteúdos</strong>.
          Marque cada conteúdo conforme avança: o plano de estudos e a revisão usam essas marcas.
        </p>
        <div className="mt-3">
          <SegmentedControl
            label="Ano/série"
            value={String(year)}
            onChange={(v) => setYear(Number(v) as SchoolYear)}
            options={SCHOOL_YEARS.map((y) => ({ value: String(y.value), label: y.label }))}
          />
        </div>
      </Card>

      {/* Subject rail */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {subjects.map((s) => {
          const active = s.id === subject?.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSubjectId(s.id)}
              aria-pressed={active}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                active
                  ? 'border-accent bg-accent-soft text-accent-soft-ink'
                  : 'border-hairline bg-surface text-ink-2 hover:bg-surface-hover'
              }`}
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ background: slotColor(s.colorSlot) }}
              />
              <span aria-hidden="true">{s.emoji}</span>
              {s.shortName}
            </button>
          );
        })}
      </div>

      {subject ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <span aria-hidden="true">{subject.emoji}</span>
                <span className="truncate">{subject.name}</span>
              </h2>
              <p className="text-sm text-ink-muted">
                {year}º ano · {units.length} {units.length === 1 ? 'unidade' : 'unidades'}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
              ＋ Conteúdo
            </Button>
          </div>
          <div className="mt-3">
            <ProgressBar value={subjectRatio} label="Progresso na disciplina" />
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <TextField
          label="Buscar"
          type="search"
          placeholder="Ex.: funções, genética, crase…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="sm:w-64">
          <SegmentedControl
            label="Situação"
            size="sm"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StudyStatus | 'todos')}
            options={[
              { value: 'todos', label: 'Todos' },
              ...STUDY_STATUSES.map((s) => ({ value: s.value, label: s.emoji })),
            ]}
          />
        </div>
      </div>

      {units.length === 0 ? (
        <Card>
          <EmptyState
            emoji="🧭"
            title="Nenhuma unidade cadastrada"
            description={`A ementa deste ano ainda não tem conteúdos para ${subject?.name ?? 'esta disciplina'}. Você pode adicionar os seus.`}
            action={<Button size="sm" onClick={() => setAddOpen(true)}>Adicionar conteúdo</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {units.map((unit, index) => {
            const contents = filterContents(contentsOfUnit(state, unit.id));
            if (contents.length === 0) return null;
            const breakdown = breakdownFor(
              state,
              contentsOfUnit(state, unit.id).map((c) => c.id),
            );
            return (
              <Card key={unit.id}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="min-w-0 text-base font-semibold">
                    <span className="tabular mr-1.5 text-ink-muted">{index + 1}.</span>
                    {unit.name}
                  </h3>
                  <span className="tabular shrink-0 text-xs text-ink-muted">
                    {breakdown.estudado + breakdown.revisar}/{breakdown.total}
                  </span>
                </div>
                <ul className="space-y-2">
                  {contents.map((content) => (
                    <ContentRow key={content.id} content={content} />
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {/* Status legend */}
      <Card>
        <p className="mb-2 text-xs font-semibold tracking-wide text-ink-2 uppercase">Legenda</p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {STUDY_STATUSES.map((s) => (
            <li key={s.value} className="flex items-center gap-2 text-sm text-ink-2">
              <span aria-hidden="true">{s.emoji}</span>
              {s.label}
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Adicionar conteúdo"
        description={`Em ${subject?.name ?? ''}, ${year}º ano.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addCustomContent}>Adicionar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-2" htmlFor="unit-select">
              Unidade
            </label>
            <select
              id="unit-select"
              value={newContent.unitId || units[0]?.id || ''}
              onChange={(e) => setNewContent((c) => ({ ...c, unitId: e.target.value }))}
              className="w-full rounded-xl border border-hairline bg-surface-2 px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <TextField
            label="Nome do conteúdo"
            placeholder="Ex.: Funções trigonométricas inversas"
            value={newContent.name}
            onChange={(e) => setNewContent((c) => ({ ...c, name: e.target.value }))}
          />
          <TextField
            label="Subconteúdos"
            hint="separados por vírgula"
            placeholder="Arco-seno, arco-cosseno, arco-tangente"
            value={newContent.subtopics}
            onChange={(e) => setNewContent((c) => ({ ...c, subtopics: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
