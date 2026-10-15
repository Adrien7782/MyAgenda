import type { ReminderScheduler, ScheduledNotification } from '../../services/ports';
import { isTauri } from '../platform';

/** Dans Tauri : le planning est confié au Rust (fil natif, insensible à la mise en veille de la fenêtre). */
export class TauriReminderScheduler implements ReminderScheduler {
  async schedule(list: ScheduledNotification[]): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('schedule_reminders', { reminders: list });
  }

  async onFired(cb: (key: string) => void): Promise<() => void> {
    const { listen } = await import('@tauri-apps/api/event');
    return listen<string>('reminder://fired', (e) => cb(e.payload));
  }
}

/** Mode navigateur : minuteries JavaScript + notifications du navigateur (si autorisées). */
export class BrowserReminderScheduler implements ReminderScheduler {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private listeners = new Set<(key: string) => void>();

  async schedule(list: ScheduledNotification[]): Promise<void> {
    this.timers.forEach(clearTimeout);
    this.timers = list.map((r) => setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') new Notification(r.title, { body: r.body });
      else console.info('[Rappel]', r.title, r.body);
      this.listeners.forEach((l) => l(r.key));
    }, Math.max(0, r.atMs - Date.now())));
  }

  async onFired(cb: (key: string) => void): Promise<() => void> {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export function createReminderScheduler(): ReminderScheduler {
  return isTauri() ? new TauriReminderScheduler() : new BrowserReminderScheduler();
}
