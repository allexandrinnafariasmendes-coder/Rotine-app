/**
 * Content prioritisation.
 *
 * This is the engine behind the app's core promise: "I have an exam — what do I
 * study, and in what order?". It answers with an explainable score, so the UI
 * can always say *why* a topic came first.
 *
 * The weights follow the order the product asks for:
 *   1. nearest exams
 *   2. pending activities
 *   3. topics never studied
 *   4. topics flagged as difficult
 *   5. topics that need review
 * Poor results in the exercise bank feed in as an extra signal.
 */

import { ASSESSMENT_TYPES, DELIVERABLE_TYPES, PRIORITY_WEIGHT } from '@/domain/constants';
import type { AppState, CurriculumContent, DayISO, ID, SchoolEvent } from '@/domain/types';
import { daysBetween, formatCountdown, today } from '@/lib/date';
import { accuracyForContent, eventStatus, progressOf, subjectLabel } from './selectors';

/** How much an event weighs, purely as a function of how close it is. */
export function urgencyWeight(daysAway: number): number {
  if (daysAway <= 0) return 60;
  if (daysAway <= 1) return 55;
  if (daysAway <= 3) return 46;
  if (daysAway <= 7) return 36;
  if (daysAway <= 14) return 24;
  if (daysAway <= 30) return 12;
  return 5;
}

export interface ScoredContent {
  content: CurriculumContent;
  score: number;
  /** Plain-language justifications, shown in the plan and the review queue. */
  reasons: string[];
  /** Latest day this topic is still useful — the exam or delivery date. */
  deadline?: DayISO;
  /** The event that drove the score, when there is one. */
  drivingEvent?: SchoolEvent;
  kind: 'estudo' | 'revisao';
}

interface ScoreOptions {
  /** Restrict to these events; empty means "consider every pending event". */
  focusEventIds?: ID[];
  includeReview?: boolean;
  includeDifficult?: boolean;
  ref?: DayISO;
}

/** Events that are still pending and relevant to the score. */
function relevantEvents(state: AppState, options: ScoreOptions): SchoolEvent[] {
  const ref = options.ref ?? today();
  const focus = options.focusEventIds ?? [];
  return state.events.filter((e) => {
    if (eventStatus(e, ref) === 'concluido') return false;
    if (focus.length > 0) return focus.includes(e.id);
    return true;
  });
}

