import { create } from 'zustand';
import { services } from '../app/container';
import * as focus from '../domain/focus/focus';
import type { FocusSession } from '../domain/focus/focus';
import { MINUTE_MS } from '../domain/shared/date';
import type { PlannedReminder } from '../domain/reminder/reminder';
import { SettingKeys } from '../services/settingsService';

interface FocusState {
  session: FocusSession;
  hydrated: boolean;
  /** Relit la séance enregistrée (démarrage, ou modification faite dans l'autre fenêtre). */
  hydrate(): Promise<void>;
  setDuration(ms: number): void;
  start(): void;
  pause(): void;
  resume(): void;
  /** Démarre / met en pause / reprend selon l'état. */
  toggle(): void;
  stop(): void;
  addMinutes(minutes: number): void;
  /** Appelé par l'horloge : passe la séance en "terminée" quand l'heure de fin est atteinte. */
  settle(): boolean;
}

/**
 * Séance de concentration partagée par la grande fenêtre et le mini :
 * enregistrée dans les réglages, chaque changement est diffusé à l'autre fenêtre.
 */
export const useFocusStore = create<FocusState>((set, get) => {
  function commit(next: FocusSession) {
    set({ session: next });
    void services.settings.set(SettingKeys.focusSession, JSON.stringify(next));
    services.changeBus.publish('focus');
  }

  return {
    session: focus.idleSession(),
    hydrated: false,

    async hydrate() {
      const raw = await services.settings.get(SettingKeys.focusSession);
      set({ session: focus.settle(focus.parseSession(raw), Date.now()), hydrated: true });
    },

    setDuration(ms) {
      const s = get().session;
      if (s.status === 'idle' || s.status === 'finished') commit(focus.idleSession(ms));
    },
    start() { commit(focus.start(get().session, Date.now())); },
    pause() { commit(focus.pause(get().session, Date.now())); },
    resume() { commit(focus.resume(get().session, Date.now())); },
    toggle() {
      const { session } = get();
      if (session.status === 'running') get().pause();
      else if (session.status === 'paused') get().resume();
      else get().start();
    },
    stop() { commit(focus.stop(get().session)); },
    addMinutes(minutes) { commit(focus.addTime(get().session, minutes * MINUTE_MS, Date.now())); },

    settle() {
      const { session } = get();
      const next = focus.settle(session, Date.now());
      if (next === session) return false;
      // Pas de diffusion : l'autre fenêtre arrive à la même conclusion avec sa propre horloge.
      set({ session: next });
      void services.settings.set(SettingKeys.focusSession, JSON.stringify(next));
      return true;
    },
  };
});

/** Notification de fin de séance, confiée au planificateur natif (fonctionne application cachée). */
export function focusEndNotification(s: FocusSession): PlannedReminder[] {
  if (s.status !== 'running' || !s.endsAt) return [];
  return [{
    key: `focus:${s.startedAt ?? 0}:${s.endsAt}`,
    atMs: s.endsAt,
    title: '⏱️ Séance de concentration terminée',
    body: `${focus.formatDuration(s.durationMs)} de concentration : bravo ! Prends une pause.`,
  }];
}
