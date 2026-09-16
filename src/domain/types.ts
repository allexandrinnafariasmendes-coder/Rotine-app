/**
 * Domain model for Rotine.
 *
 * Every entity is a plain, serialisable object so the whole state tree can be
 * persisted verbatim (IndexedDB, with a localStorage fallback) and later synced
 * to a remote backend without a translation layer.
 *
 * Dates are ISO strings on purpose: `YYYY-MM-DD` for calendar days (no timezone
 * ambiguity) and full ISO 8601 for instants.
 */

export type ID = string;

/** Calendar day, `YYYY-MM-DD`. */
export type DayISO = string;
/** Instant, ISO 8601. */
export type Instant = string;
/** Time of day, `HH:MM`. */
export type TimeHM = string;

export type SchoolYear = 1 | 2 | 3;

// ---------------------------------------------------------------- disciplinas

export interface Subject {
  id: ID;
  name: string;
  /** Two or three letters for dense surfaces such as calendar cells. */
  shortName: string;
  /** Index 1..8 into the validated categorical palette. */
  colorSlot: number;
  emoji: string;
  /** Hidden from pickers but kept so historical data stays readable. */
  archived?: boolean;
  /** Created by the student rather than shipped with the app. */
  custom?: boolean;
}

// ----------------------------------------------------------------- currículo

/** A unit or thematic area inside one subject and one school year. */
export interface CurriculumUnit {
  id: ID;
  subjectId: ID;
  year: SchoolYear;
  name: string;
  order: number;
}

/** A study topic. The smallest unit the student marks, studies and reviews. */
export interface CurriculumContent {
  id: ID;
  unitId: ID;
  subjectId: ID;
  year: SchoolYear;
  name: string;
  subtopics: string[];
  order: number;
  custom?: boolean;
}

export type StudyStatus = 'nao_estudado' | 'em_estudo' | 'estudado' | 'revisar';
export type Difficulty = 'facil' | 'media' | 'dificil';

/** Per-content study state. Absent means "never touched". */
export interface ContentProgress {
  contentId: ID;
  status: StudyStatus;
  /** Accumulated study minutes across all sessions. */
  minutes: number;
  difficulty?: Difficulty;
  lastStudiedAt?: Instant;
  reviewCount: number;
  notes?: string;
  /** Subtopics the student has ticked off. */
  doneSubtopics: string[];
  /** Set when the student asks to revisit the topic. */
  flaggedForReviewAt?: Instant;
}

// ------------------------------------------------------------------- agenda

export type EventType =
  | 'prova'
  | 'trabalho'
  | 'atividade'
  | 'seminario'
  | 'apresentacao'
  | 'projeto'
  | 'simulado'
  | 'outro';

export type Priority = 'baixa' | 'media' | 'alta';

/** Stored status. `atrasado` is derived from the date, never stored. */
export type StoredEventStatus = 'pendente' | 'concluido';
export type EventStatus = StoredEventStatus | 'atrasado';

export interface SchoolEvent {
  id: ID;
  title: string;
  type: EventType;
  subjectId: ID | null;
  date: DayISO;
  time?: TimeHM;
  description?: string;
  priority: Priority;
  /** Curriculum contents this event covers — the bridge to the study plan. */
  contentIds: ID[];
  status: StoredEventStatus;
  completedAt?: Instant;
  /** Overrides `ReminderSettings.leadDays` for this event only. */
  leadDays?: number[];
  createdAt: Instant;
  updatedAt: Instant;
}

// ---------------------------------------------------------------- lembretes

export type ReminderKind = 'prova' | 'entrega' | 'estudo' | 'revisao' | 'atraso';
export type Severity = 'info' | 'warning' | 'critical';

export interface ReminderSettings {
  enabled: boolean;
  /** Days before an event on which to warn. */
  leadDays: number[];
  /** Remind about what today's plan says to study. */
  dailyPlanReminder: boolean;
  dailyPlanTime: TimeHM;
  /** Mirror in-app reminders to OS notifications. */
  browserNotifications: boolean;
  /** Warn about overdue activities. */
  overdueReminder: boolean;
}

