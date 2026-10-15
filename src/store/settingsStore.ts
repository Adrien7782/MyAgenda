import { create } from 'zustand';
import type { ProgressPeriod } from '../domain/task/taskStats';
import { services } from '../app/container';
import { SettingKeys } from '../services/settingsService';
import { applyTheme, isTheme, type Theme } from '../shared/presentation/themes';
import { desktopIntegration } from '../infrastructure/tauri/desktopIntegration';

export type AgendaView = 'day' | 'week' | 'month';

export const PROGRESS_PANEL = { min: 260, max: 640, default: 340 } as const;

interface SettingsState {
  theme: Theme;
  notificationsEnabled: boolean;
  progressPanelWidth: number;
  progressPanelCollapsed: boolean;
  progressPeriod: ProgressPeriod;
  agendaView: AgendaView;
  /** Date de la dernière visite de la corbeille (pastille de la barre latérale). */
  trashSeenAt: string;
  /** Fenêtre mini : toujours au premier plan + période affichée. */
  miniAlwaysOnTop: boolean;
  miniPeriod: ProgressPeriod;
  /** La croix cache l'app dans la zone de notification (true) ou la quitte (false). */
  closeToTray: boolean;
  /** Alertes automatiques (30 min avant chaque échéance, 15 min avant chaque évènement perso). */
  autoAlerts: boolean;
  hydrate(): Promise<void>;
  setTheme(theme: Theme): void;
  setNotificationsEnabled(v: boolean): void;
  /** `persist=false` pendant le glisser, `true` au relâchement. */
  setProgressPanelWidth(width: number, persist?: boolean): void;
  setProgressPanelCollapsed(v: boolean): void;
  setProgressPeriod(p: ProgressPeriod): void;
  setAgendaView(v: AgendaView): void;
  markTrashSeen(): void;
  setMiniAlwaysOnTop(v: boolean): void;
  setMiniPeriod(p: ProgressPeriod): void;
  setCloseToTray(v: boolean): void;
  setAutoAlerts(v: boolean): void;
}

const settings = services.settings;
const clampWidth = (w: number) => Math.round(Math.min(PROGRESS_PANEL.max, Math.max(PROGRESS_PANEL.min, w)));
const PERIODS: ProgressPeriod[] = ['day', 'week', 'month', 'all'];
const VIEWS: AgendaView[] = ['day', 'week', 'month'];

/** Réglages d'interface, persistés dans la table `settings`. */
export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'bleu',
  notificationsEnabled: true,
  progressPanelWidth: PROGRESS_PANEL.default,
  progressPanelCollapsed: false,
  progressPeriod: 'all',
  agendaView: 'month',
  trashSeenAt: new Date(0).toISOString(),
  miniAlwaysOnTop: true,
  miniPeriod: 'day',
  closeToTray: true,
  autoAlerts: true,

  async hydrate() {
    const [theme, notif, width, collapsed, period, view, trashSeenAt, miniOnTop, miniPeriod] = await Promise.all([
      settings.get(SettingKeys.theme),
      settings.getBool(SettingKeys.notificationsEnabled),
      settings.getNumber(SettingKeys.progressPanelWidth),
      settings.getBool(SettingKeys.progressPanelCollapsed),
      settings.get(SettingKeys.progressPeriod),
      settings.get(SettingKeys.agendaView),
      settings.get(SettingKeys.trashSeenAt),
      settings.getBool(SettingKeys.miniAlwaysOnTop),
      settings.get(SettingKeys.miniPeriod),
    ]);
    const closeToTray = await settings.getBool(SettingKeys.closeToTray);
    const autoAlerts = await settings.getBool(SettingKeys.autoAlerts);
    const next: Partial<SettingsState> = {};
    if (isTheme(theme)) next.theme = theme;
    if (notif !== null) next.notificationsEnabled = notif;
    if (width !== null) next.progressPanelWidth = clampWidth(width);
    if (collapsed !== null) next.progressPanelCollapsed = collapsed;
    if (PERIODS.includes(period as ProgressPeriod)) next.progressPeriod = period as ProgressPeriod;
    if (VIEWS.includes(view as AgendaView)) next.agendaView = view as AgendaView;
    if (trashSeenAt) next.trashSeenAt = trashSeenAt;
    if (miniOnTop !== null) next.miniAlwaysOnTop = miniOnTop;
    if (PERIODS.includes(miniPeriod as ProgressPeriod)) next.miniPeriod = miniPeriod as ProgressPeriod;
    if (closeToTray !== null) next.closeToTray = closeToTray;
    if (autoAlerts !== null) next.autoAlerts = autoAlerts;
    set(next);
    void desktopIntegration.setCloseToTray(next.closeToTray ?? true).catch(() => undefined);
    applyTheme(next.theme ?? 'bleu');
  },

  setTheme(theme) {
    applyTheme(theme);
    set({ theme });
    void settings.set(SettingKeys.theme, theme).then(() => services.changeBus.publish('settings'));
  },

  setNotificationsEnabled(v) {
    set({ notificationsEnabled: v });
    void settings.setBool(SettingKeys.notificationsEnabled, v);
  },

  setProgressPanelWidth(width, persist = true) {
    const w = clampWidth(width);
    set({ progressPanelWidth: w });
    if (persist) void settings.set(SettingKeys.progressPanelWidth, String(w));
  },

  setProgressPanelCollapsed(v) {
    set({ progressPanelCollapsed: v });
    void settings.setBool(SettingKeys.progressPanelCollapsed, v);
  },

  setProgressPeriod(p) {
    set({ progressPeriod: p });
    void settings.set(SettingKeys.progressPeriod, p);
  },

  setAgendaView(v) {
    set({ agendaView: v });
    void settings.set(SettingKeys.agendaView, v);
  },

  setMiniAlwaysOnTop(v) {
    set({ miniAlwaysOnTop: v });
    void settings.setBool(SettingKeys.miniAlwaysOnTop, v);
  },

  setMiniPeriod(p) {
    set({ miniPeriod: p });
    void settings.set(SettingKeys.miniPeriod, p);
  },

  setCloseToTray(v) {
    set({ closeToTray: v });
    void settings.setBool(SettingKeys.closeToTray, v);
    void desktopIntegration.setCloseToTray(v);
  },

  setAutoAlerts(v) {
    set({ autoAlerts: v });
    void settings.setBool(SettingKeys.autoAlerts, v);
  },

  markTrashSeen() {
    const now = new Date().toISOString();
    set({ trashSeenAt: now });
    void settings.set(SettingKeys.trashSeenAt, now);
  },
}));
