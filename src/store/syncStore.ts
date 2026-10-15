import { create } from 'zustand';
import { services } from '../app/container';
import { useTaskStore } from './taskStore';
import { useEventStore } from './eventStore';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  error: string | null;
  loadLastSync(): Promise<void>;
  syncNow(): Promise<void>;
}

let running = false;

/** État de la synchronisation avec le serveur (le compte connecté est géré par authStore). */
export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncAt: null,
  error: null,

  async loadLastSync() {
    set({ lastSyncAt: (await services.sync.lastSyncAt()) || null });
  },

  async syncNow() {
    if (running || !services.auth.isConfigured()) return;
    running = true;
    set({ status: 'syncing' });
    try {
      const { pulled } = await services.sync.sync();
      // Des changements venus d'un autre appareil → on relit la base (et le mini est prévenu).
      if (pulled > 0) {
        await Promise.all([useTaskStore.getState().load(), useEventStore.getState().load()]);
        services.changeBus.publish('tasks');
        services.changeBus.publish('events');
      }
      set({ status: 'success', lastSyncAt: new Date().toISOString(), error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      set({ status: offline || /fetch|network/i.test(msg) ? 'offline' : 'error', error: msg });
    } finally {
      running = false;
    }
  },
}));
