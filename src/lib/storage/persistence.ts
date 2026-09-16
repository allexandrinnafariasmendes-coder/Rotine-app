/**
 * Persistence for the whole application state.
 *
 * The state tree is stored as one record. That is a deliberate trade-off: the
 * data a single student produces in three years of high school is a few hundred
 * kilobytes, and a single record makes atomic saves and migrations trivial.
 * `schema.ts` holds the version and the migration chain, so a returning student
 * never loses data when the app gains fields.
 */

import type { AppState } from '@/domain/types';
import { kvGet, kvSet, currentBackend } from './kv';
import { CURRENT_VERSION, migrate, createInitialState } from './schema';

const STATE_KEY = 'app-state';

export async function loadState(): Promise<{ state: AppState; restored: boolean }> {
  const raw = await kvGet<unknown>(STATE_KEY);
  if (!raw || typeof raw !== 'object') {
    return { state: createInitialState(), restored: false };
  }
  try {
    return { state: migrate(raw as Partial<AppState>), restored: true };
  } catch {
    // Corrupt payload: start clean rather than crash on boot.
    return { state: createInitialState(), restored: false };
  }
}

export async function saveState(state: AppState): Promise<void> {
  await kvSet(STATE_KEY, { ...state, version: CURRENT_VERSION });
}

/** Full export, for the "download my data" button in Settings. */
export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

/** Import of a previously exported file, run through the migration chain. */
export function parseImportedState(json: string): AppState {
  const parsed = JSON.parse(json) as Partial<AppState>;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.subjects)) {
    throw new Error('Arquivo não parece ser um backup do Rotine.');
  }
  return migrate(parsed);
}

export { currentBackend, CURRENT_VERSION };
