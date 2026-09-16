import type {
  BlockKind,
  Difficulty,
  EventStatus,
  EventType,
  Priority,
  SchoolYear,
  StudyStatus,
} from './types';

export interface Descriptor<T extends string> {
  value: T;
  label: string;
  emoji: string;
  /** CSS custom property holding the colour, or a semantic role. */
  color: string;
}

/**
 * Event types. Each carries an emoji *and* a label, so the calendar never
 * relies on colour alone to tell an exam from an assignment.
 */
export const EVENT_TYPES: Descriptor<EventType>[] = [
  { value: 'prova', label: 'Prova', emoji: '📝', color: 'var(--c8)' },
  { value: 'trabalho', label: 'Trabalho', emoji: '📁', color: 'var(--c1)' },
  { value: 'atividade', label: 'Atividade', emoji: '✏️', color: 'var(--c3)' },
  { value: 'seminario', label: 'Seminário', emoji: '🗣️', color: 'var(--c2)' },
  { value: 'apresentacao', label: 'Apresentação', emoji: '🎤', color: 'var(--c5)' },
  { value: 'projeto', label: 'Entrega de projeto', emoji: '🚀', color: 'var(--c7)' },
  { value: 'simulado', label: 'Simulado', emoji: '🎯', color: 'var(--c4)' },
  { value: 'outro', label: 'Outro compromisso', emoji: '📎', color: 'var(--c6)' },
];

export const EVENT_TYPE_MAP: Record<EventType, Descriptor<EventType>> = Object.fromEntries(
  EVENT_TYPES.map((t) => [t.value, t]),
) as Record<EventType, Descriptor<EventType>>;

/** Types that are graded assessments — they drive the exam countdown. */
export const ASSESSMENT_TYPES: EventType[] = ['prova', 'simulado'];
/** Types that are handed in — they drive the delivery countdown. */
export const DELIVERABLE_TYPES: EventType[] = [
  'trabalho',
  'atividade',
  'seminario',
  'apresentacao',
  'projeto',
];

export const PRIORITIES: Descriptor<Priority>[] = [
  { value: 'baixa', label: 'Baixa', emoji: '○', color: 'var(--ink-muted)' },
  { value: 'media', label: 'Média', emoji: '◐', color: 'var(--color-warning)' },
  { value: 'alta', label: 'Alta', emoji: '●', color: 'var(--color-critical)' },
];

export const PRIORITY_MAP: Record<Priority, Descriptor<Priority>> = Object.fromEntries(
  PRIORITIES.map((p) => [p.value, p]),
) as Record<Priority, Descriptor<Priority>>;

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  baixa: 0,
  media: 6,
  alta: 14,
};

export const EVENT_STATUSES: Descriptor<EventStatus>[] = [
  { value: 'pendente', label: 'Pendente', emoji: '⏳', color: 'var(--ink-2)' },
  { value: 'concluido', label: 'Concluído', emoji: '✅', color: 'var(--color-good)' },
  { value: 'atrasado', label: 'Atrasado', emoji: '⚠️', color: 'var(--color-critical)' },
];

export const EVENT_STATUS_MAP: Record<EventStatus, Descriptor<EventStatus>> = Object.fromEntries(
  EVENT_STATUSES.map((s) => [s.value, s]),
) as Record<EventStatus, Descriptor<EventStatus>>;

/**
 * The four study states from the syllabus screen. Colours come from the
 * reserved status palette and are always shown next to their label.
 */
export const STUDY_STATUSES: Descriptor<StudyStatus>[] = [
  { value: 'nao_estudado', label: 'Não estudado', emoji: '⬜', color: 'var(--hairline-strong)' },
  { value: 'em_estudo', label: 'Em estudo', emoji: '🟨', color: 'var(--color-warning)' },
  { value: 'estudado', label: 'Estudado', emoji: '🟩', color: 'var(--color-good)' },
  { value: 'revisar', label: 'Revisar', emoji: '🔵', color: 'var(--c1)' },
];

export const STUDY_STATUS_MAP: Record<StudyStatus, Descriptor<StudyStatus>> = Object.fromEntries(
  STUDY_STATUSES.map((s) => [s.value, s]),
) as Record<StudyStatus, Descriptor<StudyStatus>>;

export const DIFFICULTIES: Descriptor<Difficulty>[] = [
  { value: 'facil', label: 'Tranquilo', emoji: '🙂', color: 'var(--color-good)' },
  { value: 'media', label: 'Dá trabalho', emoji: '😐', color: 'var(--color-warning)' },
  { value: 'dificil', label: 'Difícil', emoji: '😖', color: 'var(--color-critical)' },
];

export const BLOCK_KINDS: Descriptor<BlockKind>[] = [
  { value: 'estudo', label: 'Estudar', emoji: '📖', color: 'var(--seq)' },
  { value: 'revisao', label: 'Revisar', emoji: '🔁', color: 'var(--c1)' },
  { value: 'atividade', label: 'Fazer atividade', emoji: '✏️', color: 'var(--c3)' },
  { value: 'simulado', label: 'Treinar questões', emoji: '🎯', color: 'var(--c4)' },
  { value: 'pausa', label: 'Pausa', emoji: '☕', color: 'var(--ink-muted)' },
];

export const BLOCK_KIND_MAP: Record<BlockKind, Descriptor<BlockKind>> = Object.fromEntries(
  BLOCK_KINDS.map((k) => [k.value, k]),
) as Record<BlockKind, Descriptor<BlockKind>>;

export const SCHOOL_YEARS: { value: SchoolYear; label: string }[] = [
  { value: 1, label: '1º ano' },
  { value: 2, label: '2º ano' },
  { value: 3, label: '3º ano' },
];

/** Reminder lead times the student can pick from, in days. */
export const LEAD_DAY_OPTIONS = [0, 1, 2, 3, 5, 7, 14];

/** Categorical palette slots, as CSS variables. Fixed order, never cycled. */
export const CATEGORICAL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];

export function slotColor(slot: number): string {
  const n = ((slot - 1) % CATEGORICAL_SLOTS.length) + 1;
  return `var(--c${n})`;
}
