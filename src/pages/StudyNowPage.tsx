import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STUDY_STATUS_MAP, slotColor } from '@/domain/constants';
import type { ChecklistItem, CurriculumContent, SessionOutcome } from '@/domain/types';
import { formatClock, formatMinutes } from '@/lib/date';
import { nowISO, uid } from '@/lib/ids';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextArea } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { preferredProvider } from '@/services/ai/registry';
import { rankContents } from '@/services/priority';
import { progressOf, subjectById } from '@/services/selectors';
import { useAppState, useDispatch } from '@/state/store';

type Phase = 'escolha' | 'sessao' | 'fim';

export function StudyNowPage() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();

  const [phase, setPhase] = useState<Phase>('escolha');
  const [contentId, setContentId] = useState<string | null>(null);
  const [blockId, setBlockId] = useState<string | undefined>();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState('');
  const [query, setQuery] = useState('');
  const [summary, setSummary] = useState<string[] | null>(null);
  const startedAt = useRef<string>(nowISO());

  const content: CurriculumContent | undefined = useMemo(
    () => state.contents.find((c) => c.id === contentId),
    [state.contents, contentId],
  );
  const subject = subjectById(state, content?.subjectId);

  // Deep link: `?conteudo=<id>&bloco=<id>` starts the chosen topic directly.
  useEffect(() => {
    const deepContent = params.get('conteudo');
    const deepBlock = params.get('bloco');
    if (!deepContent) return;
    const found = state.contents.find((c) => c.id === deepContent);
    if (found) {
      setContentId(found.id);
      setBlockId(deepBlock ?? undefined);
      setPhase('sessao');
    }
    const next = new URLSearchParams(params);
    next.delete('conteudo');
    next.delete('bloco');
    setParams(next, { replace: true });
  }, [params, setParams, state.contents]);

  // Build the checklist from the topic's remaining subtopics.
  useEffect(() => {
    if (phase !== 'sessao' || !content) return;
    const progress = progressOf(state, content.id);
    setChecklist(
      content.subtopics.map((subtopic) => ({
        id: `${content.id}:${subtopic}`,
        label: subtopic,
        done: progress.doneSubtopics.includes(subtopic),
      })),
    );
    setNotes(progress.notes ?? '');
    startedAt.current = nowISO();
    setSeconds(0);
    setRunning(true);
    void preferredProvider()
      .summarizeContent(state, { contentId: content.id })
      .then((result) => setSummary(result.bullets));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, content?.id]);

  // The timer. `Date.now()` deltas keep it honest when the tab is throttled.
  useEffect(() => {
    if (!running) return;
    const base = Date.now() - seconds * 1000;
    const id = window.setInterval(() => {
      setSeconds(Math.round((Date.now() - base) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const suggestions = useMemo(() => rankContents(state, { limit: 6 }), [state]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return state.contents
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.subtopics.some((s) => s.toLowerCase().includes(q)),
      )
      .slice(0, 12);
  }, [state.contents, query]);

  const minutes = Math.max(1, Math.round(seconds / 60));
  const checklistRatio =
    checklist.length === 0 ? 0 : checklist.filter((c) => c.done).length / checklist.length;

  function finish(outcome: SessionOutcome) {
    if (!content) return;
    setRunning(false);

    // Persist the subtopics ticked during the session.
    const previous = progressOf(state, content.id).doneSubtopics;
    for (const item of checklist) {
      const wasDone = previous.includes(item.label);
      if (item.done !== wasDone) {
        dispatch({ type: 'progress/toggleSubtopic', contentId: content.id, subtopic: item.label });
      }
    }

    dispatch({
      type: 'session/add',
      session: {
        id: uid('ses'),
        subjectId: content.subjectId,
        contentId: content.id,
        startedAt: startedAt.current,
        endedAt: nowISO(),
        minutes,
        notes: notes.trim() || undefined,
        outcome,
        checklist,
        blockId,
      },
    });
    setPhase('fim');
  }

  // ------------------------------------------------------------- escolha
  if (phase === 'escolha') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader
            icon="⏱️"
            title="Escolha o que estudar"
            subtitle="A sugestão segue a mesma prioridade do plano: prova mais próxima primeiro."
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conteúdo… ex.: funções, genética"
            aria-label="Buscar conteúdo"
            className="w-full rounded-xl border border-hairline bg-surface-2 px-3 py-2.5 text-sm placeholder:text-ink-muted focus:border-accent focus:bg-surface focus:outline-none"
          />
        </Card>

        {searchResults.length > 0 ? (
          <Card>
            <CardHeader title={`Resultados (${searchResults.length})`} />
            <ul className="space-y-2">
              {searchResults.map((c) => {
                const s = subjectById(state, c.subjectId);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setContentId(c.id);
                        setBlockId(undefined);
                        setPhase('sessao');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-hairline bg-surface p-3 text-left transition hover:bg-surface-hover"
                    >
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: s ? slotColor(s.colorSlot) : 'var(--ink-muted)' }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{c.name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {s?.name} · {c.year}º ano
                        </span>
                      </span>
                      <span aria-hidden="true" className="text-ink-muted">
                        →
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        <Card>
          <CardHeader icon="🎯" title="Sugerido para você" />
          {suggestions.length === 0 ? (
            <EmptyState
              emoji="📚"
              title="Sem sugestões ainda"
              description="Cadastre uma prova ou escolha um conteúdo na busca acima."
            />
          ) : (
            <ul className="space-y-2">
              {suggestions.map((item) => {
                const s = subjectById(state, item.content.subjectId);
                const status = STUDY_STATUS_MAP[progressOf(state, item.content.id).status];
                return (
                  <li key={item.content.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setContentId(item.content.id);
                        setBlockId(undefined);
                        setPhase('sessao');
                      }}
                      className="w-full rounded-xl border border-hairline bg-surface p-3 text-left transition hover:bg-surface-hover"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: s ? slotColor(s.colorSlot) : 'var(--ink-muted)' }}
                        />
                        <span className="min-w-0 flex-1 truncate font-medium text-ink">
                          {s?.emoji} {s?.name} → {item.content.name}
                        </span>
                        <span aria-hidden="true" title={status.label}>
                          {status.emoji}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-ink-muted">
                        {item.reasons.slice(0, 2).join(' · ')}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  // --------------------------------------------------------------- sessão
  if (phase === 'sessao' && content) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ background: subject ? slotColor(subject.colorSlot) : 'var(--ink-muted)' }}
                />
                {subject?.emoji} {subject?.name}
              </p>
              <h2 className="mt-0.5 text-xl leading-tight font-bold">{content.name}</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRunning(false);
                setPhase('escolha');
                setContentId(null);
              }}
            >
              Trocar
            </Button>
          </div>

          <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-surface-2 py-6">
            <p
              className="tabular text-5xl leading-none font-bold text-ink sm:text-6xl"
              aria-live="off"
            >
              {formatClock(seconds)}
            </p>
            <p className="text-xs text-ink-muted">
              {running ? 'Cronômetro rodando' : 'Pausado'} · será registrado como{' '}
              {formatMinutes(minutes)}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setRunning((r) => !r)} icon={running ? '⏸' : '▶'}>
                {running ? 'Pausar' : 'Retomar'}
              </Button>
              <Button variant="ghost" onClick={() => setSeconds(0)}>
                Zerar
              </Button>
            </div>
          </div>
        </Card>

        {summary && summary.length > 0 ? (
          <Card>
            <CardHeader icon="🧠" title="Antes de começar" />
            <ul className="space-y-1.5">
              {summary.map((bullet, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-2">
                  <span aria-hidden="true" className="text-ink-muted">
                    •
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <CardHeader
            icon="✅"
            title="Checklist"
            subtitle="Marque o que você já domina neste conteúdo."
            action={
              <span className="tabular text-sm font-semibold text-ink">
                {checklist.filter((c) => c.done).length}/{checklist.length}
              </span>
            }
          />
          {checklist.length === 0 ? (
            <p className="text-sm text-ink-muted">Este conteúdo não tem subtópicos cadastrados.</p>
          ) : (
            <>
              <ProgressBar value={checklistRatio} showValue={false} height={6} />
              <ul className="mt-3 space-y-1">
                {checklist.map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 transition hover:bg-surface-hover">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() =>
                          setChecklist((list) =>
                            list.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)),
                          )
                        }
                        className="size-4 accent-[var(--accent)]"
                      />
                      <span
                        className={`text-sm ${item.done ? 'text-ink-muted line-through' : 'text-ink-2'}`}
                      >
                        {item.label}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card>
          <TextArea
            label="Anotações"
            hint="ficam salvas no conteúdo"
            placeholder="Fórmulas, dúvidas, páginas do livro, o que travou…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button block size="lg" icon="✅" onClick={() => finish('concluido')}>
            Marcar como concluído
          </Button>
          <Button block size="lg" variant="secondary" icon="🔁" onClick={() => finish('revisar')}>
            Preciso revisar
          </Button>
        </div>
        <Button block variant="ghost" onClick={() => finish('parcial')}>
          Salvar e parar por aqui
        </Button>
      </div>
    );
  }

  // ------------------------------------------------------------------ fim
  const lastSession = state.sessions[state.sessions.length - 1];
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span aria-hidden="true" className="text-4xl">
            🎉
          </span>
          <h2 className="text-xl font-bold">Sessão registrada</h2>
          <p className="text-sm text-ink-2">
            {formatMinutes(lastSession?.minutes ?? minutes)} em{' '}
            <strong className="font-semibold">{content?.name ?? 'estudo'}</strong>.
          </p>
          {state.streak.current > 0 ? (
            <p className="text-sm font-medium text-ink-2">
              🔥 Sequência de {state.streak.current}{' '}
              {state.streak.current === 1 ? 'dia' : 'dias'}.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            block
            onClick={() => {
              setPhase('escolha');
              setContentId(null);
              setSummary(null);
            }}
          >
            Estudar outro conteúdo
          </Button>
          <Button
            block
            variant="secondary"
            onClick={() => {
              window.location.hash = '#/progresso';
            }}
          >
            Ver meu progresso
          </Button>
        </div>
      </Card>
    </div>
  );
}
