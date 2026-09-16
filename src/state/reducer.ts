import type { AppState, ContentProgress, ID } from '@/domain/types';
import { nowISO } from '@/lib/ids';
import { toDayISO, addDays } from '@/lib/date';
import { createInitialState } from '@/lib/storage/schema';
import type { Action } from './actions';

function blankProgress(contentId: ID): ContentProgress {
  return {
    contentId,
    status: 'nao_estudado',
    minutes: 0,
    reviewCount: 0,
    doneSubtopics: [],
  };
}

function withProgress(
  state: AppState,
  contentId: ID,
  patch: (p: ContentProgress) => ContentProgress,
): AppState {
  const current = state.contentProgress[contentId] ?? blankProgress(contentId);
  return {
    ...state,
    contentProgress: { ...state.contentProgress, [contentId]: patch(current) },
  };
}

/**
 * Recomputes the study streak from the session log.
 *
 * A day counts when at least one session was recorded. The streak stays alive
 * while yesterday or today has a session, which means closing the app for an
 * evening does not silently reset it.
 */
function recomputeStreak(state: AppState): AppState {
  const days = new Set(state.sessions.map((s) => s.startedAt.slice(0, 10)));
  if (days.size === 0) return { ...state, streak: { current: 0, longest: 0 } };

  const sorted = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (addDays(sorted[i - 1], 1) === sorted[i]) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
  }

  const todayISO = toDayISO(new Date());
  let current = 0;
  let cursor = days.has(todayISO) ? todayISO : addDays(todayISO, -1);
  if (days.has(cursor)) {
    while (days.has(cursor)) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  return {
    ...state,
    streak: { current, longest: Math.max(longest, current), lastStudyDay: sorted[sorted.length - 1] },
  };
}

