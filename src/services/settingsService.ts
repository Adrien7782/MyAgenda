import type { SettingsRepository } from './ports';

/** Toutes les clés de réglages persistées, au même endroit. */
export const SettingKeys = {
  theme: 'theme',
  notificationsEnabled: 'notifications_enabled',
  progressPanelWidth: 'progress_panel_width',
  progressPanelCollapsed: 'progress_panel_collapsed',
  progressPeriod: 'progress_period',
  agendaView: 'agenda_view',
  trashSeenAt: 'trash_seen_at',
  eventTitleColors: 'event_title_colors',
  miniOpen: 'mini_open',
  miniBounds: 'mini_bounds',
  miniAlwaysOnTop: 'mini_always_on_top',
  miniPeriod: 'mini_period',
  closeToTray: 'close_to_tray',
  autoAlerts: 'auto_alerts',
  remindersFired: 'reminders_fired',
  updateNotifiedVersion: 'update_notified_version',
  focusSession: 'focus_session',
  lastSyncAt: 'last_sync_at',
  pullCursorTasks: 'sync_cursor_tasks',
  pullCursorEvents: 'sync_cursor_events',
  pullCursorNotes: 'sync_cursor_notes',
  /** Notes : curseur d'envoi séparé, qui n'avance que si le serveur a bien la table des notes. */
  lastNotesSyncAt: 'last_notes_sync_at',
} as const;

export type SettingKey = (typeof SettingKeys)[keyof typeof SettingKeys];

export function createSettingsService(repo: SettingsRepository) {
  return {
    get: (key: SettingKey) => repo.get(key),
    set: (key: SettingKey, value: string) => repo.set(key, value),
    async getNumber(key: SettingKey): Promise<number | null> {
      const v = await repo.get(key);
      const n = v === null ? NaN : Number(v);
      return Number.isFinite(n) ? n : null;
    },
    async getBool(key: SettingKey): Promise<boolean | null> {
      const v = await repo.get(key);
      return v === null ? null : v === '1' || v === 'true';
    },
    setBool: (key: SettingKey, value: boolean) => repo.set(key, value ? '1' : '0'),
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
