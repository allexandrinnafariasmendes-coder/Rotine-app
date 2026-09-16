/**
 * Reminder engine.
 *
 * Reminders are derived, never stored. That matters for an app that may sit
 * closed for a week: the inbox is recomputed from the events, the plan and the
 * settings every time the app opens, so nothing is missed and nothing is stale.
 * Only "dismissed" and "already notified" ids persist.
 */

import { ASSESSMENT_TYPES, EVENT_TYPE_MAP } from '@/domain/constants';
import type { AppState, DayISO, Reminder, SchoolEvent } from '@/domain/types';
import { daysUntil, formatCountdown, formatShort, today } from '@/lib/date';
import { eventStatus, planBlocksForDay, subjectLabel } from './selectors';

function eventReminderId(event: SchoolEvent, lead: number): string {
  return `ev:${event.id}:${lead}`;
}

function severityForLead(lead: number): Reminder['severity'] {
  if (lead <= 0) return 'critical';
  if (lead <= 1) return 'warning';
  return 'info';
}

function bodyForEvent(state: AppState, event: SchoolEvent, lead: number): string {
  const subject = subjectLabel(state, event.subjectId);
  const when = lead === 0 ? 'é hoje' : lead === 1 ? 'é amanhã' : `é ${formatCountdown(event.date)}`;
  const isAssessment = ASSESSMENT_TYPES.includes(event.type);
  const topics = event.contentIds.length;
  const tail =
    isAssessment && topics > 0
      ? ` Você tem ${topics} ${topics === 1 ? 'conteúdo' : 'conteúdos'} ligados a ela.`
      : '';
  return isAssessment
    ? `Sua ${EVENT_TYPE_MAP[event.type].label.toLowerCase()} de ${subject} ${when}.${tail}`
    : `Você tem ${EVENT_TYPE_MAP[event.type].label.toLowerCase()} de ${subject} para entregar ${
        lead === 0 ? 'hoje' : lead === 1 ? 'amanhã' : formatCountdown(event.date)
      }.`;
}

/**
 * Builds the full reminder list for a reference day.
 *
 * A reminder fires when the distance to the event is at or below one of the
 * configured lead times, so re-opening the app after three days offline still
 * surfaces the warning that was due.
 */
export function buildReminders(state: AppState, ref: DayISO = today()): Reminder[] {
  const settings = state.reminderSettings;
  if (!settings.enabled) return [];

  const reminders: Reminder[] = [];

  for (const event of state.events) {
    if (eventStatus(event, ref) === 'concluido') continue;
    const distance = daysUntil(event.date);
    const leads = (event.leadDays?.length ? event.leadDays : settings.leadDays)
      .slice()
      .sort((a, b) => a - b);

    if (distance >= 0) {
      // The tightest lead time that has already been reached.
      const active = leads.filter((lead) => distance <= lead);
      const lead = active.length > 0 ? Math.min(...active) : undefined;
      if (lead !== undefined) {
        reminders.push({
          id: eventReminderId(event, lead),
          kind: ASSESSMENT_TYPES.includes(event.type) ? 'prova' : 'entrega',
          title: `${EVENT_TYPE_MAP[event.type].emoji} ${event.title}`,
          body: bodyForEvent(state, event, distance),
          date: ref,
          severity: severityForLead(distance),
          eventId: event.id,
          subjectId: event.subjectId ?? undefined,
          href: `#/calendario?evento=${event.id}`,
        });
      }
    } else if (settings.overdueReminder) {
      reminders.push({
        id: `overdue:${event.id}`,
        kind: 'atraso',
        title: `⚠️ ${event.title}`,
        body: `Estava previsto para ${formatShort(event.date)} e continua pendente. Marque como concluído ou remarque.`,
        date: ref,
        severity: 'critical',
        eventId: event.id,
        subjectId: event.subjectId ?? undefined,
        href: `#/calendario?evento=${event.id}`,
      });
    }
  }

  // What today's plan asks for.
  if (settings.dailyPlanReminder) {
    const blocks = planBlocksForDay(state, ref).filter((b) => b.kind !== 'pausa' && !b.done);
    if (blocks.length > 0) {
      const labels = blocks.slice(0, 3).map((b) => b.label.split(' — ').pop() ?? b.label);
      reminders.push({
        id: `plan:${ref}`,
        kind: 'estudo',
        title: '🔔 Seu plano de hoje',
        body: `Hoje você programou estudar ${labels.join(', ')}${
          blocks.length > 3 ? ` e mais ${blocks.length - 3}` : ''
        }.`,
        date: ref,
        severity: 'info',
        href: '#/plano',
      });
    }
  }

  // Topics the student asked to revisit.
  const flagged = Object.values(state.contentProgress).filter((p) => p.status === 'revisar');
  if (flagged.length > 0) {
    reminders.push({
      id: `review:${ref}:${flagged.length}`,
      kind: 'revisao',
      title: '🔁 Conteúdos esperando revisão',
      body: `${flagged.length} ${flagged.length === 1 ? 'conteúdo está' : 'conteúdos estão'} marcados como "preciso revisar".`,
      date: ref,
      severity: 'info',
      href: '#/revisar',
    });
  }

  const order: Record<Reminder['severity'], number> = { critical: 0, warning: 1, info: 2 };
  return reminders.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Reminders the student has not dismissed yet. */
export function activeReminders(state: AppState, ref: DayISO = today()): Reminder[] {
  const dismissed = new Set(state.dismissedReminders);
  return buildReminders(state, ref).filter((r) => !dismissed.has(r.id));
}

// --------------------------------------------------------- OS notifications

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function notificationPermission(): PermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as PermissionState;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return (await Notification.requestPermission()) as PermissionState;
  } catch {
    return 'denied';
  }
}

/**
 * Mirrors reminders to OS notifications, once each.
 *
 * Returns the ids that were actually shown so the caller can record them and
 * avoid notifying the same thing twice.
 */
export function deliverNotifications(
  reminders: Reminder[],
  alreadyNotified: string[],
  limit = 3,
): string[] {
  if (notificationPermission() !== 'granted') return [];
  const seen = new Set(alreadyNotified);
  const delivered: string[] = [];

  for (const reminder of reminders) {
    if (seen.has(reminder.id)) continue;
    if (delivered.length >= limit) break;
    try {
      new Notification(reminder.title, {
        body: reminder.body,
        icon: './icon.svg',
        tag: reminder.id,
      });
      delivered.push(reminder.id);
    } catch {
      break;
    }
  }
  return delivered;
}
