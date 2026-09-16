/**
 * Study-plan generator.
 *
 * Takes what the student has (hours per day, days until the exam, subjects) and
 * what the app knows (scored topics, pending activities) and lays out a day by
 * day schedule. Every block carries the reason it exists, so the plan is
 * arguable rather than magic.
 *
 * The generator is intentionally a pure function of `(state, input)`. A future
 * AI planner implements the same signature and slots in behind
 * `services/ai/provider.ts` without touching the UI.
 */

import { BLOCK_KIND_MAP, DELIVERABLE_TYPES } from '@/domain/constants';
import type {
  AppState,
  DayISO,
  ID,
  StudyBlock,
  StudyPlan,
  StudyPlanInput,
} from '@/domain/types';
import { addDays, daysBetween, formatCountdown, isWeekend, today } from '@/lib/date';
import { nowISO, uid } from '@/lib/ids';
import { rankContents, type ScoredContent } from './priority';
import { eventStatus, subjectById } from './selectors';

export const DEFAULT_PLAN_INPUT: StudyPlanInput = {
  startDate: today(),
  hoursPerDay: 2,
  days: 7,
  subjectIds: [],
  blockMinutes: 45,
  includeUnstudied: true,
  includeReview: true,
  includeDifficult: true,
  includeActivities: true,
  focusEventIds: [],
  skipWeekends: false,
};

/** Minutes of rest inserted after every two consecutive study blocks. */
const BREAK_MINUTES = 10;
const BLOCKS_BEFORE_BREAK = 2;
/** A topic never takes more than this many blocks in one plan. */
const MAX_BLOCKS_PER_CONTENT = 2;
/** Keeps a single day from becoming a monologue on one subject. */
const MAX_BLOCKS_PER_SUBJECT_PER_DAY = 3;

interface DaySlot {
  date: DayISO;
  remaining: number;
  blocks: StudyBlock[];
  subjectCount: Map<ID, number>;
  studyBlocksSinceBreak: number;
}

function buildDays(input: StudyPlanInput): DaySlot[] {
  const capacity = Math.max(15, Math.round(input.hoursPerDay * 60));
  const slots: DaySlot[] = [];
  for (let i = 0; i < input.days; i += 1) {
    const date = addDays(input.startDate, i);
    if (input.skipWeekends && isWeekend(date)) continue;
    slots.push({
      date,
      remaining: capacity,
      blocks: [],
      subjectCount: new Map(),
      studyBlocksSinceBreak: 0,
    });
  }
  return slots;
}

function canTake(slot: DaySlot, minutes: number, subjectId: ID): boolean {
  if (slot.remaining < minutes) return false;
  const used = slot.subjectCount.get(subjectId) ?? 0;
  return used < MAX_BLOCKS_PER_SUBJECT_PER_DAY;
}

function place(slot: DaySlot, block: Omit<StudyBlock, 'order' | 'date'>): StudyBlock {
  const full: StudyBlock = { ...block, date: slot.date, order: slot.blocks.length };
  slot.blocks.push(full);
  slot.remaining -= full.minutes;
  if (full.kind === 'pausa') {
    slot.studyBlocksSinceBreak = 0;
  } else {
    slot.subjectCount.set(full.subjectId, (slot.subjectCount.get(full.subjectId) ?? 0) + 1);
    slot.studyBlocksSinceBreak += 1;
  }
  return full;
}

function maybeBreak(slot: DaySlot) {
  if (slot.studyBlocksSinceBreak < BLOCKS_BEFORE_BREAK) return;
  if (slot.remaining < BREAK_MINUTES + 15) return; // no point resting at the end of the day
  place(slot, {
    id: uid('blk'),
    minutes: BREAK_MINUTES,
    subjectId: '',
    label: 'Pausa',
    reason: 'Descanso curto para manter o foco nos próximos blocos.',
    kind: 'pausa',
    score: 0,
    done: false,
  });
}

