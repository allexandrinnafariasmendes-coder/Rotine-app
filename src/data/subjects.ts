import type { Subject } from '@/domain/types';

/**
 * The thirteen subjects a Brazilian high school student normally carries.
 * `colorSlot` indexes the validated categorical palette; the order below keeps
 * subjects that appear side by side in the same area on different hues.
 * Students can add, rename, recolour or archive any of them.
 */
export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'portugues', name: 'Língua Portuguesa', shortName: 'POR', colorSlot: 1, emoji: '📖' },
  { id: 'literatura', name: 'Literatura', shortName: 'LIT', colorSlot: 5, emoji: '📚' },
  { id: 'matematica', name: 'Matemática', shortName: 'MAT', colorSlot: 7, emoji: '📐' },
  { id: 'fisica', name: 'Física', shortName: 'FIS', colorSlot: 1, emoji: '🧲' },
  { id: 'quimica', name: 'Química', shortName: 'QUI', colorSlot: 2, emoji: '⚗️' },
  { id: 'biologia', name: 'Biologia', shortName: 'BIO', colorSlot: 3, emoji: '🧬' },
  { id: 'historia', name: 'História', shortName: 'HIS', colorSlot: 4, emoji: '🏛️' },
  { id: 'geografia', name: 'Geografia', shortName: 'GEO', colorSlot: 6, emoji: '🌍' },
  { id: 'filosofia', name: 'Filosofia', shortName: 'FIL', colorSlot: 7, emoji: '🤔' },
  { id: 'sociologia', name: 'Sociologia', shortName: 'SOC', colorSlot: 8, emoji: '👥' },
  { id: 'ingles', name: 'Língua Inglesa', shortName: 'ING', colorSlot: 1, emoji: '🇬🇧' },
  { id: 'artes', name: 'Artes', shortName: 'ART', colorSlot: 5, emoji: '🎨' },
  { id: 'edfisica', name: 'Educação Física', shortName: 'EDF', colorSlot: 3, emoji: '🏃' },
];
