import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { slotColor } from '@/domain/constants';
import type { ReviewReasonKind } from '@/services/review';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/Field';
import { buildReviewQueue } from '@/services/review';
import { subjectById } from '@/services/selectors';
import { useAppState, useDispatch } from '@/state/store';

const REASON_META: Record<ReviewReasonKind, { emoji: string; label: string; color: string }> = {
  flag: { emoji: '🔵', label: 'Você pediu revisão', color: 'var(--c1)' },
  spaced: { emoji: '⏳', label: 'Tempo sem estudar', color: 'var(--color-warning)' },
  exam: { emoji: '📝', label: 'Prova chegando', color: 'var(--color-critical)' },
  weak: { emoji: '🎯', label: 'Baixo desempenho', color: 'var(--color-serious)' },
};

type Filter = 'todos' | ReviewReasonKind;

export function ReviewPage() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [filter, setFilter] = useState<Filter>('todos');

  const queue = useMemo(() => buildReviewQueue(state), [state]);
  const filtered = queue.filter(
    (item) => filter === 'todos' || item.reasons.some((r) => r.kind === filter),
  );

  const counts = useMemo(() => {
    const out: Record<ReviewReasonKind, number> = { flag: 0, spaced: 0, exam: 0, weak: 0 };
    for (const item of queue) {
      for (const kind of new Set(item.reasons.map((r) => r.kind))) out[kind] += 1;
    }
    return out;
  }, [queue]);

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-ink-2">
          Aqui entram automaticamente os conteúdos que você marcou como{' '}
          <strong className="font-semibold text-ink">"preciso revisar"</strong>, os que já estudou e
          estão ficando antigos, os que caem em uma prova próxima e os com baixo aproveitamento nas
          questões.
        </p>
        <div className="mt-3">
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v)}
            size="sm"
            options={[
              { value: 'todos', label: `Todos (${queue.length})` },
              { value: 'flag', label: `🔵 ${counts.flag}` },
              { value: 'exam', label: `📝 ${counts.exam}` },
              { value: 'spaced', label: `⏳ ${counts.spaced}` },
              { value: 'weak', label: `🎯 ${counts.weak}` },
            ]}
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            emoji="🌱"
            title={queue.length === 0 ? 'Nada para revisar' : 'Nenhum item neste filtro'}
            description={
              queue.length === 0
                ? 'Estude um conteúdo ou marque algum como "preciso revisar" para que ele apareça aqui.'
                : 'Troque o filtro para ver os outros motivos de revisão.'
            }
            action={
              queue.length === 0 ? (
                <Link to="/estudar">
                  <Button size="sm">Começar a estudar</Button>
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const subject = subjectById(state, item.content.subjectId);
            return (
              <li key={item.content.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <span
                          aria-hidden="true"
                          className="size-2 rounded-full"
                          style={{
                            background: subject ? slotColor(subject.colorSlot) : 'var(--ink-muted)',
                          }}
                        />
                        {subject?.emoji} {subject?.name}
                      </p>
                      <h3 className="mt-0.5 font-semibold text-ink">{item.content.name}</h3>
                    </div>
                    <Link
                      to={`/estudar?conteudo=${item.content.id}`}
                      className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink transition hover:brightness-110"
                    >
                      Revisar
                    </Link>
                  </div>

                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {item.reasons.map((reason, i) => {
                      const meta = REASON_META[reason.kind];
                      return (
                        <li
                          key={i}
                          className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface-2 px-2 py-0.5 text-xs text-ink-2"
                        >
                          <span aria-hidden="true">{meta.emoji}</span>
                          {reason.label}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        dispatch({ type: 'progress/clearReview', contentId: item.content.id })
                      }
                    >
                      Já revisei
                    </Button>
                    {state.questions.some((q) => q.contentId === item.content.id) ? (
                      <Link to={`/questoes?conteudo=${item.content.id}`}>
                        <Button variant="ghost" size="sm">
                          Treinar questões
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Card>
        <CardHeader title="Legenda dos motivos" />
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {Object.entries(REASON_META).map(([key, meta]) => (
            <li key={key} className="flex items-center gap-2 text-sm text-ink-2">
              <span aria-hidden="true">{meta.emoji}</span>
              {meta.label}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
