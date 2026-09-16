import type { CurriculumContent, CurriculumUnit, SchoolYear } from '@/domain/types';
import { slug } from '@/lib/ids';
import { artes } from './artes';
import { biologia } from './biologia';
import { edfisica } from './edfisica';
import { filosofia } from './filosofia';
import { fisica } from './fisica';
import { geografia } from './geografia';
import { historia } from './historia';
import { ingles } from './ingles';
import { literatura } from './literatura';
import { matematica } from './matematica';
import { portugues } from './portugues';
import { quimica } from './quimica';
import { sociologia } from './sociologia';
import type { CurriculumSeed } from './types';

/**
 * The shipped syllabus ("ementa"), organised as
 * `ano → disciplina → unidade → conteúdo → subconteúdos`.
 *
 * Keys must match the subject ids in `data/subjects.ts`.
 */
export const CURRICULUM_SEED: CurriculumSeed = {
  portugues,
  literatura,
  matematica,
  fisica,
  quimica,
  biologia,
  historia,
  geografia,
  filosofia,
  sociologia,
  ingles,
  artes,
  edfisica,
};

export interface BuiltCurriculum {
  units: CurriculumUnit[];
  contents: CurriculumContent[];
}

/**
 * Flattens the seed into the two entity arrays the store holds.
 *
 * Ids are derived from the subject, the year and a slug of the name, so they
 * are stable across releases: a student's progress stays attached to a topic
 * even when the dataset around it grows.
 */
export function buildCurriculum(seed: CurriculumSeed = CURRICULUM_SEED): BuiltCurriculum {
  const units: CurriculumUnit[] = [];
  const contents: CurriculumContent[] = [];

  for (const [subjectId, perYear] of Object.entries(seed)) {
    for (const [yearKey, unitSeeds] of Object.entries(perYear)) {
      const year = Number(yearKey) as SchoolYear;
      (unitSeeds ?? []).forEach((unitSeed, unitIndex) => {
        const [unitName, contentSeeds] = unitSeed;
        const unitId = `${subjectId}-${year}-${slug(unitName)}`;
        units.push({ id: unitId, subjectId, year, name: unitName, order: unitIndex });

        contentSeeds.forEach(([contentName, subtopics], contentIndex) => {
          contents.push({
            id: `${unitId}--${slug(contentName)}`,
            unitId,
            subjectId,
            year,
            name: contentName,
            subtopics,
            order: contentIndex,
          });
        });
      });
    }
  }

  return { units, contents };
}

export type { CurriculumSeed, ContentSeed, SubjectSeed, UnitSeed } from './types';
