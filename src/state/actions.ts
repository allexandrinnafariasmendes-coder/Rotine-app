import type {
  Answer,
  AppState,
  ContentProgress,
  CurriculumContent,
  CurriculumUnit,
  ID,
  Profile,
  Question,
  ReminderSettings,
  SchoolEvent,
  StudyPlan,
  StudySession,
  Subject,
} from '@/domain/types';

/** Every mutation the app can perform. Kept flat so the reducer stays total. */
export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'profile/update'; patch: Partial<Profile> }
  // agenda
  | { type: 'event/add'; event: SchoolEvent }
  | { type: 'event/update'; id: ID; patch: Partial<SchoolEvent> }
  | { type: 'event/remove'; id: ID }
  | { type: 'event/toggleDone'; id: ID }
  // disciplinas
  | { type: 'subject/add'; subject: Subject }
  | { type: 'subject/update'; id: ID; patch: Partial<Subject> }
  | { type: 'subject/remove'; id: ID }
  // currículo
  | { type: 'content/add'; content: CurriculumContent; unit?: CurriculumUnit }
  | { type: 'content/remove'; id: ID }
  | { type: 'progress/setStatus'; contentId: ID; status: ContentProgress['status'] }
  | { type: 'progress/setDifficulty'; contentId: ID; difficulty: ContentProgress['difficulty'] }
  | { type: 'progress/toggleSubtopic'; contentId: ID; subtopic: string }
  | { type: 'progress/setNotes'; contentId: ID; notes: string }
  | { type: 'progress/flagReview'; contentId: ID }
  | { type: 'progress/clearReview'; contentId: ID }
  // sessões de estudo
  | { type: 'session/add'; session: StudySession }
  | { type: 'session/remove'; id: ID }
  // plano de estudos
  | { type: 'plan/add'; plan: StudyPlan }
  | { type: 'plan/remove'; id: ID }
  | { type: 'plan/toggleBlock'; planId: ID; blockId: ID }
  // lembretes
  | { type: 'reminders/update'; patch: Partial<ReminderSettings> }
  | { type: 'reminders/dismiss'; id: string }
  | { type: 'reminders/dismissAll'; ids: string[] }
  | { type: 'reminders/markNotified'; ids: string[] }
  // questões
  | { type: 'question/add'; question: Question }
  | { type: 'question/remove'; id: ID }
  | { type: 'answer/add'; answer: Answer }
  | { type: 'answers/resetContent'; contentId: ID }
  // dados
  | { type: 'data/reset' }
  | { type: 'data/import'; state: AppState };
