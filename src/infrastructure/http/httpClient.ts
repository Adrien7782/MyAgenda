import type { HttpClient } from '../../services/ports';
import { isTauri } from '../platform';

/**
 * Dans Tauri, les requêtes passent par le plugin HTTP (côté Rust) : pas de blocage CORS,
 * indispensable pour lire les liens .ics des ENT universitaires.
 * Dans un navigateur, on tente un fetch classique (souvent bloqué par CORS).
 */
export class AppHttpClient implements HttpClient {
  async getText(url: string): Promise<string> {
    let res: Response;
    try {
      if (isTauri()) {
        const { fetch } = await import('@tauri-apps/plugin-http');
        res = await fetch(url, { method: 'GET', headers: { Accept: 'text/calendar, text/plain, */*' } });
      } else {
        res = await window.fetch(url);
      }
    } catch (e) {
      const hint = isTauri() ? '' : " : sur la web app, le site de l'emploi du temps bloque souvent la lecture du lien. Importe plutôt le fichier .ics, ou ajoute le lien depuis l'application Windows, Mac ou Android : les cours arrivent ensuite ici par la synchronisation";
      throw new Error(`Impossible de joindre le lien${hint}.${isTauri() && e instanceof Error ? ` ${e.message}` : ''}`);
    }
    if (!res.ok) throw new Error(`Le serveur a répondu ${res.status} ${res.statusText}`.trim());
    return res.text();
  }
}
