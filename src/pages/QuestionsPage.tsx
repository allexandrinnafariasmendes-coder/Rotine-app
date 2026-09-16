import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { slotColor } from '@/domain/constants';
import type { Question } from '@/domain/types';
import { nowISO, uid } from '@/lib/ids';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectField } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatTile } from '@/components/ui/StatTile';
import { accuracyForContent, subjectById } from '@/services/selectors';
import { useAppState, useDispatch } from '@/state/store';

/** Fisher-Yates, seeded by nothing: a fresh order every round. */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function QuestionsPage() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();

  const [subjectId, setSubjectId] = useState('');
  const [contentId, setContentId] = useState('');
  const [round, setRound] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [roundCorrect, setRoundCorrect] = useState(0);

  // Deep link from the plan or the review queue.
  useEffect(() => {
    const deepSubject = params.get('disciplina');
    const deepContent = params.get('conteudo');
    if (!deepSubject && !deepContent) return;
    if (deepContent) {
      const content = state.contents.find((c) => c.id === deepContent);
      if (content) {
        setSubjectId(content.subjectId);
        setContentId(content.id);
      }
    } else if (deepSubject) {
      setSubjectId(deepSubject);
    }
    const next = new URLSearchParams(params);
    next.delete('disciplina');
    next.delete('conteudo');
    setParams(next, { replace: true });
  }, [params, setParams, state.contents]);

  const subjectsWithQuestions = useMemo(
    () =>
      state.subjects.filter(
        (s) => !s.archived && state.questions.some((q) => q.subjectId === s.id),
      ),
    [state.subjects, state.questions],
  );

  const contentsWithQuestions = useMemo(
    () =>
      state.contents
        .filter((c) => (subjectId ? c.subjectId === subjectId : true))
        .filter((c) => state.questions.some((q) => q.contentId === c.id))
        .sort((a, b) => a.year - b.year || a.order - b.order),
    [state.contents, state.questions, subjectId],
  );

  const pool = useMemo(
    () =>
      state.questions.filter((q) => {
        if (contentId) return q.contentId === contentId;
        if (subjectId) return q.subjectId === subjectId;
        return true;
      }),
    [state.questions, subjectId, contentId],
  );

  const totalAnswered = state.answers.length;
  const totalCorrect = state.answers.filter((a) => a.correct).length;

  function start() {
    if (pool.length === 0) return;
    setRound(shuffle(pool).slice(0, 10));
    setIndex(0);
    setPicked(null);
    setRoundCorrect(0);
  }

  function answer(optionIndex: number) {
    if (!round || picked !== null) return;
    const question = round[index];
    const correct = optionIndex === question.correctIndex;
    setPicked(optionIndex);
    if (correct) setRoundCorrect((c) => c + 1);
    dispatch({
      type: 'answer/add',
      answer: {
        id: uid('ans'),
        questionId: question.id,
        subjectId: question.subjectId,
        contentId: question.contentId,
        selectedIndex: optionIndex,
        correct,
        answeredAt: nowISO(),
      },
    });
  }

  function next() {
    if (!round) return;
    if (index + 1 >= round.length) {
      setRound(null);
      setIndex(0);
      setPicked(null);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  }

  // ------------------------------------------------------------- em rodada
  if (round && round.length > 0) {
    const question = round[index];
    const subject = subjectById(state, question.subjectId);
    const content = state.contents.find((c) => c.id === question.contentId);

    return (
      <div className="space-y-4">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs text-ink-muted">
              {subject?.emoji} {subject?.name}
              {content ? ` → ${content.name}` : ''}
            </p>
            <span className="tabular text-xs font-semibold text-ink-2">
              {index + 1}/{round.length} · {roundCorrect} {roundCorrect === 1 ? 'acerto' : 'acertos'}
            </span>
          </div>
          <ProgressBar value={(index + (picked !== null ? 1 : 0)) / round.length} showValue={false} height={4} />

          <h2 className="mt-4 text-base leading-snug font-semibold text-ink">
            {question.statement}
          </h2>

          <ul className="mt-4 space-y-2">
            {question.options.map((option, i) => {
              const isCorrect = i === question.correctIndex;
              const isPicked = picked === i;
              const revealed = picked !== null;
              const tone = !revealed
                ? 'border-hairline bg-surface-2 hover:bg-surface-hover'
                : isCorrect
                  ? 'border-[var(--color-good)] bg-[var(--color-good)]/10'
                  : isPicked
                    ? 'border-[var(--color-critical)] bg-[var(--color-critical)]/10'
                    : 'border-hairline bg-surface-2 opacity-60';
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={revealed}
                    onClick={() => answer(i)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${tone}`}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface text-xs font-bold text-ink-2">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="min-w-0 flex-1 text-ink">{option}</span>
                    {revealed && isCorrect ? (
                      <span aria-label="Resposta correta" className="shrink-0">
                        ✅
                      </span>
                    ) : null}
                    {revealed && isPicked && !isCorrect ? (
                      <span aria-label="Sua resposta, incorreta" className="shrink-0">
                        ❌
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {picked !== null ? (
            <div className="mt-4 space-y-3">
              <div
                className="rounded-xl border p-3 text-sm"
                style={{
                  borderColor:
                    picked === question.correctIndex
                      ? 'var(--color-good)'
                      : 'var(--color-critical)',
                  background: 'var(--surface-2)',
                }}
              >
                <p className="font-semibold text-ink">
                  {picked === question.correctIndex ? '✅ Você acertou!' : '❌ Não foi essa.'}
                </p>
                {question.explanation ? (
                  <p className="mt-1 text-ink-2">{question.explanation}</p>
                ) : null}
              </div>
              <Button block onClick={next}>
                {index + 1 >= round.length ? 'Finalizar rodada' : 'Próxima questão'}
              </Button>
            </div>
          ) : null}
        </Card>

        <Button variant="ghost" block onClick={() => setRound(null)}>
          Sair da rodada
        </Button>
      </div>
    );
  }

  // --------------------------------------------------------------- escolha
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-ink-2">
          Treine por disciplina e conteúdo. Cada resposta alimenta o seu progresso, a lista de
          revisão e a prioridade do plano de estudos.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile emoji="🎯" label="Respondidas" value={totalAnswered} />
        <StatTile
          emoji="✅"
          label="Aproveitamento"
          value={totalAnswered === 0 ? '—' : `${Math.round((totalCorrect / totalAnswered) * 100)}%`}
        />
        <StatTile emoji="📚" label="No banco" value={state.questions.length} unit="questões" />
      </div>

      <Card>
        <CardHeader icon="⚙️" title="Montar rodada" />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Disciplina"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setContentId('');
            }}
            options={[
              { value: '', label: 'Todas as disciplinas' },
              ...subjectsWithQuestions.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <SelectField
            label="Conteúdo"
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            options={[
              { value: '', label: 'Todos os conteúdos' },
              ...contentsWithQuestions.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          {pool.length === 0
            ? 'Nenhuma questão nesse filtro.'
            : `${pool.length} ${pool.length === 1 ? 'questão disponível' : 'questões disponíveis'} · a rodada usa até 10.`}
        </p>
        <div className="mt-3">
          <Button onClick={start} disabled={pool.length === 0} icon="▶">
            Começar rodada
          </Button>
        </div>
      </Card>

      {/* Per-content accuracy */}
      {contentsWithQuestions.length > 0 ? (
        <Card>
          <CardHeader icon="📊" title="Seu desempenho por conteúdo" />
          <ul className="space-y-2">
            {contentsWithQuestions.map((content) => {
              const accuracy = accuracyForContent(state, content.id);
              const subject = subjectById(state, content.subjectId);
              const answered = state.answers.filter((a) => a.contentId === content.id).length;
              return (
                <li
                  key={content.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface-2 p-3"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          background: subject ? slotColor(subject.colorSlot) : 'var(--ink-muted)',
                        }}
                      />
                      <span className="truncate">{content.name}</span>
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {answered === 0
                        ? 'Ainda não treinado'
                        : `${answered} ${answered === 1 ? 'resposta' : 'respostas'}`}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-bold text-ink">
                    {accuracy === null ? '—' : `${Math.round(accuracy * 100)}%`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState
            emoji="🎯"
            title="Banco de questões em construção"
            description="O app já vem com questões de várias disciplinas. Escolha outra disciplina no filtro acima."
          />
        </Card>
      )}
    </div>
  );
}
