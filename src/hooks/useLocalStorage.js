import { useCallback, useRef, useState } from 'react';

/**
 * State backed by localStorage. Reads and writes are wrapped so that a
 * private window, a blocked origin or corrupt JSON never breaks the app -
 * the initial value is used instead.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      return JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  // Keep the latest value available to the setter without re-creating it.
  const ref = useRef(value);
  ref.current = value;

  const update = useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? next(ref.current) : next;
      ref.current = resolved;
      setValue(resolved);
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        /* Storage full or unavailable - keep the in-memory value. */
      }
    },
    [key],
  );

  return [value, update];
}
