/**
 * Schema version and migrations.
 *
 * Bump `CURRENT_VERSION` and append a step to `MIGRATIONS` whenever the shape
 * of the persisted state changes. Each step receives the state as produced by
 * the previous version and returns the next one.
 */

import { DEFAULT_SUBJECTS } from '@/data/subjects';
import { buildCurriculum } from '@/data/curriculum';
import { SEED_QUESTIONS } from '@/data/questions';
import type { AppState, Profile, ReminderSettings } from '@/domain/types';
import { nowISO } from '@/lib/ids';

export const CURRENT_VERSION = 1;

export const DEFAULT_PROFILE: Profile = {
  name: '',
  year: 1,
  school: '',
  course: '',
  emoji: '🎓',
  dailyGoalMinutes: 90,
  weeklyGoalHours: 10,
  theme: 'system',
  onboarded: false,
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  leadDays: [7, 3, 1, 0],
  dailyPlanReminder: true,
  dailyPlanTime: '19:00',
  browserNotifications: false,
  overdueReminder: true,
};

export function createInitialState(): AppState {
  const { units, contents } = buildCurriculum();
  return {
    version: CURRENT_VERSION,
    profile: { ...DEFAULT_PROFILE },
    subjects: DEFAULT_SUBJECTS.map((s) => ({ ...s })),
    units,
    contents,
    contentProgress: {},
    events: [],
    sessions: [],
    plans: [],
    reminderSettings: { ...DEFAULT_REMINDER_SETTINGS },
    dismissedReminders: [],
    notifiedReminders: [],
    questions: SEED_QUESTIONS,
    answers: [],
    streak: { current: 0, longest: 0 },
    updatedAt: nowISO(),
  };
}

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/** `MIGRATIONS[n]` upgrades a state at version `n` to version `n + 1`. */
const MIGRATIONS: Record<number, Migration> = {
  // v0 was never released; the entry keeps the chain honest and documents the shape.
  0: (state) => ({ ...state, version: 1 }),
};

/**
 * Brings a persisted payload up to the current version and fills in anything
 * missing, so a state written by an older build is always usable.
 */
export function migrate(input: Partial<AppState>): AppState {
  let working = { ...(input as Record<string, unknown>) };
  let version = typeof working.version === 'number' ? working.version : 0;

  while (version < CURRENT_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) break;
    working = step(working);
    version = typeof working.version === 'number' ? working.version : version + 1;
  }

  const base = createInitialState();
  const state = working as Partial<AppState>;

  // The shipped curriculum is the source of truth for units and contents, but
  // topics the student created themselves must survive an app update.
  const customUnits = (state.units ?? []).filter(
    (u) => !base.units.some((b) => b.id === u.id),
  );
  const customContents = (state.contents ?? []).filter(
    (c) => !base.contents.some((b) => b.id === c.id),
  );

  return {
    version: CURRENT_VERSION,
    profile: { ...base.profile, ...(state.profile ?? {}) },
    subjects: state.subjects?.length ? state.subjects : base.subjects,
    units: [...base.units, ...customUnits],
    contents: [...base.contents, ...customContents],
    contentProgress: state.contentProgress ?? {},
    events: state.events ?? [],
    sessions: state.sessions ?? [],
    plans: state.plans ?? [],
    reminderSettings: { ...base.reminderSettings, ...(state.reminderSettings ?? {}) },
    dismissedReminders: state.dismissedReminders ?? [],
    notifiedReminders: state.notifiedReminders ?? [],
    // Merge the seed bank with anything the student wrote.
    questions: [
      ...base.questions,
      ...(state.questions ?? []).filter((q) => q.custom),
    ],
    answers: state.answers ?? [],
    streak: state.streak ?? { current: 0, longest: 0 },
    updatedAt: state.updatedAt ?? nowISO(),
  };
}