/** Earliest slot that still fits, preferring days before the topic's deadline. */
function findSlot(slots: DaySlot[], minutes: number, subjectId: ID, deadline?: DayISO): DaySlot | undefined {
  const beforeDeadline = deadline
    ? slots.filter((s) => s.date <= deadline && canTake(s, minutes, subjectId))
    : [];
  if (beforeDeadline.length > 0) {
    // Spread the load: pick the emptiest of the eligible days.
    return beforeDeadline.reduce((best, s) => (s.remaining > best.remaining ? s : best));
  }
  return slots.find((s) => canTake(s, minutes, subjectId));
}

/** Reorders a day so the same subject is not studied back to back. */
function interleave(blocks: StudyBlock[]): StudyBlock[] {
  const queue = [...blocks];
  const out: StudyBlock[] = [];
  while (queue.length > 0) {
    const lastSubject = out[out.length - 1]?.subjectId;
    let index = queue.findIndex((b) => b.kind === 'pausa' || b.subjectId !== lastSubject);
    if (index === -1) index = 0;
    out.push(queue.splice(index, 1)[0]);
  }
  return out.map((b, i) => ({ ...b, order: i }));
}

export function generateStudyPlan(state: AppState, rawInput: Partial<StudyPlanInput> = {}): StudyPlan {
  const input: StudyPlanInput = { ...DEFAULT_PLAN_INPUT, startDate: today(), ...rawInput };
  const slots = buildDays(input);
  const blockMinutes = Math.max(15, Math.min(120, Math.round(input.blockMinutes)));
  const horizonEnd = addDays(input.startDate, input.days - 1);

  // ---- 1. Activities and assignments due inside the horizon come first.
  if (input.includeActivities) {
    const dueSoon = state.events
      .filter((e) => eventStatus(e) !== 'concluido')
      .filter((e) => DELIVERABLE_TYPES.includes(e.type))
      .filter((e) => e.date <= horizonEnd)
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const event of dueSoon) {
      const subjectId = event.subjectId ?? '';
      const slot = findSlot(slots, blockMinutes, subjectId, event.date);
      if (!slot) continue;
      place(slot, {
        id: uid('blk'),
        minutes: blockMinutes,
        subjectId,
        eventId: event.id,
        label: event.title,
        reason: `Entrega ${formatCountdown(event.date)}. Reserve um bloco para adiantar.`,
        kind: 'atividade',
        score: 1000 - Math.max(0, daysBetween(input.startDate, event.date)),
        done: false,
      });
      maybeBreak(slot);
    }
  }

  // ---- 2. Scored topics, highest priority first.
  const ranked = rankContents(state, {
    subjectIds: input.subjectIds,
    focusEventIds: input.focusEventIds,
    includeUnstudied: input.includeUnstudied,
    includeReview: input.includeReview,
    includeDifficult: input.includeDifficult,
    ref: input.startDate,
  });

  const placedPerContent = new Map<ID, number>();
  // Two passes: one block for each topic in priority order, then a second block
  // for the top topics while the week still has room.
  for (let pass = 0; pass < MAX_BLOCKS_PER_CONTENT; pass += 1) {
    for (const scored of ranked) {
      if ((placedPerContent.get(scored.content.id) ?? 0) > pass) continue;
      const subject = subjectById(state, scored.content.subjectId);
      const slot = findSlot(slots, blockMinutes, scored.content.subjectId, scored.deadline);
      if (!slot) continue;

      const reason = scored.reasons.length > 0
        ? scored.reasons.join(' · ')
        : 'Conteúdo do seu ano que ainda merece atenção.';

      place(slot, {
        id: uid('blk'),
        minutes: blockMinutes,
        subjectId: scored.content.subjectId,
        contentId: scored.content.id,
        eventId: scored.drivingEvent?.id,
        label: `${subject?.name ?? 'Estudo'} — ${scored.content.name}`,
        reason: pass === 0 ? reason : `Segundo bloco para fixar. ${reason}`,
        kind: scored.kind === 'revisao' ? 'revisao' : 'estudo',
        score: Math.round(scored.score),
        done: false,
      });
      placedPerContent.set(scored.content.id, (placedPerContent.get(scored.content.id) ?? 0) + 1);
      maybeBreak(slot);
    }
  }

  // ---- 3. The day before each exam, a question-drill block when we have items.
  const exams = state.events
    .filter((e) => eventStatus(e) !== 'concluido')
    .filter((e) => e.type === 'prova' || e.type === 'simulado')
    .filter((e) => e.date >= input.startDate && e.date <= addDays(horizonEnd, 1));

  for (const exam of exams) {
    if (!exam.subjectId) continue;
    const hasQuestions = state.questions.some((q) => q.subjectId === exam.subjectId);
    if (!hasQuestions) continue;
    const eve = addDays(exam.date, -1);
    const slot = slots.find((s) => s.date === eve && s.remaining >= 30) ?? slots.find((s) => s.date === exam.date && s.remaining >= 30);
    if (!slot) continue;
    place(slot, {
      id: uid('blk'),
      minutes: 30,
      subjectId: exam.subjectId,
      eventId: exam.id,
      label: `Questões de ${subjectById(state, exam.subjectId)?.name ?? 'revisão'}`,
      reason: `Treino final antes da ${exam.type === 'simulado' ? 'simulado' : 'prova'} de ${formatCountdown(exam.date)}.`,
      kind: 'simulado',
      score: 900,
      done: false,
    });
  }

  const blocks = slots.flatMap((slot) => interleave(slot.blocks));
  const studyBlocks = blocks.filter((b) => b.kind !== 'pausa');
  const totalMinutes = studyBlocks.reduce((sum, b) => sum + b.minutes, 0);

  const bySubject = new Map<ID, number>();
  for (const b of studyBlocks) {
    if (!b.subjectId) continue;
    bySubject.set(b.subjectId, (bySubject.get(b.subjectId) ?? 0) + b.minutes);
  }
  const topSubjects = [...bySubject.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => subjectById(state, id)?.name)
    .filter(Boolean);

  const hours = Math.round((totalMinutes / 60) * 10) / 10;
  const activeDays = slots.filter((s) => s.blocks.some((b) => b.kind !== 'pausa')).length;
  const summary = studyBlocks.length === 0
    ? 'Nada a agendar: cadastre uma prova ou uma atividade e gere o plano novamente.'
    : `${studyBlocks.length} blocos em ${activeDays} ${activeDays === 1 ? 'dia' : 'dias'}, ${hours}h de estudo${
        topSubjects.length > 0 ? `, com foco em ${topSubjects.join(' e ')}` : ''
      }.`;

  return {
    id: uid('plan'),
    createdAt: nowISO(),
    input,
    blocks,
    generatedBy: 'heuristic-v1',
    summary,
  };
}

/** Groups a plan's blocks by day, for rendering. */
export function groupBlocksByDay(plan: StudyPlan): { date: DayISO; blocks: StudyBlock[] }[] {
  const map = new Map<DayISO, StudyBlock[]>();
  for (const block of plan.blocks) {
    const list = map.get(block.date) ?? [];
    list.push(block);
    map.set(block.date, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, blocks]) => ({ date, blocks: blocks.sort((a, b) => a.order - b.order) }));
}

export function blockKindLabel(kind: StudyBlock['kind']): string {
  return BLOCK_KIND_MAP[kind].label;
}

/** Summary of a plan's progress, used by the dashboard. */
export function planProgress(plan: StudyPlan | undefined) {
  if (!plan) return { total: 0, done: 0, ratio: 0 };
  const study = plan.blocks.filter((b) => b.kind !== 'pausa');
  const done = study.filter((b) => b.done).length;
  return { total: study.length, done, ratio: study.length === 0 ? 0 : done / study.length };
}

export { rankContents };
export type { ScoredContent };
