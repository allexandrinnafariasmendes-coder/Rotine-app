/**
 * Progress maths.
 *
 * Every number the progress screen shows is computed here, so the dashboard and
 * the progress page can never disagree.
 */

import type { AppState, DayISO, ID, StudyStatus, Subject } from '@/domain/types';
import { addDays, rangeDays, today } from '@/lib/date';
import { accuracyForSubject, progressOf } from './selectors';

export interface StatusBreakdown {
  nao_estudado: number;
  em_estudo: number;
  estudado: number;
  revisar: number;
  total: number;
}

function emptyBreakdown(): StatusBreakdown {
  return { nao_estudado: 0, em_estudo: 0, estudado: 0, revisar: 0, total: 0 };
}

/** Status counts over a set of contents. */
export function breakdownFor(state: AppState, contentIds: ID[]): StatusBreakdown {
  const out = emptyBreakdown();
  for (const id of contentIds) {
    const status: StudyStatus = progressOf(state, id).status;
    out[status] += 1;
    out.total += 1;
  }
  return out;
}

/**
 * Completion ratio for a set of topics.
 *
 * A topic under review counts as fully studied — the student knows it, they
 * just want another pass — while a topic in progress counts as half.
 */
export function completionRatio(breakdown: StatusBreakdown): number {
  if (breakdown.total === 0) return 0;
  const weighted = breakdown.estudado + breakdown.revisar + breakdown.em_estudo * 0.5;
  return Math.min(1, weighted / breakdown.total);
}

export interface SubjectProgress {
  subject: Subject;
  breakdown: StatusBreakdown;
  ratio: number;
  minutes: number;
  /** Share of correct answers in the exercise bank, or null if never practised. */
  accuracy: number | null;
}

/** Per-subject progress for the student's school year, best-known first. */
export function subjectProgress(state: AppState, year = state.profile.year): SubjectProgress[] {
  return state.subjects
    .filter((s) => !s.archived)
    .map((subject) => {
      const contentIds = state.contents
        .filter((c) => c.subjectId === subject.id && c.year === year)
        .map((c) => c.id);
      const breakdown = breakdownFor(state, contentIds);
      const minutes = state.sessions
        .filter((s) => s.subjectId === subject.id)
        .reduce((sum, s) => sum + s.minutes, 0);
      return {
        subject,
        breakdown,
        ratio: completionRatio(breakdown),
        minutes,
        accuracy: accuracyForSubject(state, subject.id),
      };
    })
    .filter((p) => p.breakdown.total > 0);
}

export interface OverallProgress {
  breakdown: StatusBreakdown;
  ratio: number;
  totalMinutes: number;
  minutesToday: number;
  minutesThisWeek: number;
  sessionsCount: number;
  streak: number;
  longestStreak: number;
  answered: number;
  accuracy: number | null;
}

export function overallProgress(state: AppState, year = state.profile.year): OverallProgress {
  const contentIds = state.contents.filter((c) => c.year === year).map((c) => c.id);
  const breakdown = breakdownFor(state, contentIds);
  const todayISO = today();
  const weekStart = addDays(todayISO, -6);

  const totalMinutes = state.sessions.reduce((sum, s) => sum + s.minutes, 0);
  const minutesToday = state.sessions
    .filter((s) => s.startedAt.slice(0, 10) === todayISO)
    .reduce((sum, s) => sum + s.minutes, 0);
  const minutesThisWeek = state.sessions
    .filter((s) => s.startedAt.slice(0, 10) >= weekStart)
    .reduce((sum, s) => sum + s.minutes, 0);

  const answered = state.answers.length;
  const accuracy = answered === 0 ? null : state.answers.filter((a) => a.correct).length / answered;

  return {
    breakdown,
    ratio: completionRatio(breakdown),
    totalMinutes,
    minutesToday,
    minutesThisWeek,
    sessionsCount: state.sessions.length,
    streak: state.streak.current,
    longestStreak: state.streak.longest,
    answered,
    accuracy,
  };
}

export interface DailyMinutes {
  date: DayISO;
  minutes: number;
}

/** Study minutes per day for the last `days` days, oldest first. */
export function dailyMinutes(state: AppState, days = 14): DailyMinutes[] {
  const start = addDays(today(), -(days - 1));
  const buckets = new Map<DayISO, number>(rangeDays(start, days).map((d) => [d, 0]));
  for (const session of state.sessions) {
    const day = session.startedAt.slice(0, 10);
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + session.minutes);
  }
  return [...buckets.entries()].map(([date, minutes]) => ({ date, minutes }));
}

/** Topics whose exercise accuracy is below `threshold`, weakest first. */
export function weakestContents(state: AppState, threshold = 0.7, limit = 8) {
  const byContent = new Map<ID, { correct: number; total: number }>();
  for (const answer of state.answers) {
    if (!answer.contentId) continue;
    const entry = byContent.get(answer.contentId) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (answer.correct) entry.correct += 1;
    byContent.set(answer.contentId, entry);
  }
  return [...byContent.entries()]
    .map(([contentId, { correct, total }]) => ({
      contentId,
      accuracy: correct / total,
      total,
      content: state.contents.find((c) => c.id === contentId),
    }))
    .filter((r) => r.content && r.accuracy < threshold)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}
