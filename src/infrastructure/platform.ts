/** Vrai quand le code tourne dans la fenêtre Tauri (et pas dans un simple navigateur). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** macOS : boutons de fenêtre natifs à gauche, barre des menus, libellés adaptés. */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const p = nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent;
  return /mac/i.test(p);
}

/** Barre de titre native de macOS (pastilles rouge / orange / vert) dans l'application installée. */
export function hasNativeMacControls(): boolean {
  return isTauri() && isMac();
}

/** Libellés qui dépendent du système. */
export const OS_TEXT = isMac()
  ? {
      os: 'macOS',
      notifications: 'Notifications macOS',
      tray: 'la barre des menus',
      trayHint: "L'icône My Agenda reste en haut de l'écran, dans la barre des menus : les rappels continuent. Pour quitter : ⌘Q, ou clic sur l'icône → Quitter.",
      autostart: "Lancer à l'ouverture de session",
      autostartHint: "My Agenda démarre discrètement dans la barre des menus quand tu ouvres ta session.",
      closeKeepsRunning: 'Fermer la fenêtre garde My Agenda en arrière-plan',
    }
  : {
      os: 'Windows',
      notifications: 'Notifications Windows',
      tray: 'la zone de notification',
      trayHint: "La fenêtre se cache dans la zone de notification (près de l'horloge) : les rappels continuent. Pour quitter : clic droit sur l'icône → Quitter.",
      autostart: 'Lancer au démarrage de Windows',
      autostartHint: "My Agenda démarre discrètement dans la zone de notification à l'ouverture de ta session.",
      closeKeepsRunning: 'La croix garde My Agenda en arrière-plan',
    };
