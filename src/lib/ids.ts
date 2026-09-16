/** Stable id helpers. `crypto.randomUUID` when available, with a fallback. */

export function uid(prefix = 'id'): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c) return `${prefix}_${c.randomUUID().slice(0, 12)}`;
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Deterministic, URL-safe slug — used to build stable curriculum ids. */
export function slug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

export function nowISO(): string {
  return new Date().toISOString();
}