/**
 * Reminders are *derived* from events, the plan and the settings on every
 * render — never stored. Only the dismissed and already-notified ids persist,
 * which keeps the inbox correct even if the app stays closed for a week.
 */
export interface Reminder {
  /** Deterministic, so dismissal survives regeneration. */
  id: string;
  kind: ReminderKind;
  title: string;
  body: string;
  /** The day the reminder becomes relevant. */
  date: DayISO;
  severity: Severity;
  eventId?: ID;
  subjectId?: ID;
  contentId?: ID;
  /** Deep link into the app. */
  href?: string;
}

// ----------------------------------------------------------- sessões e plano

export interface ChecklistItem {
  id: ID;
  label: string;
  done: boolean;
}

export type SessionOutcome = 'concluido' | 'revisar' | 'parcial';

export interface StudySession {
  id: ID;
  subjectId: ID;
  contentId?: ID;
  startedAt: Instant;
  endedAt?: Instant;
  /** Elapsed study time, rounded to whole minutes. */
  minutes: number;
  notes?: string;
  outcome?: SessionOutcome;
  checklist: ChecklistItem[];
  /** Set when the session was started from a plan block. */
  blockId?: ID;
}

export interface StudyPlanInput {
  startDate: DayISO;
  /** Hours available per day. */
  hoursPerDay: number;
  /** Horizon in days. */
  days: number;
  subjectIds: ID[];
  /** Length of one study block, in minutes. */
  blockMinutes: number;
  includeUnstudied: boolean;
  includeReview: boolean;
  includeDifficult: boolean;
  /** Reserve blocks for pending activities and assignments, not just exams. */
  includeActivities: boolean;
  /** Restrict to the contents of these events, when the student picks some. */
  focusEventIds: ID[];
  /** Keep weekends free. */
  skipWeekends: boolean;
}

export type BlockKind = 'estudo' | 'revisao' | 'atividade' | 'simulado' | 'pausa';

export interface StudyBlock {
  id: ID;
  date: DayISO;
  order: number;
  minutes: number;
  subjectId: ID;
  contentId?: ID;
  eventId?: ID;
  label: string;
  /** Human-readable justification shown in the UI. */
  reason: string;
  kind: BlockKind;
  score: number;
  done: boolean;
}

export interface StudyPlan {
  id: ID;
  createdAt: Instant;
  input: StudyPlanInput;
  blocks: StudyBlock[];
  /** Which generator produced it: `heuristic-v1` today, an AI model later. */
  generatedBy: string;
  summary: string;
}

// ---------------------------------------------------------------- exercícios

export interface Question {
  id: ID;
  subjectId: ID;
  contentId?: ID;
  year?: SchoolYear;
  statement: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty: Difficulty;
  custom?: boolean;
}

export interface Answer {
  id: ID;
  questionId: ID;
  subjectId: ID;
  contentId?: ID;
  selectedIndex: number;
  correct: boolean;
  answeredAt: Instant;
}

// ------------------------------------------------------------------- perfil

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Profile {
  name: string;
  year: SchoolYear;
  school: string;
  course?: string;
  emoji: string;
  /** Study goals, used by the dashboard and the progress page. */
  dailyGoalMinutes: number;
  weeklyGoalHours: number;
  theme: ThemePreference;
  onboarded: boolean;
}

export interface StreakState {
  current: number;
  longest: number;
  lastStudyDay?: DayISO;
}

// -------------------------------------------------------------- estado raiz

export interface AppState {
  /** Schema version, drives migrations in `persistence.ts`. */
  version: number;
  profile: Profile;
  subjects: Subject[];
  units: CurriculumUnit[];
  contents: CurriculumContent[];
  contentProgress: Record<ID, ContentProgress>;
  events: SchoolEvent[];
  sessions: StudySession[];
  plans: StudyPlan[];
  reminderSettings: ReminderSettings;
  dismissedReminders: string[];
  notifiedReminders: string[];
  questions: Question[];
  answers: Answer[];
  streak: StreakState;
  updatedAt: Instant;
}