function touch(state: AppState): AppState {
  return { ...state, updatedAt: nowISO() };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'profile/update':
      return touch({ ...state, profile: { ...state.profile, ...action.patch } });

    // ------------------------------------------------------------- agenda
    case 'event/add':
      return touch({ ...state, events: [...state.events, action.event] });

    case 'event/update':
      return touch({
        ...state,
        events: state.events.map((e) =>
          e.id === action.id ? { ...e, ...action.patch, updatedAt: nowISO() } : e,
        ),
      });

    case 'event/remove':
      return touch({ ...state, events: state.events.filter((e) => e.id !== action.id) });

    case 'event/toggleDone':
      return touch({
        ...state,
        events: state.events.map((e) => {
          if (e.id !== action.id) return e;
          const done = e.status === 'concluido';
          return {
            ...e,
            status: done ? 'pendente' : 'concluido',
            completedAt: done ? undefined : nowISO(),
            updatedAt: nowISO(),
          };
        }),
      });

    // -------------------------------------------------------- disciplinas
    case 'subject/add':
      return touch({ ...state, subjects: [...state.subjects, action.subject] });

    case 'subject/update':
      return touch({
        ...state,
        subjects: state.subjects.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      });

    case 'subject/remove': {
      // Subjects with history are archived, not deleted, so past events and
      // sessions keep a readable label.
      const hasHistory =
        state.events.some((e) => e.subjectId === action.id) ||
        state.sessions.some((s) => s.subjectId === action.id);
      if (hasHistory) {
        return touch({
          ...state,
          subjects: state.subjects.map((s) =>
            s.id === action.id ? { ...s, archived: true } : s,
          ),
        });
      }
      return touch({
        ...state,
        subjects: state.subjects.filter((s) => s.id !== action.id),
      });
    }

    // ---------------------------------------------------------- currículo
    case 'content/add': {
      const units = action.unit && !state.units.some((u) => u.id === action.unit!.id)
        ? [...state.units, action.unit]
        : state.units;
      return touch({ ...state, units, contents: [...state.contents, action.content] });
    }

    case 'content/remove': {
      const { [action.id]: _removed, ...rest } = state.contentProgress;
      return touch({
        ...state,
        contents: state.contents.filter((c) => c.id !== action.id),
        contentProgress: rest,
      });
    }

    case 'progress/setStatus':
      return touch(
        withProgress(state, action.contentId, (p) => ({
          ...p,
          status: action.status,
          lastStudiedAt: action.status === 'nao_estudado' ? p.lastStudiedAt : nowISO(),
          flaggedForReviewAt: action.status === 'revisar' ? nowISO() : undefined,
        })),
      );

    case 'progress/setDifficulty':
      return touch(
        withProgress(state, action.contentId, (p) => ({ ...p, difficulty: action.difficulty })),
      );

    case 'progress/toggleSubtopic':
      return touch(
        withProgress(state, action.contentId, (p) => {
          const has = p.doneSubtopics.includes(action.subtopic);
          const doneSubtopics = has
            ? p.doneSubtopics.filter((s) => s !== action.subtopic)
            : [...p.doneSubtopics, action.subtopic];
          // Ticking the first subtopic moves an untouched topic into "em estudo".
          const status =
            p.status === 'nao_estudado' && doneSubtopics.length > 0 ? 'em_estudo' : p.status;
          return { ...p, doneSubtopics, status };
        }),
      );

    case 'progress/setNotes':
      return touch(
        withProgress(state, action.contentId, (p) => ({ ...p, notes: action.notes })),
      );

    case 'progress/flagReview':
      return touch(
        withProgress(state, action.contentId, (p) => ({
          ...p,
          status: 'revisar',
          flaggedForReviewAt: nowISO(),
          reviewCount: p.reviewCount + 1,
        })),
      );

    case 'progress/clearReview':
      return touch(
        withProgress(state, action.contentId, (p) => ({
          ...p,
          status: 'estudado',
          flaggedForReviewAt: undefined,
          lastStudiedAt: nowISO(),
        })),
      );

    // ------------------------------------------------------------ sessões
    case 'session/add': {
      const session = action.session;
      let next: AppState = { ...state, sessions: [...state.sessions, session] };

      if (session.contentId) {
        next = withProgress(next, session.contentId, (p) => {
          const status: ContentProgress['status'] =
            session.outcome === 'revisar'
              ? 'revisar'
              : session.outcome === 'concluido'
                ? 'estudado'
                : p.status === 'estudado'
                  ? 'estudado'
                  : 'em_estudo';
          return {
            ...p,
            status,
            minutes: p.minutes + session.minutes,
            lastStudiedAt: session.endedAt ?? nowISO(),
            reviewCount: session.outcome === 'revisar' ? p.reviewCount + 1 : p.reviewCount,
            flaggedForReviewAt:
              session.outcome === 'revisar' ? nowISO() : p.flaggedForReviewAt,
            notes: session.notes ? session.notes : p.notes,
          };
        });
      }

      if (session.blockId) {
        next = {
          ...next,
          plans: next.plans.map((plan) => ({
            ...plan,
            blocks: plan.blocks.map((b) =>
              b.id === session.blockId ? { ...b, done: true } : b,
            ),
          })),
        };
      }

      return touch(recomputeStreak(next));
    }

    case 'session/remove':
      return touch(
        recomputeStreak({ ...state, sessions: state.sessions.filter((s) => s.id !== action.id) }),
      );

    // --------------------------------------------------------------- plano
    case 'plan/add':
      // Only the latest plan is kept active; older ones stay for history.
      return touch({ ...state, plans: [action.plan, ...state.plans].slice(0, 10) });

    case 'plan/remove':
      return touch({ ...state, plans: state.plans.filter((p) => p.id !== action.id) });

    case 'plan/toggleBlock':
      return touch({
        ...state,
        plans: state.plans.map((plan) =>
          plan.id !== action.planId
            ? plan
            : {
                ...plan,
                blocks: plan.blocks.map((b) =>
                  b.id === action.blockId ? { ...b, done: !b.done } : b,
                ),
              },
        ),
      });

    // ----------------------------------------------------------- lembretes
    case 'reminders/update':
      return touch({
        ...state,
        reminderSettings: { ...state.reminderSettings, ...action.patch },
      });

    case 'reminders/dismiss':
      return touch({
        ...state,
        dismissedReminders: [...new Set([...state.dismissedReminders, action.id])],
      });

    case 'reminders/dismissAll':
      return touch({
        ...state,
        dismissedReminders: [...new Set([...state.dismissedReminders, ...action.ids])],
      });

    case 'reminders/markNotified':
      return {
        ...state,
        notifiedReminders: [...new Set([...state.notifiedReminders, ...action.ids])].slice(-400),
      };

    // ------------------------------------------------------------ questões
    case 'question/add':
      return touch({ ...state, questions: [...state.questions, action.question] });

    case 'question/remove':
      return touch({ ...state, questions: state.questions.filter((q) => q.id !== action.id) });

    case 'answer/add':
      return touch({ ...state, answers: [...state.answers, action.answer] });

    case 'answers/resetContent':
      return touch({
        ...state,
        answers: state.answers.filter((a) => a.contentId !== action.contentId),
      });

    // ---------------------------------------------------------------- dados
    case 'data/reset':
      return createInitialState();

    case 'data/import':
      return touch(action.state);

    default:
      return state;
  }
}
