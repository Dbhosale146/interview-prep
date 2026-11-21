import { useEffect, useState } from 'react';

/**
 * Tracks a CSS media query. Used to mount either the fixed desktop sidebar or
 * the mobile drawer - never both, so shared framer-motion layoutIds stay
 * unambiguous.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia(query);
    } catch {
      return undefined;
    }
    const onChange = (event) => setMatches(event.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
