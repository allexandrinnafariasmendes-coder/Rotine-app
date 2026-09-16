import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppState } from '@/domain/types';
import { loadState, saveState } from '@/lib/storage/persistence';
import { createInitialState } from '@/lib/storage/schema';
import type { Action } from './actions';
import { reducer } from './reducer';

interface StoreValue {
  state: AppState;
  dispatch: (action: Action) => void;
  /** False until the persisted state has been read back. */
  ready: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Writes are debounced so a burst of edits costs one transaction. */
const SAVE_DEBOUNCE_MS = 400;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);
  const saveTimer = useRef<number | null>(null);

  // Read the persisted state once, on mount.
  useEffect(() => {
    let cancelled = false;
    loadState()
      .then(({ state: loaded }) => {
        if (cancelled) return;
        dispatch({ type: 'hydrate', state: loaded });
      })
      .finally(() => {
        if (cancelled) return;
        hydrated.current = true;
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change, debounced, and flush when the tab goes away.
  useEffect(() => {
    if (!hydrated.current) return;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveState(state);
      saveTimer.current = null;
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [state]);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const flush = () => {
      if (hydrated.current) void saveState(stateRef.current);
    };
    // `visibilitychange` is the reliable one on mobile; `pagehide` covers
    // navigation away and `beforeunload` desktop tab closes.
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, []);

  const value = useMemo<StoreValue>(() => ({ state, dispatch, ready }), [state, ready]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore precisa estar dentro de <StoreProvider>.');
  return ctx;
}

export function useAppState(): AppState {
  return useStore().state;
}

export function useDispatch(): (action: Action) => void {
  const { dispatch } = useStore();
  return useCallback((action: Action) => dispatch(action), [dispatch]);
}
