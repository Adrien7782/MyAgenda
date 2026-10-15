import { useEffect, useState } from 'react';

/** Date courante rafraîchie périodiquement (pour les "en retard", la ligne de l'heure…). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
