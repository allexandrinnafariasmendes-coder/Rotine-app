import type { SchoolYear } from '@/domain/types';

/** `[nome do conteúdo, [subconteúdos]]` */
export type ContentSeed = [string, string[]];
/** `[nome da unidade, conteúdos]` */
export type UnitSeed = [string, ContentSeed[]];
/** Units per school year. */
export type SubjectSeed = Partial<Record<SchoolYear, UnitSeed[]>>;
/** Keyed by subject id. */
export type CurriculumSeed = Record<string, SubjectSeed>;
