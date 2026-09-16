/**
 * The AI seam.
 *
 * Everything the product roadmap wants from a model — generated study plans,
 * summaries, generated questions, review recommendations — is expressed here as
 * one interface. Today a local, deterministic implementation
 * (`heuristicProvider`) satisfies it with no network and no key, and the UI
 * talks only to this interface.
 *
 * Adding a real model later means writing a second implementation and
 * registering it in `registry.ts`. No screen changes, because no screen knows
 * which provider answered.
 */

import type {
  AppState,
  CurriculumContent,
  ID,
  Question,
  StudyPlan,
  StudyPlanInput,
} from '@/domain/types';

export interface PlanRequest {
  input: Partial<StudyPlanInput>;
}

export interface SummaryRequest {
  contentId: ID;
  /** How long the summary should be. */
  length?: 'curto' | 'medio';
}

export interface SummaryResult {
  contentId: ID;
  /** Short bullet points the student can scan before a session. */
  bullets: string[];
  /** Where the text came from: `curriculum` today, a model id later. */
  source: string;
}

export interface QuestionRequest {
  contentId: ID;
  count?: number;
}

export interface RecommendationRequest {
  limit?: number;
}

export interface Recommendation {
  contentId: ID;
  title: string;
  reason: string;
  /** 0..1 — how strongly the provider recommends it. */
  weight: number;
}

export interface AIProvider {
  /** Stable identifier, shown in Settings so the student knows what ran. */
  readonly id: string;
  readonly label: string;
  /** False for providers that need a key or a network the app does not have. */
  readonly available: boolean;
  /** Which calls this provider actually implements. */
  readonly capabilities: {
    plan: boolean;
    summary: boolean;
    questions: boolean;
    recommendations: boolean;
  };

  generatePlan(state: AppState, request: PlanRequest): Promise<StudyPlan>;
  summarizeContent(state: AppState, request: SummaryRequest): Promise<SummaryResult>;
  generateQuestions(state: AppState, request: QuestionRequest): Promise<Question[]>;
  recommendReview(state: AppState, request: RecommendationRequest): Promise<Recommendation[]>;
}

export function contentOf(state: AppState, contentId: ID): CurriculumContent | undefined {
  return state.contents.find((c) => c.id === contentId);
}
