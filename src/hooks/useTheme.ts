import { useEffect } from 'react';
import type { ThemePreference } from '@/domain/types';

const STORAGE_KEY = 'rotine:theme';

/**
 * Applies the theme preference to `<html data-theme>` and mirrors it into
 * localStorage, which the inline script in `index.html` reads before first
 * paint to avoid a flash of the wrong theme.
 */
export function useTheme(preference: ThemePreference): void {
  useEffect(() => {
    const root = document.documentElement;
    if (preference === 'system') {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = preference;
    }
    try {
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Storage can be unavailable; the in-memory attribute still works.
    }
  }, [preference]);
}
