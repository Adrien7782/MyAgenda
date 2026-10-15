import type { Update } from '@tauri-apps/plugin-updater';
import type { AppUpdate, Updater, UpdateProgress } from '../../services/ports';
import { isTauri } from '../platform';

/**
 * Mises à jour via tauri-plugin-updater.
 * L'adresse du fichier latest.json et la clé publique sont dans tauri.conf.json (plugins.updater) ;
 * le plugin refuse tout installeur dont la signature ne correspond pas à cette clé.
 */
export class TauriUpdater implements Updater {
  // En mode développement (`npm run tauri dev`) il n'y a pas d'installation à remplacer.
  readonly supported = isTauri() && !import.meta.env.DEV;
  private pending: Update | null = null;

  async check(): Promise<AppUpdate | null> {
    if (!this.supported) return null;
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check({ timeout: 30_000 });
    this.pending = update;
    if (!update) return null;
    return { version: update.version, currentVersion: update.currentVersion, notes: update.body ?? undefined, date: update.date ?? undefined };
  }

  async install(onProgress?: (p: UpdateProgress) => void): Promise<void> {
    if (!this.pending) throw new Error('Aucune mise à jour à installer : relance la recherche.');
    let downloaded = 0;
    let total: number | undefined;
    await this.pending.downloadAndInstall((event) => {
      if (event.event === 'Started') total = event.data.contentLength ?? undefined;
      if (event.event === 'Progress') downloaded += event.data.chunkLength;
      onProgress?.({ downloaded, total });
    });
    // Sous Windows l'installeur ferme l'application lui-même puis la relance ;
    // ailleurs on redémarre explicitement.
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  }
}

/** Navigateur (mode démo) : pas de mise à jour. */
export class NoopUpdater implements Updater {
  readonly supported = false;
  async check(): Promise<AppUpdate | null> { return null; }
  async install(): Promise<void> { throw new Error('Mise à jour indisponible dans le navigateur.'); }
}

export function createUpdater(): Updater {
  return isTauri() ? new TauriUpdater() : new NoopUpdater();
}
