import { isDesktopTauri } from '../platform';

/** Intégration Windows : zone de notification, lancement au démarrage. */
export const desktopIntegration = {
  /** La croix cache l'application (true) ou la quitte (false). Appliqué côté Rust. */
  async setCloseToTray(enabled: boolean): Promise<void> {
    if (!isDesktopTauri()) return;
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_close_to_tray', { enabled });
  },

  async isAutostartEnabled(): Promise<boolean> {
    if (!isDesktopTauri()) return false;
    const { isEnabled } = await import('@tauri-apps/plugin-autostart');
    return isEnabled();
  },

  async setAutostart(enabled: boolean): Promise<void> {
    if (!isDesktopTauri()) return;
    const { enable, disable } = await import('@tauri-apps/plugin-autostart');
    await (enabled ? enable() : disable());
  },

  /** Clic sur "Afficher / masquer le mini" dans le menu de l'icône. */
  async onTrayToggleMini(cb: () => void): Promise<() => void> {
    if (!isDesktopTauri()) return () => undefined;
    const { listen } = await import('@tauri-apps/api/event');
    return listen('tray://toggle-mini', () => cb());
  },
};
