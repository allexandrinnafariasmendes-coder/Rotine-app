/**
 * Provider registry.
 *
 * The app asks the registry for a provider instead of importing one, which is
 * what makes a future remote model a configuration change rather than a
 * refactor. `preferred` returns the best available provider; when a remote one
 * is registered and reachable it wins, otherwise the local engine answers.
 */

import { heuristicProvider } from './heuristic';
import type { AIProvider } from './provider';

const providers: AIProvider[] = [heuristicProvider];

export function registerProvider(provider: AIProvider): void {
  const index = providers.findIndex((p) => p.id === provider.id);
  if (index >= 0) providers[index] = provider;
  else providers.unshift(provider);
}

export function listProviders(): AIProvider[] {
  return [...providers];
}

export function getProvider(id?: string): AIProvider {
  if (id) {
    const found = providers.find((p) => p.id === id && p.available);
    if (found) return found;
  }
  return providers.find((p) => p.available) ?? heuristicProvider;
}

/** The provider the app should use right now. */
export function preferredProvider(): AIProvider {
  return getProvider();
}

export type { AIProvider } from './provider';
export * from './provider';
