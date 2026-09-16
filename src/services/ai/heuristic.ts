/**
 * The local provider: no network, no key, fully deterministic.
 *
 * It is a real implementation rather than a stub — the study plan it returns is
 * the one the app ships with. Summaries and generated questions are built from
 * the curriculum itself, which keeps them honest: the app never invents facts
 * it cannot source from its own dataset.
 */

import type { AppState, Question } from '@/domain/types';
import { uid } from '@/lib/ids';
import { generateStudyPlan } from '../studyPlan';
import { buildReviewQueue } from '../review';
import { rankContents } from '../priority';
import { progressOf } from '../selectors';
import type {
  AIProvider,
  PlanRequest,
  QuestionRequest,
  Recommendation,
  RecommendationRequest,
  SummaryRequest,
  SummaryResult,
} from './provider';
import { contentOf } from './provider';

export const heuristicProvider: AIProvider = {
  id: 'heuristic-v1',
  label: 'Motor local (sem internet)',
  available: true,
  capabilities: { plan: true, summary: true, questions: true, recommendations: true },

  async generatePlan(state: AppState, request: PlanRequest) {
    return generateStudyPlan(state, request.input);
  },

  async summarizeContent(state: AppState, request: SummaryRequest): Promise<SummaryResult> {
    const content = contentOf(state, request.contentId);
    if (!content) {
      return { contentId: request.contentId, bullets: [], source: 'curriculum' };
    }
    const progress = progressOf(state, request.contentId);
    const pending = content.subtopics.filter((s) => !progress.doneSubtopics.includes(s));
    const bullets: string[] = [
      `${content.name} reúne ${content.subtopics.length} ${
        content.subtopics.length === 1 ? 'subtópico' : 'subtópicos'
      }.`,
      ...(pending.length > 0
        ? [`Ainda falta ver: ${pending.slice(0, 4).join(', ')}${pending.length > 4 ? '…' : ''}.`]
        : ['Você já marcou todos os subtópicos deste conteúdo.']),
    ];
    if (progress.notes) bullets.push(`Sua anotação: ${progress.notes}`);
    if (request.length !== 'curto') {
      bullets.push(
        'Estude na ordem dos subtópicos: eles vão do conceito mais básico ao mais aplicado.',
      );
    }
    return { contentId: request.contentId, bullets, source: 'curriculum' };
  },

  /**
   * Builds self-check prompts from the subtopics. These are open questions the
   * student answers to themselves, not multiple choice — the local provider
   * will not fabricate alternatives it cannot verify.
   */
  async generateQuestions(state: AppState, request: QuestionRequest): Promise<Question[]> {
    const content = contentOf(state, request.contentId);
    if (!content) return [];
    const count = Math.min(request.count ?? 4, content.subtopics.length);
    return content.subtopics.slice(0, count).map((subtopic) => ({
      id: uid('q_local'),
      subjectId: content.subjectId,
      contentId: content.id,
      year: content.year,
      statement: `Explique com suas palavras: ${subtopic}.`,
      options: ['Consegui explicar sem consultar', 'Expliquei com ajuda do material', 'Não consegui explicar'],
      correctIndex: 0,
      explanation: `Autoavaliação de "${subtopic}", dentro de ${content.name}.`,
      difficulty: 'media',
      custom: true,
    }));
  },

  async recommendReview(state: AppState, request: RecommendationRequest): Promise<Recommendation[]> {
    const limit = request.limit ?? 5;
    const queue = buildReviewQueue(state);
    if (queue.length > 0) {
      const max = queue[0].score || 1;
      return queue.slice(0, limit).map((item) => ({
        contentId: item.content.id,
        title: item.content.name,
        reason: item.reasons.map((r) => r.label).join(' · '),
        weight: Math.min(1, item.score / max),
      }));
    }
    // Nothing to review yet: fall back to what is most urgent to study.
    const ranked = rankContents(state, { limit });
    const max = ranked[0]?.score || 1;
    return ranked.map((item) => ({
      contentId: item.content.id,
      title: item.content.name,
      reason: item.reasons.join(' · '),
      weight: Math.min(1, item.score / max),
    }));
  },
};
