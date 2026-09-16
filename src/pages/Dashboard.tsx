import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EVENT_TYPE_MAP } from '@/domain/constants';
import type { SchoolEvent } from '@/domain/types';
import {
  formatCountdown,
  formatDistance,
  formatFullDate,
  formatMinutes,
  greetingForNow,
  today,
} from '@/lib/date';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EventRow } from '@/components/EventRow';
import { SubjectTag } from '@/components/SubjectTag';
import { EventForm } from '@/components/forms/EventForm';
import { overallProgress } from '@/services/progress';
import { rankContents } from '@/services/priority';
import { planProgress } from '@/services/studyPlan';
import {
  activePlan,
  overdueEvents,
  planBlocksForDay,
  subjectById,
  upcomingAssessments,
  upcomingDeliverables,
} from '@/services/selectors';
import { useAppState } from '@/state/store';

/** Big countdown for the next exam. One hero figure, no chart. */
function CountdownCard({ event }: { event: SchoolEvent }) {
  const state = useAppState();
  const subject = subjectById(state, event.subjectId);
  const type = EVENT_TYPE_MAP[event.type];
  const distance = formatDistance(event.date);
  const [amount, unit] = distance === 'hoje' ? ['Hoje', ''] : distance.split(' ');

  return (
    <div className="card overflow-hidden">
      <div className="flex items-stretch">
        <div
          aria-hidden="true"
          className="w-1.5 shrink-0"
          style={{ background: type.color }}
        />
        <div className="flex min-w-0 flex-1 items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              {type.emoji} Próxima {type.label.toLowerCase()}
            </p>
            <p className="mt-1 truncate text-lg leading-tight font-bold text-ink">{event.title}</p>
            <div className="mt-1.5">
              <SubjectTag subject={subject} size="sm" />
            </div>
            {event.contentIds.length > 0 ? (
              <p className="mt-1.5 text-xs text-ink-muted">
                {event.contentIds.length} {event.contentIds.length === 1 ? 'conteúdo' : 'conteúdos'} ligados
              </p>
            ) : (
              <Link
                to="/calendario"
                className="mt-1.5 inline-block text-xs font-semibold text-accent underline underline-offset-2"
              >
                Marcar o que cai nessa prova
              </Link>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl leading-none font-bold text-ink sm:text-4xl">{amount}</p>
            {unit ? <p className="text-xs font-medium text-ink-2">{unit}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const state = useAppState();
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<'prova' | 'atividade'>('prova');
  const todayISO = today();

  const assessments = upcomingAssessments(state);
  const deliverables = upcomingDeliverables(state);
  const overdue = overdueEvents(state);
  const plan = activePlan(state);
  const todayBlocks = planBlocksForDay(state, todayISO).filter((b) => b.kind !== 'pausa');
  const progress = overallProgress(state);
  const planStats = planProgress(plan);

  /**
   * What to study today: the plan when there is one, otherwise the top of the
   * priority ranking, so the card is never empty for a new student.
   */
  const todayFocus = useMemo(() => {
    if (todayBlocks.length > 0) {
      return todayBlocks.map((block) => ({
        id: block.id,
        contentId: block.contentId,
        label: block.label.includes(' — ') ? block.label.split(' — ')[1] : block.label,
        subjectId: block.subjectId,
        note: block.reason,
        done: block.done,
        fromPlan: true,
      }));
    }
    return rankContents(state, { limit: 3 }).map((item) => ({
      id: item.content.id,
      contentId: item.content.id,
      label: item.content.name,
      subjectId: item.content.subjectId,
      note: item.reasons[0] ?? 'Conteúdo do seu ano',
      done: false,
      fromPlan: false,
    }));
  }, [state, todayBlocks]);

  const firstName = state.profile.name.trim().split(' ')[0];
  const goalRatio =
    state.profile.dailyGoalMinutes > 0
      ? progress.minutesToday / state.profile.dailyGoalMinutes
      : 0;

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <header className="pt-1">
        <p className="text-sm text-ink-muted">{formatFullDate(todayISO)}</p>
        <h2 className="mt-0.5 text-2xl font-bold tracking-tight">
          <span aria-hidden="true">📚</span> {greetingForNow()},{' '}
          {firstName ? firstName : 'estudante'}!
        </h2>
        {progress.streak > 1 ? (
          <p className="mt-1 text-sm font-medium text-ink-2">
            🔥 {progress.streak} dias seguidos estudando. Não perca a sequência.
          </p>
        ) : null}
      </header>

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Button
          size="lg"
          icon="⏱️"
          className="col-span-2 sm:col-span-1"
          onClick={() => {
            window.location.hash = '#/estudar';
          }}
        >
          Começar a estudar
        </Button>
        <Button
          variant="secondary"
          size="lg"
          icon="✏️"
          onClick={() => {
            setFormType('atividade');
            setFormOpen(true);
          }}
        >
          Adicionar atividade
        </Button>
        <Button
          variant="secondary"
          size="lg"
          icon="📝"
          onClick={() => {
            setFormType('prova');
            setFormOpen(true);
          }}
        >
          Adicionar prova
        </Button>
      </div>

      {/* Overdue first — the only thing allowed to interrupt */}
      {overdue.length > 0 ? (
        <Card className="border-[var(--color-critical)]/40">
          <CardHeader
            icon="⚠️"
            title={`Atrasado (${overdue.length})`}
            subtitle="Resolva ou remarque para o plano voltar a fazer sentido."
          />
          <ul className="space-y-2">
            {overdue.slice(0, 3).map((event) => (
              <EventRow key={event.id} event={event} compact />
            ))}
          </ul>
          {overdue.length > 3 ? (
            <Link
              to="/calendario"
              className="mt-2 inline-block text-sm font-semibold text-accent underline underline-offset-2"
            >
              Ver todos os {overdue.length} atrasados
            </Link>
          ) : null}
        </Card>
      ) : null}

      {/* Countdown */}
      {assessments.length > 0 ? (
        <div className="space-y-2">
          <CountdownCard event={assessments[0]} />
          {assessments.length > 1 ? (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {assessments.slice(1, 5).map((event) => {
                const subject = subjectById(state, event.subjectId);
                return (
                  <div
                    key={event.id}
                    className="card min-w-[10.5rem] shrink-0 p-3"
                  >
                    <p className="truncate text-sm font-semibold text-ink">{event.title}</p>
                    <div className="mt-1">
                      <SubjectTag subject={subject} size="sm" showEmoji={false} />
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-ink-2">
                      {formatCountdown(event.date)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* What to study today */}
      <Card>
        <CardHeader
          icon="🎯"
          title="Hoje você precisa estudar"
          subtitle={
            todayFocus.length === 0
              ? undefined
              : todayBlocks.length > 0
                ? 'Do seu plano de estudos'
                : 'Sugestão por prioridade — gere um plano para organizar melhor'
          }
          action={
            <Link
              to={todayBlocks.length > 0 ? '/plano' : '/plano'}
              className="text-sm font-semibold text-accent"
            >
              {todayBlocks.length > 0 ? 'Ver plano' : 'Gerar plano'}
            </Link>
          }
        />
        {todayFocus.length === 0 ? (
          <EmptyState
            emoji="🗂️"
            title="Nada programado para hoje"
            description="Cadastre uma prova ou gere um plano de estudos e o app diz o que estudar em cada dia."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setFormType('prova');
                  setFormOpen(true);
                }}
              >
                Adicionar prova
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {todayFocus.map((item) => {
              const subject = subjectById(state, item.subjectId);
              return (
                <li key={item.id} className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{
                      background: item.done ? 'var(--color-good)' : 'var(--accent)',
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium ${item.done ? 'text-ink-muted line-through' : 'text-ink'}`}
                    >
                      {item.label}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {subject?.name ?? 'Estudo'} · {item.note}
                    </p>
                  </div>
                  {item.contentId && !item.done ? (
                    <Link
                      to={`/estudar?conteudo=${item.contentId}`}
                      className="shrink-0 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2 transition hover:bg-surface-hover hover:text-ink"
                    >
                      Estudar
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Next deliverables */}
      <Card>
        <CardHeader
          icon="📌"
          title="Próximas atividades e trabalhos"
          action={
            <Link to="/calendario" className="text-sm font-semibold text-accent">
              Ver tudo
            </Link>
          }
        />
        {deliverables.length === 0 ? (
          <EmptyState
            emoji="✅"
            title="Nenhuma entrega no radar"
            description="Quando cadastrar um trabalho, ele aparece aqui com o prazo."
          />
        ) : (
          <ul className="space-y-2">
            {deliverables.slice(0, 4).map((event) => (
              <EventRow key={event.id} event={event} compact />
            ))}
          </ul>
        )}
      </Card>

      {/* Overall progress */}
      <Card>
        <CardHeader
          icon="📈"
          title="Progresso geral"
          subtitle={`${state.profile.year}º ano · ${progress.breakdown.total} conteúdos na ementa`}
          action={
            <Link to="/progresso" className="text-sm font-semibold text-accent">
              Detalhes
            </Link>
          }
        />
        <ProgressBar value={progress.ratio} label="Ementa do seu ano" />
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-xs text-ink-muted">Estudados</dt>
            <dd className="tabular text-lg font-bold text-ink">{progress.breakdown.estudado}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Para revisar</dt>
            <dd className="tabular text-lg font-bold text-ink">{progress.breakdown.revisar}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Hoje</dt>
            <dd className="tabular text-lg font-bold text-ink">
              {formatMinutes(progress.minutesToday)}
            </dd>
          </div>
        </dl>
        {state.profile.dailyGoalMinutes > 0 ? (
          <div className="mt-3">
            <ProgressBar
              value={goalRatio}
              label={`Meta diária de ${formatMinutes(state.profile.dailyGoalMinutes)}`}
              height={6}
            />
          </div>
        ) : null}
        {plan ? (
          <p className="mt-3 text-xs text-ink-muted">
            Plano atual: {planStats.done} de {planStats.total} blocos concluídos.
          </p>
        ) : null}
      </Card>

      <EventForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaults={{ type: formType }}
      />
    </div>
  );
}
