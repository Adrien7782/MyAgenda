import { isTauri } from '../platform';
import { MINI_LABEL } from './windowRole';

export interface WindowBounds { x: number; y: number; width: number; height: number }

const DEFAULT = { width: 340, height: 520 };

async function find() {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  return WebviewWindow.getByLabel(MINI_LABEL);
}

/** Pilotage de la fenêtre "My Agenda Mini" depuis la fenêtre principale. */
export const miniWindow = {
  async isOpen(): Promise<boolean> {
    if (!isTauri()) return false;
    return !!(await find());
  },

  async open(opts: { bounds: WindowBounds | null; alwaysOnTop: boolean }): Promise<void> {
    if (!isTauri()) return;
    const existing = await find();
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const b = opts.bounds;
    const win = new WebviewWindow(MINI_LABEL, {
      url: 'index.html',
      title: 'My Agenda Mini',
      width: b?.width ?? DEFAULT.width,
      height: b?.height ?? DEFAULT.height,
      ...(b ? { x: b.x, y: b.y } : { center: true }),
      minWidth: 240,
      minHeight: 280,
      resizable: true,
      decorations: false,
      shadow: true,
      alwaysOnTop: opts.alwaysOnTop,
      focus: true,
    });
    await new Promise<void>((resolve, reject) => {
      void win.once('tauri://created', () => resolve());
      void win.once('tauri://error', (e) => reject(new Error(String(e.payload))));
    });
  },

  async close(): Promise<void> {
    if (!isTauri()) return;
    await (await find())?.close();
  },
};

/** Côté fenêtre mini : épingler, fermer, mémoriser position et taille. */
export const currentMiniWindow = {
  async setAlwaysOnTop(v: boolean) {
    if (!isTauri()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setAlwaysOnTop(v);
  },

  async close() {
    if (!isTauri()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  },

  /** Appelle `cb` avec les dimensions logiques après chaque déplacement / redimensionnement. */
  async onBoundsChanged(cb: (b: WindowBounds) => void): Promise<() => void> {
    if (!isTauri()) return () => undefined;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const w = getCurrentWindow();
    const read = async () => {
      const scale = await w.scaleFactor();
      const pos = (await w.outerPosition()).toLogical(scale);
      const size = (await w.innerSize()).toLogical(scale);
      cb({ x: Math.round(pos.x), y: Math.round(pos.y), width: Math.round(size.width), height: Math.round(size.height) });
    };
    const offMove = await w.onMoved(() => void read());
    const offResize = await w.onResized(() => void read());
    return () => { offMove(); offResize(); };
  },
};
