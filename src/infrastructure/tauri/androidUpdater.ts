import type { AppUpdate, HttpClient, Updater } from '../../services/ports';
import { isNewerVersion } from '../../domain/shared/version';

interface LatestJson {
  version?: string;
  notes?: string;
  pub_date?: string;
  platforms?: Record<string, { url?: string } | undefined>;
}

/**
 * Android (APK publié sur GitHub) : on lit le même latest.json que Windows et macOS.
 * S'il annonce une version plus récente avec un APK, on propose de le télécharger :
 * le fichier s'ouvre dans le navigateur, puis Android l'installe par-dessus l'ancienne version
 * (même signature ⇒ les données sont conservées).
 */
export class AndroidUpdater implements Updater {
  readonly mode = 'download' as const;
  readonly supported: boolean;
  private apkUrl: string | null = null;

  constructor(private readonly http: HttpClient, private readonly repository?: string) {
    this.supported = !!repository && !import.meta.env.DEV;
  }

  async check(): Promise<AppUpdate | null> {
    if (!this.supported) return null;
    const url = `https://github.com/${this.repository}/releases/latest/download/latest.json`;
    const latest = JSON.parse(await this.http.getText(url)) as LatestJson;
    const apk = latest.platforms?.android?.url;
    if (!latest.version || !apk || !isNewerVersion(latest.version, __APP_VERSION__)) {
      this.apkUrl = null;
      return null;
    }
    this.apkUrl = apk;
    return { version: latest.version, currentVersion: __APP_VERSION__, notes: latest.notes, date: latest.pub_date };
  }

  async install(): Promise<void> {
    if (!this.apkUrl) throw new Error('Aucune mise à jour à télécharger : relance la recherche.');
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(this.apkUrl);
  }
}
