import type { Notifier } from '../../services/ports';
import { isIOS } from '../platform';

/**
 * Notifications de la web app.
 * - Ordinateur (Chrome, Edge, Firefox, Safari) : autorisées depuis Réglages → Notifications.
 * - iPhone / iPad (iOS 16.4+) : uniquement quand My Agenda est ajoutée à l'écran d'accueil.
 * Les rappels sont affichés tant que My Agenda est ouverte (onglet ou app de l'écran d'accueil).
 */
export type WebNotificationState = 'unsupported' | 'needs-home-screen' | 'default' | 'granted' | 'denied';

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function webNotificationState(): WebNotificationState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return isIOS() && !isStandalone() ? 'needs-home-screen' : 'unsupported';
  return Notification.permission === 'default' ? 'default' : Notification.permission;
}

/** À appeler depuis un appui sur un bouton (obligatoire sur iPhone et dans Safari). */
export async function requestWebNotifications(): Promise<WebNotificationState> {
  if (!('Notification' in window)) return webNotificationState();
  try { await Notification.requestPermission(); } catch { /* ancien Safari : rappel sans promesse */ }
  return webNotificationState();
}

export async function showWebNotification(title: string, body: string, tag?: string): Promise<boolean> {
  if (webNotificationState() !== 'granted') return false;
  const options: NotificationOptions = { body, tag, icon: `${import.meta.env.BASE_URL}pwa/icon-192.png` };
  try {
    // iPhone et Android n'acceptent que les notifications passant par le service worker.
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
    new Notification(title, options);
    return true;
  } catch (e) {
    console.warn('[Notifications]', e);
    return false;
  }
}

export class WebNotifier implements Notifier {
  /** Ne demande jamais l'autorisation toute seule : le navigateur l'exige depuis un appui (voir Réglages). */
  async ensurePermission(): Promise<boolean> {
    return webNotificationState() === 'granted';
  }

  async notify(title: string, body: string): Promise<void> {
    await showWebNotification(title, body);
  }
}
