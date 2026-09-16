/**
 * Review queue.
 *
 * Collects everything worth a second pass and says why it is there:
 *   - topics the student flagged with "preciso revisar"
 *   - topics already studied that are going stale (spaced repetition)
 *   - topics attached to an exam that is coming up
 *   - topics with weak results in the exercise bank
 */

import type { AppState, CurriculumContent, DayISO, SchoolEvent } from '@/domain/types';
import { daysBetween, daysUntil, today } from '@/lib/date';
import { accuracyForContent, eventStatus, progressOf } from './selectors';

export type ReviewReasonKind = 'flag' | 'spaced' | 'exam' | 'weak';

export interface ReviewItem {
  content: CurriculumContent;
  reasons: { kind: ReviewReasonKind; label: string }[];
  score: number;
  daysSinceStudy: number | null;
  accuracy: number | null;
  nextEvent?: SchoolEvent;
}

/** Days after which a studied topic is considered due for another pass. */
const SPACED_STEPS = [2, 7, 21, 60];

function nextSpacedStep(reviewCount: number): number {
  return SPACED_STEPS[Math.min(reviewCount, SPACED_STEPS.length - 1)];
}

export function buildReviewQueue(state: AppState, ref: DayISO = today()): ReviewItem[] {
  const pendingEvents = state.events.filter((e) => eventStatus(e, ref) !== 'concluido');
  const items: ReviewItem[] = [];

  for (const content of state.contents) {
    const progress = progressOf(state, content.id);
    // Never-touched topics belong in the syllabus, not the review queue.
    if (progress.status === 'nao_estudado') continue;

    const reasons: ReviewItem['reasons'] = [];
    let score = 0;

    if (progress.status === 'revisar') {
      reasons.push({ kind: 'flag', label: 'Você marcou "preciso revisar"' });
      score += 50;
    }

    const daysSinceStudy = progress.lastStudiedAt
      ? daysBetween(progress.lastStudiedAt.slice(0, 10), ref)
      : null;

    if (progress.status === 'estudado' && daysSinceStudy !== null) {
      const due = nextSpacedStep(progress.reviewCount);
      if (daysSinceStudy >= due) {
        reasons.push({
          kind: 'spaced',
          label: `Estudado há ${daysSinceStudy} ${daysSinceStudy === 1 ? 'dia' : 'dias'}`,
        });
        score += 14 + Math.min(20, daysSinceStudy - due);
      }
    }

    const nextEvent = pendingEvents
      .filter((e) => e.contentIds.includes(content.id) || e.subjectId === content.subjectId)
      .filter((e) => daysUntil(e.date) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    if (nextEvent) {
      const away = daysUntil(nextEvent.date);
      const linked = nextEvent.contentIds.includes(content.id);
      if (away <= 14 && (linked || away <= 7)) {
        reasons.push({
          kind: 'exam',
          label: `${nextEvent.title} ${away === 0 ? 'é hoje' : away === 1 ? 'é amanhã' : `em ${away} dias`}`,
        });
        score += linked ? 30 - away : 16 - away;
      }
    }

    const accuracy = accuracyForContent(state, content.id);
    if (accuracy !== null && accuracy < 0.7) {
      reasons.push({ kind: 'weak', label: `${Math.round(accuracy * 100)}% de acerto nas questões` });
      score += accuracy < 0.5 ? 26 : 14;
    }

    if (reasons.length === 0) continue;
    items.push({ content, reasons, score, daysSinceStudy, accuracy, nextEvent });
  }

  return items.sort((a, b) => b.score - a.score || a.content.name.localeCompare(b.content.name));
}
