/**
 * Derived reads over the state tree. Pure functions, no React, so they can be
 * reused by the services, the reminder engine and a future backend job.
 */

import {
  ASSESSMENT_TYPES,
  DELIVERABLE_TYPES,
} from '@/domain/constants';
import type {
  AppState,
  ContentProgress,
  CurriculumContent,
  EventStatus,
  ID,
  SchoolEvent,
  Subject,
} from '@/domain/types';
import { daysUntil, today } from '@/lib/date';

export function eventStatus(event: SchoolEvent, ref = today()): EventStatus {
  if (event.status === 'concluido') return 'concluido';
  return event.date < ref ? 'atrasado' : 'pendente';
}

export function isOverdue(event: SchoolEvent, ref = today()): boolean {
  return eventStatus(event, ref) === 'atrasado';
}

export function subjectById(state: AppState, id: ID | null | undefined): Subject | undefined {
  if (!id) return undefined;
  return state.subjects.find((s) => s.id === id);
}

export function subjectLabel(state: AppState, id: ID | null | undefined): string {
  return subjectById(state, id)?.name ?? 'Sem disciplina';
}

export function contentById(state: AppState, id: ID | undefined): CurriculumContent | undefined {
  if (!id) return undefined;
  return state.contents.find((c) => c.id === id);
}

export function progressOf(state: AppState, contentId: ID): ContentProgress {
  return (
    state.contentProgress[contentId] ?? {
      contentId,
      status: 'nao_estudado',
      minutes: 0,
      reviewCount: 0,
      doneSubtopics: [],
    }
  );
}

export function activeSubjects(state: AppState): Subject[] {
  return state.subjects.filter((s) => !s.archived);
}

/** Contents for the student's current school year, in curriculum order. */
export function contentsForYear(state: AppState, year = state.profile.year): CurriculumContent[] {
  return state.contents.filter((c) => c.year === year);
}

export function unitsOfSubject(state: AppState, subjectId: ID, year?: number) {
  return state.units
    .filter((u) => u.subjectId === subjectId && (year === undefined || u.year === year))
    .sort((a, b) => a.year - b.year || a.order - b.order);
}

export function contentsOfUnit(state: AppState, unitId: ID): CurriculumContent[] {
  return state.contents.filter((c) => c.unitId === unitId).sort((a, b) => a.order - b.order);
}

/** Pending events, soonest first. Completed ones are excluded. */
export function pendingEvents(state: AppState): SchoolEvent[] {
  return state.events
    .filter((e) => e.status !== 'concluido')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
}

export function upcomingEvents(state: AppState, withinDays = 60): SchoolEvent[] {
  return pendingEvents(state).filter((e) => {
    const d = daysUntil(e.date);
    return d >= 0 && d <= withinDays;
  });
}

export function overdueEvents(state: AppState): SchoolEvent[] {
  return pendingEvents(state).filter((e) => isOverdue(e));
}

/** Next exams and mock exams — what the countdown on the dashboard shows. */
export function upcomingAssessments(state: AppState, withinDays = 90): SchoolEvent[] {
  return upcomingEvents(state, withinDays).filter((e) => ASSESSMENT_TYPES.includes(e.type));
}

/** Next things to hand in. */
export function upcomingDeliverables(state: AppState, withinDays = 90): SchoolEvent[] {
  return upcomingEvents(state, withinDays).filter((e) => DELIVERABLE_TYPES.includes(e.type));
}

export function eventsOnDay(state: AppState, day: string): SchoolEvent[] {
  return state.events
    .filter((e) => e.date === day)
    .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
}

export function eventsInRange(state: AppState, from: string, to: string): SchoolEvent[] {
  return state.events
    .filter((e) => e.date >= from && e.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
}

/** The plan currently in use: the most recently generated one. */
export function activePlan(state: AppState) {
  return state.plans[0];
}

export function planBlocksForDay(state: AppState, day: string) {
  const plan = activePlan(state);
  if (!plan) return [];
  return plan.blocks.filter((b) => b.date === day).sort((a, b) => a.order - b.order);
}

export function sessionsOnDay(state: AppState, day: string) {
  return state.sessions.filter((s) => s.startedAt.slice(0, 10) === day);
}

export function minutesOnDay(state: AppState, day: string): number {
  return sessionsOnDay(state, day).reduce((sum, s) => sum + s.minutes, 0);
}

export function answersForContent(state: AppState, contentId: ID) {
  return state.answers.filter((a) => a.contentId === contentId);
}

/** Share of correct answers for a topic, or null when it was never practised. */
export function accuracyForContent(state: AppState, contentId: ID): number | null {
  const answers = answersForContent(state, contentId);
  if (answers.length === 0) return null;
  return answers.filter((a) => a.correct).length / answers.length;
}

export function accuracyForSubject(state: AppState, subjectId: ID): number | null {
  const answers = state.answers.filter((a) => a.subjectId === subjectId);
  if (answers.length === 0) return null;
  return answers.filter((a) => a.correct).length / answers.length;
}
