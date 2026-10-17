import type { AppUpdate, Updater } from '../../services/ports';
import { isNewerVersion } from '../../domain/shared/version';

/**
 * Web app (GitHub Pages) : l'application est gardée par un service worker pour s'ouvrir
 * instantanément et hors ligne. Pour qu'elle soit TOUJOURS à jour à l'ouverture :
 * 1. au lancement (et au retour sur l'app après un long moment), on lit version.json sur le serveur ;
 * 2. si une version plus récente est en ligne, un écran « Mise à jour… » s'affiche le temps que le
 *    service worker récupère la nouvelle version, puis la page se recharge dessus ;
 * 3. pendant l'utilisation, une nouvelle version déclenche le bandeau habituel (« Voir et installer »).
 */

const VERSION_URL = `${import.meta.env.BASE_URL}version.json`;
/** Revenir sur l'app après ce délai en arrière-plan compte comme un nouveau lancement. */
const RESUME_AS_LAUNCH_MS = 10 * 60_000;
const SW_WAIT_MS = 20_000;
const ATTEMPT_KEY = 'my-agenda:web-update-attempt';

let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
let registration: ServiceWorkerRegistration | undefined;
let needRefresh = false;
const needRefreshWaiters = new Set<() => void>();

export const pwaSupported = __WEB_BUILD__ && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

interface VersionFile { version?: string; notes?: string; pub_date?: string }

async function fetchOnlineVersion(timeoutMs = 4000): Promise<VersionFile | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store', signal: ctrl.signal });
    return res.ok ? ((await res.json()) as VersionFile) : null;
  } catch {
    return null; // hors ligne : on garde la version en cache
  } finally {
    clearTimeout(t);
  }
}

function waitForNewWorker(ms: number): Promise<boolean> {
  if (needRefresh) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = () => { clearTimeout(t); needRefreshWaiters.delete(done); resolve(true); };
    const t = setTimeout(() => { needRefreshWaiters.delete(done); resolve(false); }, ms);
    needRefreshWaiters.add(done);
    void registration?.update().catch(() => undefined);
  });
}

/** Passe sur la nouvelle version : active le nouveau service worker et recharge la page. */
async function applyUpdate(version: string): Promise<void> {
  // Garde-fou : une seule tentative automatique par version et par session (jamais de boucle de rechargement).
  try { sessionStorage.setItem(ATTEMPT_KEY, version); } catch { /* stockage indisponible */ }
  if (pwaSupported && (await waitForNewWorker(SW_WAIT_MS)) && updateSW) {
    await updateSW(true);
    return;
  }
  window.location.reload();
}

function alreadyTried(version: string): boolean {
  try { return sessionStorage.getItem(ATTEMPT_KEY) === version; } catch { return false; }
}

function showUpdatingScreen(version: string): void {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:var(--bg,#030b18);color:var(--text-muted,#9aa7bd);font:500 14px system-ui,sans-serif;text-align:center;padding:24px';
  el.innerHTML = `<div style="font-size:16px;color:var(--text,#e8eefc);font-weight:600">Mise à jour de My Agenda…</div><div>Version ${version.replace(/[^\d.]/g, '')}</div>`;
  document.body.appendChild(el);
}

/** Vérifie la version en ligne ; si elle est plus récente, l'installe tout de suite (écran de mise à jour). */
async function updateNowIfNewer(): Promise<boolean> {
  const online = await fetchOnlineVersion();
  if (!online?.version || !isNewerVersion(online.version, __APP_VERSION__) || alreadyTried(online.version)) return false;
  showUpdatingScreen(online.version);
  await applyUpdate(online.version);
  return true;
}

/**
 * À appeler au démarrage, avant d'afficher l'application.
 * Renvoie true si une mise à jour est en cours (la page va se recharger).
 */
export async function startPwa(): Promise<boolean> {
  if (!__WEB_BUILD__) return false;
  if (pwaSupported) {
    const { registerSW } = await import('virtual:pwa-register');
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        needRefresh = true;
        needRefreshWaiters.forEach((w) => w());
      },
      onRegisteredSW(_url, reg) { registration = reg; },
    });
  }

  // Retour sur l'app (iPhone : l'app reste en mémoire) après un long moment = nouveau lancement.
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > RESUME_AS_LAUNCH_MS) void updateNowIfNewer();
    hiddenAt = 0;
  });

  return updateNowIfNewer();
}

/** Mises à jour de la web app (Réglages → Mises à jour, bandeau). */
export class WebUpdater implements Updater {
  readonly mode = 'web' as const;
  readonly supported = __WEB_BUILD__;
  private found: string | null = null;

  async check(): Promise<AppUpdate | null> {
    if (!this.supported) return null;
    const online = await fetchOnlineVersion(15_000);
    if (!online) throw new Error('network: version.json injoignable');
    if (!online.version || !isNewerVersion(online.version, __APP_VERSION__)) {
      this.found = null;
      return null;
    }
    this.found = online.version;
    void registration?.update().catch(() => undefined); // le service worker commence à télécharger
    return { version: online.version, currentVersion: __APP_VERSION__, notes: online.notes, date: online.pub_date };
  }

  async install(): Promise<void> {
    const version = this.found ?? __APP_VERSION__;
    showUpdatingScreen(version);
    try { sessionStorage.removeItem(ATTEMPT_KEY); } catch { /* ignore */ }
    await applyUpdate(version);
  }
}

// ── Installation (Chrome, Edge, Android) ─────────────────────────────────────

interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let installEvent: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();
if (__WEB_BUILD__ && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e as InstallPromptEvent;
    installListeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => { installEvent = null; installListeners.forEach((l) => l()); });
}

export function canPromptInstall(): boolean {
  return installEvent !== null;
}

export function onInstallAvailabilityChange(cb: () => void): () => void {
  installListeners.add(cb);
  return () => installListeners.delete(cb);
}

export async function promptInstall(): Promise<boolean> {
  if (!installEvent) return false;
  const ev = installEvent;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  if (outcome === 'accepted') installEvent = null;
  return outcome === 'accepted';
}
