import { useCallback } from 'react';
import { isDesktopApp, services } from '../../app/container';
import { miniWindow, type WindowBounds } from '../../infrastructure/tauri/miniWindow';
import { SettingKeys } from '../../services/settingsService';
import { useSettingsStore } from '../../store/settingsStore';
import { useUiStore } from '../../store/uiStore';

export async function loadMiniBounds(): Promise<WindowBounds | null> {
  const raw = await services.settings.get(SettingKeys.miniBounds);
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as WindowBounds;
    return b.width >= 200 && b.height >= 200 ? b : null;
  } catch {
    return null;
  }
}

/** Ouvre la fenêtre mini (dans Tauri) ou le widget flottant (navigateur). */
export async function openMini(): Promise<void> {
  if (isDesktopApp) {
    await miniWindow.open({ bounds: await loadMiniBounds(), alwaysOnTop: useSettingsStore.getState().miniAlwaysOnTop });
  }
  useUiStore.getState().setMiniOpen(true);
  await services.settings.setBool(SettingKeys.miniOpen, true);
}

export async function closeMini(): Promise<void> {
  if (isDesktopApp) await miniWindow.close();
  useUiStore.getState().setMiniOpen(false);
  await services.settings.setBool(SettingKeys.miniOpen, false);
}

export async function toggleMini(): Promise<void> {
  const open = isDesktopApp ? await miniWindow.isOpen() : useUiStore.getState().isMiniOpen;
  await (open ? closeMini() : openMini());
}

/** Côté grande fenêtre : bouton "Mode mini" de la barre latérale. */
export function useMiniWindowController() {
  const isOpen = useUiStore((s) => s.isMiniOpen);
  const toggle = useCallback(() => toggleMini(), []);
  return { isOpen, toggle };
}