export function scoreContent(
  state: AppState,
  content: CurriculumContent,
  events: SchoolEvent[],
  options: ScoreOptions = {},
): ScoredContent {
  const ref = options.ref ?? today();
  const progress = progressOf(state, content.id);
  const reasons: string[] = [];
  let score = 0;
  let deadline: DayISO | undefined;
  let drivingEvent: SchoolEvent | undefined;
  let bestEventWeight = 0;

  for (const event of events) {
    const linked = event.contentIds.includes(content.id);
    const sameSubject = event.subjectId === content.subjectId;
    if (!linked && !sameSubject) continue;

    const daysAway = daysBetween(ref, event.date);
    // A topic is worthless for an exam that has already happened.
    if (daysAway < -1) continue;

    // An explicit content link is trusted fully; "same subject" is a weaker hint.
    const base = urgencyWeight(daysAway) * (linked ? 1 : 0.45);
    const weight = base + PRIORITY_WEIGHT[event.priority] * (linked ? 1 : 0.5);

    if (weight > bestEventWeight) {
      bestEventWeight = weight;
      drivingEvent = event;
      deadline = event.date;
    }
  }

  if (drivingEvent) {
    score += bestEventWeight;
    const isAssessment = ASSESSMENT_TYPES.includes(drivingEvent.type);
    const noun = isAssessment ? 'prova' : DELIVERABLE_TYPES.includes(drivingEvent.type) ? 'entrega' : 'compromisso';
    reasons.push(
      `${noun === 'prova' ? 'Prova' : noun === 'entrega' ? 'Entrega' : 'Compromisso'} de ${subjectLabel(
        state,
        drivingEvent.subjectId,
      )} ${formatCountdown(drivingEvent.date)}`,
    );
  }

  switch (progress.status) {
    case 'nao_estudado':
      score += 18;
      reasons.push('Você ainda não estudou este conteúdo');
      break;
    case 'em_estudo':
      score += 10;
      reasons.push('Conteúdo começado e não finalizado');
      break;
    case 'revisar':
      if (options.includeReview !== false) {
        score += 22;
        reasons.push('Você marcou como "preciso revisar"');
      }
      break;
    case 'estudado': {
      score += 2;
      const staleDays = progress.lastStudiedAt
        ? daysBetween(progress.lastStudiedAt.slice(0, 10), ref)
        : 0;
      if (drivingEvent && staleDays >= 10) {
        score += 8;
        reasons.push(`Estudado há ${staleDays} dias, vale uma revisão antes da prova`);
      }
      break;
    }
  }

  if (options.includeDifficult !== false) {
    if (progress.difficulty === 'dificil') {
      score += 14;
      reasons.push('Marcado por você como difícil');
    } else if (progress.difficulty === 'media') {
      score += 5;
    }
  }

  const accuracy = accuracyForContent(state, content.id);
  if (accuracy !== null) {
    const pct = Math.round(accuracy * 100);
    if (accuracy < 0.5) {
      score += 16;
      reasons.push(`Aproveitamento de ${pct}% nas questões`);
    } else if (accuracy < 0.7) {
      score += 8;
      reasons.push(`Aproveitamento de ${pct}% nas questões`);
    }
  }

  // Half-finished checklists are cheap wins — nudge them up slightly.
  if (progress.doneSubtopics.length > 0 && progress.doneSubtopics.length < content.subtopics.length) {
    score += 4;
  }

  const kind: ScoredContent['kind'] =
    progress.status === 'estudado' || progress.status === 'revisar' ? 'revisao' : 'estudo';

  return { content, score, reasons, deadline, drivingEvent, kind };
}

/**
 * Scores every candidate topic and returns them highest-first.
 *
 * `subjectIds` empty means "all active subjects". Topics belonging to the
 * student's school year are always candidates; topics from another year only
 * enter when an event explicitly links them.
 */
export function rankContents(
  state: AppState,
  opts: {
    subjectIds?: ID[];
    year?: number;
    focusEventIds?: ID[];
    includeUnstudied?: boolean;
    includeReview?: boolean;
    includeDifficult?: boolean;
    limit?: number;
    ref?: DayISO;
  } = {},
): ScoredContent[] {
  const events = relevantEvents(state, {
    focusEventIds: opts.focusEventIds,
    ref: opts.ref,
  });
  const year = opts.year ?? state.profile.year;
  const subjectIds = opts.subjectIds?.length
    ? new Set(opts.subjectIds)
    : new Set(state.subjects.filter((s) => !s.archived).map((s) => s.id));

  const linkedIds = new Set(events.flatMap((e) => e.contentIds));

  const candidates = state.contents.filter((c) => {
    if (!subjectIds.has(c.subjectId)) return false;
    return c.year === year || linkedIds.has(c.id);
  });

  const scored = candidates
    .map((c) =>
      scoreContent(state, c, events, {
        focusEventIds: opts.focusEventIds,
        includeReview: opts.includeReview,
        includeDifficult: opts.includeDifficult,
        ref: opts.ref,
      }),
    )
    .filter((s) => {
      const status = progressOf(state, s.content.id).status;
      if (opts.includeUnstudied === false && status === 'nao_estudado') return false;
      if (opts.includeReview === false && status === 'revisar') return false;
      return s.score > 0;
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') ||
        a.content.name.localeCompare(b.content.name),
    );

  return opts.limit ? scored.slice(0, opts.limit) : scored;
}
