import type { ReminderScheduler, ScheduledNotification } from '../../services/ports';
import { isIOS, isMobileApp, isTauri } from '../platform';
import { showWebNotification } from '../web/webNotifications';

/** Ordinateur : le planning est confié au Rust (fil natif, insensible à la mise en veille de la fenêtre). */
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

const CHANNEL_ID = 'rappels';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Identifiant numérique stable (Android et iOS identifient une notification par un entier). */
export function notificationId(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 1) || 1; // entier positif sur 31 bits, jamais 0
}

/**
 * Téléphone : chaque rappel est confié au système (Android / iOS), qui l'affiche à l'heure
 * même si My Agenda est fermé. À chaque recalcul, les anciens rappels programmés sont annulés
 * puis reprogrammés.
 */
export class MobileReminderScheduler implements ReminderScheduler {
  readonly horizonMs = 30 * DAY_MS;
  // iOS : 64 notifications programmées au maximum par application.
  readonly maxItems = isIOS() ? 60 : 300;
  private channelReady = false;

  async schedule(list: ScheduledNotification[]): Promise<void> {
    const n = await import('@tauri-apps/plugin-notification');
    if (!this.channelReady) {
      try {
        await n.createChannel({ id: CHANNEL_ID, name: 'Rappels', description: 'Rappels des tâches et évènements', importance: n.Importance.High, vibration: true });
      } catch { /* iOS : pas de canaux */ }
      this.channelReady = true;
    }
    try {
      const pending = await n.pending();
      if (pending.length) await n.cancel(pending.map((p) => p.id));
    } catch (e) {
      console.warn('[Rappels] annulation impossible', e);
    }
    // Uniquement le futur : un rappel déjà passé serait affiché immédiatement à chaque recalcul.
    const now = Date.now();
    for (const r of list) {
      if (r.atMs <= now + 1000) continue;
      n.sendNotification({
        id: notificationId(r.key),
        channelId: CHANNEL_ID,
        title: r.title,
        body: r.body,
        schedule: n.Schedule.at(new Date(r.atMs), false, true),
      });
    }
  }

  /** Le système affiche lui-même les rappels : rien à mémoriser. */
  async onFired(): Promise<() => void> {
    return () => undefined;
  }
}

/** Retard au-delà duquel un rappel n'est plus affiché (page restée en arrière-plan, iPhone en veille…). */
const BROWSER_LATE_MS = 15 * 60 * 1000;

/**
 * Web app : minuteries JavaScript + notifications du navigateur (si autorisées).
 * Les rappels ne s'affichent que pendant que My Agenda est ouverte.
 */
export class BrowserReminderScheduler implements ReminderScheduler {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private listeners = new Set<(key: string) => void>();

  async schedule(list: ScheduledNotification[]): Promise<void> {
    this.timers.forEach(clearTimeout);
    this.timers = list.map((r) => setTimeout(() => {
      // Page endormie puis réveillée longtemps après : un rappel aussi en retard n'a plus de sens.
      if (Date.now() - r.atMs <= BROWSER_LATE_MS) {
        void showWebNotification(r.title, r.body, r.key).then((shown) => { if (!shown) console.info('[Rappel]', r.title, r.body); });
      }
      this.listeners.forEach((l) => l(r.key));
    }, Math.max(0, r.atMs - Date.now())));
  }

  async onFired(cb: (key: string) => void): Promise<() => void> {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export function createReminderScheduler(): ReminderScheduler {
  if (isMobileApp()) return new MobileReminderScheduler();
  return isTauri() ? new TauriReminderScheduler() : new BrowserReminderScheduler();
}
