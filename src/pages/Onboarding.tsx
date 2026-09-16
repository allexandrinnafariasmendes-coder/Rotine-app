import { useState } from 'react';
import { SCHOOL_YEARS, slotColor } from '@/domain/constants';
import type { SchoolYear } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { SegmentedControl, TextField } from '@/components/ui/Field';
import { useAppState, useDispatch } from '@/state/store';

const AVATARS = ['🎓', '🙋', '🦉', '🚀', '🌟', '🦊', '🐼', '🧠'];

/**
 * First run. Three short steps, nothing mandatory beyond the school year, so a
 * student can be inside the app in under a minute.
 */
export function Onboarding() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({
    name: '',
    year: state.profile.year,
    school: '',
    emoji: '🎓',
    dailyGoalMinutes: 90,
  });

  const subjects = state.subjects.filter((s) => !s.archived);

  function finish() {
    dispatch({
      type: 'profile/update',
      patch: {
        name: draft.name.trim(),
        year: draft.year,
        school: draft.school.trim(),
        emoji: draft.emoji,
        dailyGoalMinutes: draft.dailyGoalMinutes,
        weeklyGoalHours: Math.max(1, Math.round((draft.dailyGoalMinutes * 5) / 60)),
        onboarded: true,
      },
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <span
          aria-hidden="true"
          className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-accent text-2xl font-bold text-accent-ink"
        >
          R
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Rotine</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Seu assistente escolar: agenda, ementa do Ensino Médio, plano de estudos e lembretes.
        </p>
      </div>

      <div className="card space-y-5 p-5">
        {/* Step indicator */}
        <div className="flex gap-1.5" role="group" aria-label={`Passo ${step + 1} de 3`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i <= step ? 'var(--accent)' : 'var(--hairline)' }}
            />
          ))}
        </div>

        {step === 0 ? (
          <>
            <div>
              <h2 className="text-lg font-semibold">Como podemos te chamar?</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Só para deixar o app com a sua cara. Nada sai deste dispositivo.
              </p>
            </div>
            <TextField
              label="Seu nome"
              hint="opcional"
              placeholder="Ex.: Ana"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-2">Avatar</p>
              <div className="flex flex-wrap gap-1.5">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-pressed={draft.emoji === emoji}
                    aria-label={`Avatar ${emoji}`}
                    onClick={() => setDraft((d) => ({ ...d, emoji }))}
                    className={`grid size-10 place-items-center rounded-xl border text-lg transition ${
                      draft.emoji === emoji
                        ? 'border-accent bg-accent-soft'
                        : 'border-hairline bg-surface-2'
                    }`}
                  >
                    <span aria-hidden="true">{emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div>
              <h2 className="text-lg font-semibold">Em que ano você está?</h2>
              <p className="mt-1 text-sm text-ink-muted">
                A ementa e o progresso são organizados pelo seu ano.
              </p>
            </div>
            <SegmentedControl
              value={String(draft.year)}
              onChange={(v) => setDraft((d) => ({ ...d, year: Number(v) as SchoolYear }))}
              options={SCHOOL_YEARS.map((y) => ({ value: String(y.value), label: y.label }))}
            />
            <TextField
              label="Instituição"
              hint="opcional"
              placeholder="Nome da escola"
              value={draft.school}
              onChange={(e) => setDraft((d) => ({ ...d, school: e.target.value }))}
            />
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs font-semibold tracking-wide text-ink-2 uppercase">
                Já vem cadastrado
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {subjects.map((s) => (
                  <li
                    key={s.id}
                    className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs text-ink-2"
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full"
                      style={{ background: slotColor(s.colorSlot) }}
                    />
                    {s.shortName}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-muted">
                {state.contents.length} conteúdos de ementa prontos para você marcar.
              </p>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div>
              <h2 className="text-lg font-semibold">Quanto tempo por dia?</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Serve de meta e é a base do seu plano de estudos. Dá para mudar depois.
              </p>
            </div>
            <SegmentedControl
              value={String(draft.dailyGoalMinutes)}
              onChange={(v) => setDraft((d) => ({ ...d, dailyGoalMinutes: Number(v) }))}
              options={[
                { value: '30', label: '30min' },
                { value: '60', label: '1h' },
                { value: '90', label: '1h30' },
                { value: '120', label: '2h' },
              ]}
            />
            <ul className="space-y-2 text-sm text-ink-2">
              <li>📅 Cadastre provas e trabalhos no calendário.</li>
              <li>🧭 Marque na ementa o que já estudou.</li>
              <li>✨ Gere o plano e o app diz o que estudar em cada dia.</li>
            </ul>
          </>
        ) : null}

        <div className="flex gap-2 pt-1">
          {step > 0 ? (
            <Button variant="secondary" block onClick={() => setStep((s) => s - 1)}>
              Voltar
            </Button>
          ) : null}
          {step < 2 ? (
            <Button block onClick={() => setStep((s) => s + 1)}>
              Continuar
            </Button>
          ) : (
            <Button block onClick={finish} icon="🚀">
              Começar
            </Button>
          )}
        </div>

        {step === 0 ? (
          <button
            type="button"
            onClick={finish}
            className="w-full text-center text-xs font-medium text-ink-muted underline underline-offset-2"
          >
            Pular e configurar depois
          </button>
        ) : null}
      </div>
    </div>
  );
}
