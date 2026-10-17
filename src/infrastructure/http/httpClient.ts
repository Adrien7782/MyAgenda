import type { HttpClient } from '../../services/ports';
import { isTauri } from '../platform';
import { getSupabase, isSupabaseConfigured } from '../supabase/supabaseClient';

/** Nom du relais déployé dans Supabase (supabase/functions/ics-proxy). */
const ICS_RELAY = 'ics-proxy';

const WEB_HINT =
  "Sur la web app, le site de l'emploi du temps refuse souvent d'être lu directement. " +
  "Importe le fichier .ics, ou ajoute le lien depuis l'application Windows, Mac ou Android : les cours arrivent ici par la synchronisation.";

/**
 * Dans Tauri, les requêtes passent par le plugin HTTP (côté Rust) : pas de blocage CORS,
 * indispensable pour lire les liens .ics des ENT universitaires.
 * Dans la web app, le navigateur bloque ces liens (CORS) : on passe par le relais Supabase « ics-proxy ».
 */
export class AppHttpClient implements HttpClient {
  async getText(url: string): Promise<string> {
    if (!isTauri() && isSupabaseConfigured) {
      const viaRelay = await this.viaRelay(url);
      if (viaRelay !== null) return viaRelay;
    }
    let res: Response;
    try {
      if (isTauri()) {
        const { fetch } = await import('@tauri-apps/plugin-http');
        res = await fetch(url, { method: 'GET', headers: { Accept: 'text/calendar, text/plain, */*' } });
      } else {
        res = await window.fetch(url);
      }
    } catch (e) {
      if (!isTauri()) throw new Error(`Impossible de lire ce lien. ${WEB_HINT}`);
      throw new Error(`Impossible de joindre le lien. ${e instanceof Error ? e.message : ''}`.trim());
    }
    if (!res.ok) throw new Error(`Le serveur a répondu ${res.status} ${res.statusText}`.trim());
    return res.text();
  }

  /** Renvoie le calendrier, ou null si le relais n'est pas installé dans Supabase (on tente alors en direct). */
  private async viaRelay(url: string): Promise<string | null> {
    let data: unknown;
    let error: unknown;
    try {
      ({ data, error } = await getSupabase().functions.invoke(ICS_RELAY, { body: { url } }));
    } catch {
      return null;
    }
    if (!error) return typeof data === 'string' ? data : String(data ?? '');
    const context = (error as { context?: Response }).context;
    if (!(context instanceof Response) || context.status === 404) return null; // relais absent ou injoignable
    let message = '';
    try { message = ((await context.json()) as { error?: string }).error ?? ''; } catch { /* pas de détail */ }
    throw new Error(message || `Le relais des emplois du temps a répondu ${context.status}.`);
  }
}
