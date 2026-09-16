import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BLOCK_KIND_MAP, slotColor } from '@/domain/constants';
import type { StudyPlanInput } from '@/domain/types';
import {
  formatCountdown,
  formatMinutes,
  formatWeekdayShort,
  isToday,
  today,
} from '@/lib/date';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChipGroup, SegmentedControl, Switch, TextField } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DEFAULT_PLAN_INPUT, groupBlocksByDay, planProgress } from '@/services/studyPlan';
import { preferredProvider } from '@/services/ai/registry';
import { activePlan, subjectById, upcomingEvents } from '@/services/selectors';
import { useAppState, useDispatch } from '@/state/store';

export function StudyPlanPage() {
  const state = useAppState();
  const dispatch = useDispatch();
  const plan = activePlan(state);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(!plan);

  const subjects = state.subjects.filter((s) => !s.archived);
  const events = upcomingEvents(state, 45);

  const [input, setInput] = useState<StudyPlanInput>(() => ({
    ...DEFAULT_PLAN_INPUT,
    ...(plan?.input ?? {}),
    startDate: today(),
  }));

  const grouped = useMemo(() => (plan ? groupBlocksByDay(plan) : []), [plan]);
  const stats = planProgress(plan);
  const provider = preferredProvider();

  async function generate() {
    setGenerating(true);
    try {
      const generated = await provider.generatePlan(state, { input });
      dispatch({ type: 'plan/add', plan: generated });
      setShowForm(false);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-ink-2">
          Diga quanto tempo você tem e o app monta o cronograma. A ordem segue{' '}
          <strong className="font-semibold text-ink">
            provas mais próximas → atividades pendentes → conteúdos não estudados → conteúdos difíceis → revisões
          </strong>
          .
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'secondary' : 'primary'}>
            {showForm ? 'Fechar configuração' : plan ? 'Gerar novo plano' : 'Configurar plano'}
          </Button>
          {plan ? (
            <Button
              variant="ghost"
              onClick={() => dispatch({ type: 'plan/remove', id: plan.id })}
            >
              Descartar plano atual
            </Button>
          ) : null}
        </div>
      </Card>

      {showForm ? (
        <Card>
          <CardHeader icon="⚙️" title="Como você quer estudar?" />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Horas por dia"
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                value={input.hoursPerDay}
                onChange={(e) =>
                  setInput((i) => ({ ...i, hoursPerDay: Number(e.target.value) || 1 }))
                }
              />
              <TextField
                label="Dias até a prova"
                hint="horizonte"
                type="number"
                min={1}
                max={60}
                value={input.days}
                onChange={(e) => setInput((i) => ({ ...i, days: Number(e.target.value) || 7 }))}
              />
              <TextField
                label="Começando em"
                type="date"
                value={input.startDate}
                onChange={(e) => setInput((i) => ({ ...i, startDate: e.target.value }))}
              />
            </div>

            <SegmentedControl
              label="Duração de cada bloco"
              value={String(input.blockMinutes)}
              onChange={(v) => setInput((i) => ({ ...i, blockMinutes: Number(v) }))}
              options={[
                { value: '25', label: '25 min' },
                { value: '45', label: '45 min' },
                { value: '60', label: '60 min' },
                { value: '90', label: '90 min' },
              ]}
            />

            <ChipGroup
              label="Disciplinas para estudar"
              hint={input.subjectIds.length === 0 ? '(vazio = todas)' : undefined}
              options={subjects.map((s) => ({
                value: s.id,
                label: s.shortName,
                emoji: s.emoji,
                color: slotColor(s.colorSlot),
              }))}
              selected={input.subjectIds}
              onToggle={(id) =>
                setInput((i) => ({
                  ...i,
                  subjectIds: i.subjectIds.includes(id)
                    ? i.subjectIds.filter((s) => s !== id)
                    : [...i.subjectIds, id],
                }))
              }
            />

            {events.length > 0 ? (
              <ChipGroup
                label="Focar em provas ou entregas específicas"
                hint={input.focusEventIds.length === 0 ? '(vazio = considera todas)' : undefined}
                options={events.slice(0, 12).map((e) => ({
                  value: e.id,
                  label: `${e.title} · ${formatCountdown(e.date)}`,
                }))}
                selected={input.focusEventIds}
                onToggle={(id) =>
                  setInput((i) => ({
                    ...i,
                    focusEventIds: i.focusEventIds.includes(id)
                      ? i.focusEventIds.filter((e) => e !== id)
                      : [...i.focusEventIds, id],
                  }))
                }
              />
            ) : (
              <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-muted">
                Você ainda não tem provas ou entregas cadastradas. O plano vai priorizar os
                conteúdos do seu ano que faltam.{' '}
                <Link to="/calendario" className="font-semibold text-accent underline">
                  Cadastrar agora
                </Link>
                .
              </p>
            )}

            <div className="rounded-xl border border-hairline bg-surface-2 px-3 py-1">
              <Switch
                label="Incluir conteúdos que ainda não estudei"
                checked={input.includeUnstudied}
                onChange={(v) => setInput((i) => ({ ...i, includeUnstudied: v }))}
              />
              <Switch
                label="Incluir revisões"
                description="Conteúdos marcados como estudados ou como 'preciso revisar'."
                checked={input.includeReview}
                onChange={(v) => setInput((i) => ({ ...i, includeReview: v }))}
              />
              <Switch
                label="Dar peso extra ao que marquei como difícil"
                checked={input.includeDifficult}
                onChange={(v) => setInput((i) => ({ ...i, includeDifficult: v }))}
              />
              <Switch
                label="Reservar blocos para atividades e trabalhos"
                checked={input.includeActivities}
                onChange={(v) => setInput((i) => ({ ...i, includeActivities: v }))}
              />
              <Switch
                label="Não estudar nos fins de semana"
                checked={input.skipWeekends}
                onChange={(v) => setInput((i) => ({ ...i, skipWeekends: v }))}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={generate} disabled={generating} icon="✨">
                {generating ? 'Montando…' : 'Gerar cronograma'}
              </Button>
              <span className="text-xs text-ink-muted">Gerado por: {provider.label}</span>
            </div>
          </div>
        </Card>
      ) : null}

      {plan ? (
        <>
          <Card>
            <CardHeader
              icon="🗂️"
              title="Seu cronograma"
              subtitle={plan.summary}
              action={
                <span className="tabular text-sm font-semibold text-ink">
                  {stats.done}/{stats.total}
                </span>
              }
            />
            <ProgressBar value={stats.ratio} label="Blocos concluídos" />
          </Card>

          {grouped.map(({ date, blocks }) => {
            const studyBlocks = blocks.filter((b) => b.kind !== 'pausa');
            if (studyBlocks.length === 0) return null;
            const dayMinutes = studyBlocks.reduce((sum, b) => sum + b.minutes, 0);
            return (
              <Card key={date}>
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">
                    {isToday(date) ? (
                      <span className="mr-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-accent-ink uppercase">
                        Hoje
                      </span>
                    ) : null}
                    {formatWeekdayShort(date)}
                  </h3>
                  <span className="text-xs text-ink-muted">{formatMinutes(dayMinutes)}</span>
                </div>
                <ol className="space-y-2">
                  {blocks.map((block) => {
                    const kind = BLOCK_KIND_MAP[block.kind];
                    const subject = subjectById(state, block.subjectId);
                    if (block.kind === 'pausa') {
                      return (
                        <li
                          key={block.id}
                          className="flex items-center gap-2 px-1 text-xs text-ink-muted"
                        >
                          <span aria-hidden="true">☕</span> Pausa de {block.minutes} min
                        </li>
                      );
                    }
                    return (
                      <li
                        key={block.id}
                        className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                          block.done
                            ? 'border-hairline bg-surface-2 opacity-70'
                            : 'border-hairline bg-surface'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({ type: 'plan/toggleBlock', planId: plan.id, blockId: block.id })
                          }
                          aria-pressed={block.done}
                          aria-label={block.done ? 'Desmarcar bloco' : 'Marcar bloco como feito'}
                          className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 text-xs transition ${
                            block.done
                              ? 'border-[var(--color-good)] bg-[var(--color-good)] text-white'
                              : 'border-hairline-strong text-transparent hover:border-accent'
                          }`}
                        >
                          <span aria-hidden="true">✓</span>
                        </button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-medium ${block.done ? 'text-ink-muted line-through' : 'text-ink'}`}
                          >
                            {block.label}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                            <span className="flex items-center gap-1 text-ink-muted">
                              <span
                                aria-hidden="true"
                                className="size-2 rounded-sm"
                                style={{ background: kind.color }}
                              />
                              {kind.emoji} {kind.label}
                            </span>
                            <span className="tabular text-ink-muted">
                              {formatMinutes(block.minutes)}
                            </span>
                            {subject ? (
                              <span className="text-ink-muted">{subject.name}</span>
                            ) : null}
                          </div>
                          <p className="mt-1.5 text-xs text-ink-muted">{block.reason}</p>
                        </div>

                        {!block.done ? (
                          <Link
                            to={
                              block.contentId
                                ? `/estudar?conteudo=${block.contentId}&bloco=${block.id}`
                                : block.kind === 'simulado'
                                  ? `/questoes?disciplina=${block.subjectId}`
                                  : '/estudar'
                            }
                            className="shrink-0 rounded-lg bg-accent-soft px-2.5 py-1.5 text-xs font-semibold text-accent-soft-ink transition hover:brightness-95"
                          >
                            Começar
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </Card>
            );
          })}
        </>
      ) : !showForm ? (
        <Card>
          <EmptyState
            emoji="✨"
            title="Nenhum plano gerado"
            description="Informe suas horas disponíveis e o app monta um cronograma priorizado."
            action={<Button onClick={() => setShowForm(true)}>Configurar plano</Button>}
          />
        </Card>
      ) : null}
    </div>
  );
}
