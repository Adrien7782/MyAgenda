import { isTauri } from '../platform';

/** Accès à la fenêtre native. Ne fait rien dans un navigateur. */
async function win() {
  if (!isTauri()) return null;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export const windowControls = {
  async minimize() { await (await win())?.minimize(); },
  async toggleMaximize() { await (await win())?.toggleMaximize(); },
  async close() { await (await win())?.close(); },
  async isMaximized(): Promise<boolean> { return (await (await win())?.isMaximized()) ?? false; },
  /** Appelle `cb` à chaque redimensionnement ; renvoie la fonction de désabonnement. */
  async onResized(cb: () => void): Promise<() => void> {
    const w = await win();
    if (!w) return () => undefined;
    return w.onResized(() => cb());
  },
};
