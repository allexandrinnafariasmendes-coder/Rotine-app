import { useEffect, useRef } from 'react';
import { activeReminders, deliverNotifications } from '@/services/reminders';
import { timeToMinutes } from '@/lib/date';
import { useAppState, useDispatch } from '@/state/store';

/** How often to re-check whether an OS notification is due. */
const TICK_MS = 60_000;

/**
 * Drives OS notifications for the reminders the student has not dismissed.
 *
 * The daily plan reminder is held back until its configured time; event
 * reminders fire as soon as they become active. Delivered ids are recorded so
 * nothing is shown twice, and the check also runs when the tab regains focus —
 * the reliable moment on mobile, where timers are throttled in the background.
 */
export function useReminderRuntime(): void {
  const state = useAppState();
  const dispatch = useDispatch();
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    function run() {
      const current = stateRef.current;
      const settings = current.reminderSettings;
      if (!settings.enabled || !settings.browserNotifications) return;

      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      const due = activeReminders(current).filter((reminder) => {
        if (reminder.kind !== 'estudo') return true;
        return nowMinutes >= timeToMinutes(settings.dailyPlanTime);
      });

      const delivered = deliverNotifications(due, current.notifiedReminders);
      if (delivered.length > 0) {
        dispatch({ type: 'reminders/markNotified', ids: delivered });
      }
    }

    run();
    const interval = window.setInterval(run, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dispatch]);
}
