import { useEffect, useRef } from 'react';

/** setInterval qui appelle toujours la dernière version du callback. `null` = en pause. */
export function useInterval(callback: () => void, delayMs: number | null, runImmediately = false) {
  const saved = useRef(callback);
  useEffect(() => { saved.current = callback; });
  useEffect(() => {
    if (delayMs === null) return;
    if (runImmediately) saved.current();
    const id = setInterval(() => saved.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs, runImmediately]);
}
