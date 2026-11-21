import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage.js';

export const THEME_KEY = 'interviewprep.theme.v1';

function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Owns the light/dark choice. Defaults to the OS preference on first run and
 * remembers an explicit choice afterwards. The `dark` class on <html> is what
 * every theme token in index.css keys off.
 */
export function useTheme() {
  const [stored, setStored] = useLocalStorage(THEME_KEY, null);
  const theme = stored === 'light' || stored === 'dark' ? stored : systemTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);

  // Follow the OS while the user has not made an explicit choice.
  useEffect(() => {
    if (stored === 'light' || stored === 'dark') return undefined;
    let mq;
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return undefined;
    }
    const onChange = () => {
      const root = document.documentElement;
      const next = mq.matches ? 'dark' : 'light';
      root.classList.toggle('dark', next === 'dark');
      root.style.colorScheme = next;
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [stored]);

  const toggleTheme = useCallback(() => {
    setStored(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setStored]);

  return { theme, toggleTheme, setTheme: setStored };
}
