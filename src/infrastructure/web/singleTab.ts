import { flushDb } from '../sqlite/database';

/**
 * Web app : My Agenda n'est active que dans UN onglet à la fois (comme WhatsApp Web).
 * Deux onglets modifiant chacun leur copie de la base finiraient par s'écraser mutuellement.
 * Un autre onglet peut reprendre la main : celui-ci enregistre tout puis se met en pause.
 */
const LOCK = 'my-agenda-active-tab';
const CHANNEL = 'my-agenda-tabs';

type Status = 'active' | 'elsewhere';

let release: (() => void) | null = null;
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

function locksAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.locks;
}

function hold(onLost: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    void navigator.locks.request(LOCK, { ifAvailable: true }, (lock) => {
      if (!lock) { resolve(false); return undefined; }
      resolve(true);
      return new Promise<void>((r) => {
        release = r;
        bc?.addEventListener('message', function onMsg(e) {
          if (e.data !== 'takeover') return;
          bc.removeEventListener('message', onMsg);
          void flushDb().catch(() => undefined).finally(() => { release?.(); release = null; onLost(); });
        });
      });
    });
  });
}

let firstClaim: Promise<Status> | null = null;

/** Essaie de devenir l'onglet actif (une seule fois par page). `onLost` : un autre onglet a repris la main. */
export function claimTab(onLost: () => void): Promise<Status> {
  if (!locksAvailable()) return Promise.resolve('active');
  firstClaim ??= hold(onLost).then((ok) => (ok ? 'active' : 'elsewhere'));
  return firstClaim;
}

/** Reprend la main sur l'onglet actif actuel (bouton « Utiliser ici »). */
export async function takeOverTab(onLost: () => void): Promise<void> {
  if (!locksAvailable()) return;
  bc?.postMessage('takeover');
  for (let i = 0; i < 50; i++) {
    if (await hold(onLost)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("L'autre onglet ne répond pas. Ferme-le puis recharge cette page.");
}
