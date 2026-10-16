import { useEffect, useState } from 'react';
import { useFocusStore } from '../../store/focusStore';
import { useUiStore } from '../../store/uiStore';
import { playChime } from '../../shared/presentation/chime';
import type { WindowRole } from '../../infrastructure/tauri/windowRole';

/** Heure courante rafraîchie souvent tant qu'une séance tourne (affichage fluide de la jauge). */
export function useFocusNow(intervalMs = 250): number {
  const running = useFocusStore((s) => s.session.status === 'running');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [running, intervalMs]);
  return now;
}

/**
 * Surveille la fin de la séance dans chaque fenêtre, quelle que soit la page affichée.
 * Le carillon n'est joué qu'une fois : par le mini s'il est ouvert, sinon par la grande fenêtre.
 * (La notification Windows, elle, est envoyée par le planificateur natif.)
 */
export function useFocusWatcher(role: WindowRole, enabled: boolean): void {
  const running = useFocusStore((s) => s.session.status === 'running');
  useEffect(() => {
    if (!enabled || !running) return;
    const id = setInterval(() => {
      if (!useFocusStore.getState().settle()) return;
      const miniOpen = useUiStore.getState().isMiniOpen;
      if (role === 'mini' || !miniOpen) playChime();
    }, 500);
    return () => clearInterval(id);
  }, [enabled, running, role]);
}
