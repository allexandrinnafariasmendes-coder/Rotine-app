/**
 * Minimal async key/value store.
 *
 * IndexedDB is the primary backend because it survives restarts, has no 5 MB
 * ceiling and is not cleared by ordinary "clear session" behaviour. When it is
 * unavailable — private browsing on some engines, a blocked origin, a very old
 * browser — the store transparently falls back to `localStorage`, and if that
 * throws too, to an in-memory map so the app still runs for the session.
 *
 * Every read and write is wrapped, so a storage failure degrades the app
 * instead of breaking it.
 */

const DB_NAME = 'rotine';
const DB_VERSION = 1;
const STORE = 'kv';
const LS_PREFIX = 'rotine:kv:';

export type Backend = 'indexeddb' | 'localstorage' | 'memory';

const memory = new Map<string, unknown>();
let resolvedBackend: Backend | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir o banco'));
    request.onblocked = () => reject(new Error('Banco bloqueado por outra aba'));
  });
  dbPromise = dbPromise.catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

function idbRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Falha na transação'));
        tx.onabort = () => reject(tx.error ?? new Error('Transação abortada'));
      }),
  );
}

function lsGet<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

function lsSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Which backend actually served the last operation. Shown in Settings. */
export function currentBackend(): Backend {
  return resolvedBackend ?? 'memory';
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    const value = await idbRequest<T | undefined>('readonly', (s) => s.get(key));
    resolvedBackend = 'indexeddb';
    if (value !== undefined) return value;
    // Nothing in IndexedDB yet: an older build may have written to localStorage.
    return lsGet<T>(key);
  } catch {
    const fromLS = lsGet<T>(key);
    if (fromLS !== undefined) {
      resolvedBackend = 'localstorage';
      return fromLS;
    }
    resolvedBackend = resolvedBackend ?? 'memory';
    return memory.get(key) as T | undefined;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  try {
    await idbRequest('readwrite', (s) => s.put(value, key));
    resolvedBackend = 'indexeddb';
    return;
  } catch {
    // ignore and fall through
  }
  if (lsSet(key, value)) {
    resolvedBackend = 'localstorage';
    return;
  }
  resolvedBackend = 'memory';
}

export async function kvDelete(key: string): Promise<void> {
  memory.delete(key);
  try {
    await idbRequest('readwrite', (s) => s.delete(key));
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    // ignore
  }
}
