import { create } from 'zustand';
import { services } from '../app/container';
import type { AppUpdate, UpdateProgress } from '../services/ports';
import { describeUpdateError } from '../services/updateService';
import { useSettingsStore } from './settingsStore';
import { useSyncStore } from './syncStore';

export type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'installing' | 'error';

interface UpdateState {
  status: UpdateStatus;
  available: AppUpdate | null;
  progress: UpdateProgress | null;
  error: string | null;
  lastCheckedAt: string | null;
  /** Bandeau "nouvelle version" masqué jusqu'au prochain démarrage. */
  bannerDismissed: boolean;
  /** silent : vérification automatique (pas d'état "recherche…" ni d'erreur affichée). */
  check(opts?: { silent?: boolean }): Promise<void>;
  install(): Promise<void>;
  dismissBanner(): void;
}

let checking = false;

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: 'idle',
  available: null,
  progress: null,
  error: null,
  lastCheckedAt: null,
  bannerDismissed: false,

  async check({ silent = false } = {}) {
    if (checking || !services.updates.supported || get().status === 'installing') return;
    checking = true;
    if (!silent) set({ status: 'checking', error: null });
    try {
      const update = await services.updates.check({ notify: useSettingsStore.getState().notificationsEnabled });
      set({
        status: update ? 'available' : 'up-to-date',
        available: update,
        error: null,
        lastCheckedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[Mises à jour]', e);
      // En vérification automatique, une coupure réseau ne doit pas afficher d'erreur.
      if (!silent) set({ status: 'error', error: describeUpdateError(e) });
    } finally {
      checking = false;
    }
  },

  async install() {
    if (get().status === 'installing') return;
    set({ status: 'installing', progress: { downloaded: 0 }, error: null });
    try {
      // Dernière synchronisation avant que l'installeur ne ferme l'application.
      await useSyncStore.getState().syncNow().catch(() => undefined);
      await services.updates.install((progress) => set({ progress }));
    } catch (e) {
      console.error('[Mises à jour]', e);
      // On garde la version trouvée affichée : l'utilisateur peut réessayer.
      set({ status: get().available ? 'available' : 'error', progress: null, error: describeUpdateError(e, 'install') });
    }
  },

  dismissBanner() {
    set({ bannerDismissed: true });
  },
}));
