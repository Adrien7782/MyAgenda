import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase unique de l'application.
 * L'URL et la clé "anon" viennent du fichier `.env` (jamais publié sur GitHub, voir `.env.example`).
 * La clé anon est publique par conception : la sécurité repose sur les règles RLS côté serveur.
 * La session est mémorisée localement → l'app redémarre connectée, même hors ligne.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = !!url && !!anonKey && !url.includes('xxxx');

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré : copie .env.example en .env et renseigne l’URL et la clé.');
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'my-agenda-auth' },
    });
  }
  return client;
}
