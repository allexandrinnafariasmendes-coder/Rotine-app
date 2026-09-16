import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { STUDY_STATUSES, slotColor } from '@/domain/constants';
import { formatMinutes } from '@/lib/date';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar, ProgressRing } from '@/components/ui/ProgressBar';
import { StatTile } from '@/components/ui/StatTile';
import { MinutesBarChart } from '@/components/charts/MinutesBarChart';
import { dailyMinutes, overallProgress, subjectProgress, weakestContents } from '@/services/progress';
import { useAppState } from '@/state/store';

export function ProgressPage() {
  const state = useAppState();
  const overall = useMemo(() => overallProgress(state), [state]);
  const bySubject = useMemo(() => subjectProgress(state), [state]);
  const daily = useMemo(() => dailyMinutes(state, 14), [state]);
  const weakest = useMemo(() => weakestContents(state), [state]);

  const weeklyGoalMinutes = state.profile.weeklyGoalHours * 60;
  const ranked = [...bySubject].sort((a, b) => b.ratio - a.ratio);

  return (
    <div className="space-y-4">
      {/* Hero figure: one ring, the headline number */}
      <Card>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <ProgressRing value={overall.ratio}>
            <span className="text-3xl leading-none font-bold text-ink">
              {Math.round(overall.ratio * 100)}%
            </span>
            <span className="text-[10px] tracking-wide text-ink-muted uppercase">da ementa</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">
              {state.profile.year}º ano do Ensino Médio
            </h2>
            <p className="text-sm text-ink-muted">
              {overall.breakdown.total} conteúdos na ementa do seu ano.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {STUDY_STATUSES.map((status) => (
                <div key={status.value} className="flex items-center justify-between gap-2">
                  <dt className="flex min-w-0 items-center gap-1.5 text-ink-2">
                    <span aria-hidden="true">{status.emoji}</span>
                    <span className="truncate">{status.label}</span>
                  </dt>
                  <dd className="tabular font-semibold text-ink">
                    {overall.breakdown[status.value]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Card>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          emoji="⏱️"
          label="Horas estudadas"
          value={Math.round((overall.totalMinutes / 60) * 10) / 10}
          unit="h"
          hint={`${overall.sessionsCount} ${overall.sessionsCount === 1 ? 'sessão' : 'sessões'}`}
        />
        <StatTile
          emoji="🔥"
          label="Sequência"
          value={overall.streak}
          unit={overall.streak === 1 ? 'dia' : 'dias'}
          hint={`Recorde: ${overall.longestStreak}`}
        />
        <StatTile
          emoji="📅"
          label="Últimos 7 dias"
          value={formatMinutes(overall.minutesThisWeek)}
          hint={
            weeklyGoalMinutes > 0
              ? `Meta: ${state.profile.weeklyGoalHours}h`
              : undefined
          }
        />
        <StatTile
          emoji="🎯"
          label="Acerto em questões"
          value={overall.accuracy === null ? '—' : `${Math.round(overall.accuracy * 100)}%`}
          hint={overall.answered === 0 ? 'Sem respostas' : `${overall.answered} respondidas`}
        />
      </div>

      {/* Weekly goal */}
      {weeklyGoalMinutes > 0 ? (
        <Card>
          <ProgressBar
            value={overall.minutesThisWeek / weeklyGoalMinutes}
            label={`Meta semanal de ${state.profile.weeklyGoalHours}h`}
          />
        </Card>
      ) : null}

      {/* Study hours over time — one series, no legend */}
      <Card>
        <CardHeader
          icon="📊"
          title="Tempo de estudo por dia"
          subtitle="Últimos 14 dias"
        />
        <MinutesBarChart data={daily} goalMinutes={state.profile.dailyGoalMinutes} />
      </Card>

      {/* Per-subject progress — magnitude, so one sequential hue, not one per subject */}
      <Card>
        <CardHeader
          icon="📚"
          title="Progresso por disciplina"
          subtitle="Percentual de conteúdos estudados na ementa do seu ano"
        />
        {ranked.length === 0 ? (
          <EmptyState
            emoji="📚"
            title="Nada para mostrar ainda"
            description="Marque conteúdos na ementa para ver o progresso por disciplina."
          />
        ) : (
          <ul className="space-y-3">
            {ranked.map(({ subject, ratio, breakdown, minutes, accuracy }) => (
              <li key={subject.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm text-ink-2">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: slotColor(subject.colorSlot) }}
                    />
                    <span aria-hidden="true">{subject.emoji}</span>
                    <span className="truncate">{subject.name}</span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-semibold text-ink">
                    {Math.round(ratio * 100)}%
                  </span>
                </div>
                <ProgressBar value={ratio} showValue={false} height={8} />
                <p className="mt-1 text-xs text-ink-muted">
                  {breakdown.estudado + breakdown.revisar} de {breakdown.total} conteúdos
                  {minutes > 0 ? ` · ${formatMinutes(minutes)} estudados` : ''}
                  {accuracy !== null ? ` · ${Math.round(accuracy * 100)}% de acerto` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Weak spots */}
      {weakest.length > 0 ? (
        <Card>
          <CardHeader
            icon="⚠️"
            title="Conteúdos com maior dificuldade"
            subtitle="Baseado no seu desempenho nas questões"
            action={
              <Link to="/revisar" className="text-sm font-semibold text-accent">
                Revisar
              </Link>
            }
          />
          <ul className="space-y-2">
            {weakest.map((item) => (
              <li
                key={item.contentId}
                className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface-2 p-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {item.content?.name}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {item.total} {item.total === 1 ? 'questão' : 'questões'} respondidas
                  </span>
                </span>
                <span
                  className="tabular shrink-0 text-sm font-bold"
                  style={{
                    color:
                      item.accuracy < 0.5 ? 'var(--color-critical)' : 'var(--color-warning)',
                  }}
                >
                  {Math.round(item.accuracy * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
