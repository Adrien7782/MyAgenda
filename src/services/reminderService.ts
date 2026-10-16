import type { CalendarEvent } from '../domain/event/event';
import type { Task } from '../domain/task/task';
import { planReminders, type PlannedReminder } from '../domain/reminder/reminder';
import type { ReminderScheduler, SettingsRepository } from './ports';
import { SettingKeys } from './settingsService';

const MAX_FIRED_KEYS = 300;

/**
 * Rappels : calcule le planning (rappels personnalisés + alertes automatiques)
 * et le confie au planificateur natif. Les rappels déjà envoyés sont mémorisés
 * pour ne jamais être renvoyés, même après un redémarrage.
 */
export function createReminderService(scheduler: ReminderScheduler, settings: SettingsRepository) {
  let fired: string[] | null = null;

  async function firedKeys(): Promise<string[]> {
    if (!fired) {
      try { fired = JSON.parse((await settings.get(SettingKeys.remindersFired)) ?? '[]'); } catch { fired = []; }
    }
    return fired ?? [];
  }

  /** `extra` : autres notifications à l'heure (ex. fin d'une séance de concentration). */
  async function refresh(
    tasks: Task[],
    events: CalendarEvent[],
    opts: { enabled: boolean; autoAlerts: boolean },
    extra: PlannedReminder[] = [],
  ): Promise<number> {
    if (!opts.enabled) {
      await scheduler.schedule([]);
      return 0;
    }
    const done = new Set(await firedKeys());
    const plan = [...planReminders(tasks, events, { autoAlerts: opts.autoAlerts, horizonMs: scheduler.horizonMs }), ...extra]
      .filter((r) => !done.has(r.key))
      .sort((a, b) => a.atMs - b.atMs)
      .slice(0, scheduler.maxItems ?? Infinity);
    await scheduler.schedule(plan);
    return plan.length;
  }

  async function markFired(key: string): Promise<void> {
    const keys = await firedKeys();
    if (keys.includes(key)) return;
    fired = [...keys, key].slice(-MAX_FIRED_KEYS);
    await settings.set(SettingKeys.remindersFired, JSON.stringify(fired));
  }

  return {
    refresh,
    markFired,
    onFired: (cb: (key: string) => void) => scheduler.onFired(cb),
  };
}

export type ReminderService = ReturnType<typeof createReminderService>;
