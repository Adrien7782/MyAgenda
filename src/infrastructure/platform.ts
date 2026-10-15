/** Vrai quand le code tourne dans la fenêtre Tauri (et pas dans un simple navigateur). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
