import { useState } from 'react';
import { SCHOOL_YEARS, slotColor } from '@/domain/constants';
import type { SchoolYear, ThemePreference } from '@/domain/types';
import { formatMinutes } from '@/lib/date';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { SegmentedControl, TextField } from '@/components/ui/Field';
import { StatTile } from '@/components/ui/StatTile';
import { overallProgress } from '@/services/progress';
import { useAppState, useDispatch } from '@/state/store';

const AVATARS = ['🎓', '🙋', '🧑‍🎓', '👩‍🎓', '👨‍🎓', '🦉', '🚀', '🌟', '🐙', '🦊', '🐼', '🧠'];

export function ProfilePage() {
  const state = useAppState();
  const dispatch = useDispatch();
  const profile = state.profile;
  const progress = overallProgress(state);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof typeof profile>(key: K, value: (typeof profile)[K]) {
    dispatch({ type: 'profile/update', patch: { [key]: value } as Partial<typeof profile> });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent-soft text-3xl"
          >
            {profile.emoji}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">
              {profile.name.trim() || 'Estudante'}
            </h2>
            <p className="text-sm text-ink-muted">
              {profile.year}º ano
              {profile.school ? ` · ${profile.school}` : ''}
              {profile.course ? ` · ${profile.course}` : ''}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile emoji="📈" label="Ementa" value={`${Math.round(progress.ratio * 100)}%`} />
        <StatTile emoji="⏱️" label="Estudado" value={formatMinutes(progress.totalMinutes)} />
        <StatTile emoji="🔥" label="Sequência" value={progress.streak} unit="dias" />
        <StatTile emoji="📝" label="Compromissos" value={state.events.length} />
      </div>

      <Card>
        <CardHeader icon="🙋" title="Meus dados" />
        <div className="space-y-4">
          <TextField
            label="Nome"
            placeholder="Como você quer ser chamado"
            value={profile.name}
            onChange={(e) => update('name', e.target.value)}
          />
          <SegmentedControl
            label="Série/ano"
            value={String(profile.year)}
            onChange={(v) => update('year', Number(v) as SchoolYear)}
            options={SCHOOL_YEARS.map((y) => ({ value: String(y.value), label: y.label }))}
          />
          <TextField
            label="Instituição"
            placeholder="Nome da escola"
            value={profile.school}
            onChange={(e) => update('school', e.target.value)}
          />
          <TextField
            label="Curso"
            hint="quando houver, ex.: técnico integrado"
            placeholder="Ex.: Técnico em Informática"
            value={profile.course ?? ''}
            onChange={(e) => update('course', e.target.value)}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-2">Avatar</p>
            <div className="flex flex-wrap gap-1.5">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-pressed={profile.emoji === emoji}
                  aria-label={`Avatar ${emoji}`}
                  onClick={() => update('emoji', emoji)}
                  className={`grid size-10 place-items-center rounded-xl border text-lg transition ${
                    profile.emoji === emoji
                      ? 'border-accent bg-accent-soft'
                      : 'border-hairline bg-surface-2 hover:bg-surface-hover'
                  }`}
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon="🎯" title="Metas de estudo" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Meta diária"
            hint="minutos"
            type="number"
            min={0}
            max={600}
            step={15}
            value={profile.dailyGoalMinutes}
            onChange={(e) => update('dailyGoalMinutes', Number(e.target.value) || 0)}
          />
          <TextField
            label="Meta semanal"
            hint="horas"
            type="number"
            min={0}
            max={80}
            value={profile.weeklyGoalHours}
            onChange={(e) => update('weeklyGoalHours', Number(e.target.value) || 0)}
          />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          As metas aparecem no início e na página de progresso como linha de referência.
        </p>
      </Card>

      <Card>
        <CardHeader icon="🎨" title="Aparência" />
        <SegmentedControl
          label="Tema"
          value={profile.theme}
          onChange={(v) => update('theme', v as ThemePreference)}
          options={[
            { value: 'system', label: 'Sistema', emoji: '🖥️' },
            { value: 'light', label: 'Claro', emoji: '☀️' },
            { value: 'dark', label: 'Escuro', emoji: '🌙' },
          ]}
        />
      </Card>

      <Card>
        <CardHeader icon="📚" title="Minhas disciplinas" />
        <ul className="flex flex-wrap gap-2">
          {state.subjects
            .filter((s) => !s.archived)
            .map((subject) => (
              <li
                key={subject.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-2"
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ background: slotColor(subject.colorSlot) }}
                />
                {subject.emoji} {subject.name}
              </li>
            ))}
        </ul>
        <div className="mt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              window.location.hash = '#/disciplinas';
            }}
          >
            Gerenciar disciplinas
          </Button>
        </div>
      </Card>

      {saved ? (
        <p role="status" className="text-center text-sm font-medium text-[var(--color-good)]">
          Salvo automaticamente ✓
        </p>
      ) : null}
    </div>
  );
}
