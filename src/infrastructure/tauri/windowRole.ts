import { isTauri } from '../platform';

export type WindowRole = 'main' | 'mini';
export const MINI_LABEL = 'mini';

/** Rôle de la fenêtre courante, déterminé par son label Tauri. */
export async function detectWindowRole(): Promise<WindowRole> {
  // Dans le navigateur, `?window=mini` permet de travailler le design du mini.
  if (!isTauri()) return new URLSearchParams(window.location.search).get('window') === MINI_LABEL ? 'mini' : 'main';
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow().label === MINI_LABEL ? 'mini' : 'main';
}
