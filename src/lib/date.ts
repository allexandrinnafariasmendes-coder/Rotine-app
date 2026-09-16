/**
 * Calendar helpers.
 *
 * Calendar days are handled as `YYYY-MM-DD` strings and compared as strings or
 * as *local* midnight Dates. Nothing here ever parses a bare `YYYY-MM-DD` with
 * `new Date(...)`, because that is interpreted as UTC and shifts the day for
 * anyone west of Greenwich — Brazil included.
 */

import type { DayISO } from '@/domain/types';

export const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WEEKDAY_LONG = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];
export const MONTH_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` for a Date, in the local timezone. */
export function toDayISO(d: Date): DayISO {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight for a `YYYY-MM-DD` string. */
export function fromDayISO(day: DayISO): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function today(): DayISO {
  return toDayISO(new Date());
}

export function addDays(day: DayISO, n: number): DayISO {
  const d = fromDayISO(day);
  d.setDate(d.getDate() + n);
  return toDayISO(d);
}

export function addMonths(day: DayISO, n: number): DayISO {
  const d = fromDayISO(day);
  const targetMonth = d.getMonth() + n;
  const probe = new Date(d.getFullYear(), targetMonth, 1);
  const lastDay = new Date(probe.getFullYear(), probe.getMonth() + 1, 0).getDate();
  probe.setDate(Math.min(d.getDate(), lastDay));
  return toDayISO(probe);
}

/** Whole days from `a` to `b`. Negative when `b` is in the past. */
export function daysBetween(a: DayISO, b: DayISO): number {
  const ms = fromDayISO(b).getTime() - fromDayISO(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function daysUntil(day: DayISO): number {
  return daysBetween(today(), day);
}

export function isPast(day: DayISO): boolean {
  return day < today();
}

export function isToday(day: DayISO): boolean {
  return day === today();
}

export function isWeekend(day: DayISO): boolean {
  const dow = fromDayISO(day).getDay();
  return dow === 0 || dow === 6;
}

/** Sunday-first start of the week containing `day`. */
export function startOfWeek(day: DayISO): DayISO {
  const d = fromDayISO(day);
  d.setDate(d.getDate() - d.getDay());
  return toDayISO(d);
}

export function endOfWeek(day: DayISO): DayISO {
  return addDays(startOfWeek(day), 6);
}

export function startOfMonth(day: DayISO): DayISO {
  const d = fromDayISO(day);
  return toDayISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(day: DayISO): DayISO {
  const d = fromDayISO(day);
  return toDayISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** The six-week grid a month view needs, Sunday-first. */
export function monthGrid(day: DayISO): DayISO[] {
  const first = startOfWeek(startOfMonth(day));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function weekDays(day: DayISO): DayISO[] {
  const first = startOfWeek(day);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

export function rangeDays(from: DayISO, count: number): DayISO[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

export function sameMonth(a: DayISO, b: DayISO): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

// ------------------------------------------------------------------ rótulos

/** `15 de setembro` */
export function formatDayMonth(day: DayISO): string {
  const d = fromDayISO(day);
  return `${d.getDate()} de ${MONTH_LONG[d.getMonth()]}`;
}

/** `segunda-feira, 15 de setembro de 2026` */
export function formatFullDate(day: DayISO): string {
  const d = fromDayISO(day);
  return `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} de ${MONTH_LONG[d.getMonth()]} de ${d.getFullYear()}`;
}

/** `Setembro 2026` */
export function formatMonthYear(day: DayISO): string {
  const d = fromDayISO(day);
  const m = MONTH_LONG[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}

/** `15/09` */
export function formatShort(day: DayISO): string {
  const d = fromDayISO(day);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** `seg, 15/09` */
export function formatWeekdayShort(day: DayISO): string {
  const d = fromDayISO(day);
  return `${WEEKDAY_SHORT[d.getDay()]}, ${formatShort(day)}`;
}

/**
 * Human countdown: `hoje`, `amanhã`, `em 5 dias`, `há 2 dias`.
 */
export function formatCountdown(day: DayISO): string {
  const n = daysUntil(day);
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  if (n > 1) return `em ${n} dias`;
  return `há ${Math.abs(n)} dias`;
}

/** `5 dias` / `1 dia` / `hoje` — the bare distance, no preposition. */
export function formatDistance(day: DayISO): string {
  const n = Math.abs(daysUntil(day));
  if (n === 0) return 'hoje';
  return n === 1 ? '1 dia' : `${n} dias`;
}

/** `1h 30min`, `45min`, `2h`. */
export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}min`;
  if (rest === 0) return `${h}h`;
  return `${h}h ${rest}min`;
}

/** `01:23:45` / `23:45` for the study timer. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** `19:30` → minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function greetingForNow(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
