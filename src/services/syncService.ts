import type { CalendarEvent } from '../domain/event/event';
import type { Task } from '../domain/task/task';
import { nowIso } from '../domain/shared/date';
import type { RemoteStore, Repositories } from './ports';
import { SettingKeys } from './settingsService';

const EPOCH = '1970-01-01T00:00:00.000Z';

export interface SyncResult {
  pushed: number;
  /** Nombre d'éléments reçus du serveur et appliqués localement. */
  pulled: number;
}

/**
 * Synchronisation "offline-first" entre la base SQLite du compte et le serveur :
 * 1. PUSH : tout ce qui a changé localement depuis la dernière sync (suppressions comprises) ;
 * 2. PULL : tout ce qui a changé sur le serveur (autres appareils), repéré par l'horodatage serveur ;
 * conflit → la version avec le `updated_at` le plus récent gagne.
 * Les évènements importés (.ics) restent locaux : chaque appareil les re-télécharge depuis leur lien.
 */
export function createSyncService(remote: RemoteStore, repos: Repositories) {
  async function lastSync(): Promise<string> {
    return (await repos.settings.get(SettingKeys.lastSyncAt)) || EPOCH;
  }

  function newerThan<T extends { id: string; updated_at: string }>(incoming: T[], local: T[]): T[] {
    const map = new Map(local.map((x) => [x.id, x.updated_at]));
    return incoming.filter((r) => {
      const l = map.get(r.id);
      return !l || r.updated_at > l;
    });
  }

  async function sync(): Promise<SyncResult> {
    if (!(await remote.isConnected())) return { pushed: 0, pulled: 0 };
    const since = await lastSync();
    const startedAt = nowIso();

    const [localTasks, localEvents] = await Promise.all([
      repos.tasks.listChangedSince(since),
      repos.events.listChangedSince(since),
    ]);
    await remote.pushTasks(localTasks);
    await remote.pushEvents(localEvents);

    const [taskCursor, eventCursor] = await Promise.all([
      repos.settings.get(SettingKeys.pullCursorTasks),
      repos.settings.get(SettingKeys.pullCursorEvents),
    ]);
    const [taskPage, eventPage] = await Promise.all([
      remote.pullTasks(taskCursor || undefined),
      remote.pullEvents(eventCursor || undefined),
    ]);
    const remoteTasks = taskPage.rows;
    const remoteEvents = eventPage.rows;
    // Comparaison avec l'état local complet (y compris les éléments non modifiés depuis la dernière sync).
    const [allTasks, allEvents] = await Promise.all([repos.tasks.listChangedSince(EPOCH), repos.events.listChangedSince(EPOCH)]);
    const tasksToApply: Task[] = newerThan(remoteTasks, allTasks);
    const eventsToApply: CalendarEvent[] = newerThan(remoteEvents, allEvents);
    for (const t of tasksToApply) await repos.tasks.upsert(t);
    for (const e of eventsToApply) await repos.events.upsert(e);

    await repos.settings.set(SettingKeys.lastSyncAt, startedAt);
    if (taskPage.cursor) await repos.settings.set(SettingKeys.pullCursorTasks, taskPage.cursor);
    if (eventPage.cursor) await repos.settings.set(SettingKeys.pullCursorEvents, eventPage.cursor);
    return { pushed: localTasks.length + localEvents.length, pulled: tasksToApply.length + eventsToApply.length };
  }

  return {
    sync,
    isConnected: () => remote.isConnected(),
    lastSyncAt: () => repos.settings.get(SettingKeys.lastSyncAt),
    /** Repart de zéro à la prochaine sync : tout envoyer, tout récupérer (ex. données rattachées à un compte). */
    async resetSyncCursor() {
      await repos.settings.set(SettingKeys.lastSyncAt, '');
      await repos.settings.set(SettingKeys.pullCursorTasks, '');
      await repos.settings.set(SettingKeys.pullCursorEvents, '');
    },
  };
}

export type SyncService = ReturnType<typeof createSyncService>;
