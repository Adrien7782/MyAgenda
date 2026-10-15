import type { AuthGateway, AuthUser } from '../../services/ports';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

const SMTP_HINT =
  "Supabase n'a pas réussi à envoyer l'email. Vérifie Authentication → Emails → SMTP Settings " +
  "(hôte smtp-relay.brevo.com, port 587, identifiant …@smtp-brevo.com, clé SMTP complète, expéditeur validé chez Brevo) " +
  'et que le blocage des adresses IP est désactivé chez Brevo. Détail exact : Supabase → Logs → Auth.';

/** Messages d'erreur Supabase traduits pour l'utilisateur (avec le code HTTP pour le diagnostic). */
function translate(e: unknown): Error {
  const err = (typeof e === 'object' && e ? e : {}) as { message?: unknown; status?: number; code?: string; name?: string };
  const raw = e instanceof Error ? e.message : typeof err.message === 'string' ? err.message : String(e);
  // supabase-js renvoie "{}" quand le serveur répond sans corps (502/503/504, délai dépassé…)
  const msg = raw && raw !== '{}' && raw !== '[object Object]' ? raw : '';
  const m = msg.toLowerCase();
  const status = typeof err.status === 'number' ? err.status : undefined;
  const code = typeof err.code === 'string' ? err.code : '';
  const suffix = status ? ` (code ${status}${code ? ` · ${code}` : ''})` : '';
  console.error('[Auth]', { name: err.name, status, code, message: raw, error: e });

  if (m.includes('invalid login credentials')) return new Error('Email ou mot de passe incorrect.');
  if (m.includes('email not confirmed') || code === 'email_not_confirmed') return Object.assign(new Error('Adresse email pas encore vérifiée.'), { code: 'email_not_confirmed' });
  if (m.includes('already registered') || m.includes('already been registered') || code === 'user_already_exists') return new Error('Un compte existe déjà avec cette adresse.');
  if (m.includes('expired') || (m.includes('invalid') && m.includes('token')) || code === 'otp_expired') return new Error('Code invalide ou expiré. Demande un nouveau code.');
  if (m.includes('rate limit') || m.includes('security purposes') || status === 429) return new Error(`Trop de tentatives : patiente quelques minutes avant de réessayer${suffix}.`);
  if (m.includes('password') && (m.includes('at least') || m.includes('characters') || m.includes('weak'))) return new Error('Mot de passe trop faible (8 caractères minimum).');
  if (m.includes('not authorized') && m.includes('email')) return new Error("Cette adresse ne peut pas recevoir d'email : configure un serveur SMTP dans Supabase (voir SETUP_SUPABASE.md).");
  if (m.includes('sending') && m.includes('email')) return new Error(`${SMTP_HINT}${suffix}`);
  if (m.includes('signups not allowed') || code === 'signup_disabled') return new Error("Les inscriptions sont désactivées dans Supabase (Authentication → Sign In / Providers → Allow new users to sign up).");
  if (m.includes('invalid api key') || status === 401) return new Error(`Clé Supabase refusée : vérifie VITE_SUPABASE_ANON_KEY dans le fichier .env${suffix}.`);
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) {
    return new Error('Serveur injoignable : vérifie ta connexion internet et VITE_SUPABASE_URL dans le fichier .env (sans /rest/v1).');
  }
  if (!msg) {
    if (status && status >= 500) return new Error(`Le serveur n'a pas pu terminer l'opération. ${SMTP_HINT}${suffix}`);
    if (status === 404) return new Error(`Adresse Supabase incorrecte : VITE_SUPABASE_URL doit être https://xxxx.supabase.co (sans /rest/v1)${suffix}.`);
    return new Error(`Erreur inconnue du serveur${suffix || ' (aucun détail renvoyé)'}. Détail : Supabase → Logs → Auth.`);
  }
  return new Error(`${msg}${suffix}`);
}

function toUser(u: { id: string; email?: string | null } | null | undefined): AuthUser | null {
  return u ? { id: u.id, email: u.email ?? '' } : null;
}

async function run<R extends { data: unknown; error: unknown }>(fn: () => Promise<R>): Promise<R['data']> {
  let res: R;
  try {
    res = await fn();
  } catch (e) {
    throw translate(e);
  }
  if (res.error) throw translate(res.error);
  return res.data;
}

export class SupabaseAuthGateway implements AuthGateway {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  }

  async currentUser(): Promise<AuthUser | null> {
    if (!isSupabaseConfigured) return null;
    // getSession lit la session mémorisée : pas besoin de réseau.
    const { data } = await getSupabase().auth.getSession();
    return toUser(data.session?.user);
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const data = await run(() => getSupabase().auth.signInWithPassword({ email, password }));
    return this.required(data.user);
  }

  async signUp(email: string, password: string) {
    const data = await run(() => getSupabase().auth.signUp({ email, password }));
    // Sans session → la confirmation par email est activée : il faut saisir le code reçu.
    return { needsVerification: !data.session, user: toUser(data.user) };
  }

  async verifySignupCode(email: string, code: string): Promise<AuthUser> {
    const data = await run(() => getSupabase().auth.verifyOtp({ email, token: code.trim(), type: 'email' }));
    return this.required(data.user);
  }

  async resendSignupCode(email: string): Promise<void> {
    await run(() => getSupabase().auth.resend({ type: 'signup', email }));
  }

  async sendPasswordResetCode(email: string): Promise<void> {
    await run(() => getSupabase().auth.resetPasswordForEmail(email));
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<AuthUser> {
    const data = await run(() => getSupabase().auth.verifyOtp({ email, token: code.trim(), type: 'recovery' }));
    await run(() => getSupabase().auth.updateUser({ password: newPassword }));
    return this.required(data.user);
  }

  private required(u: { id: string; email?: string | null } | null | undefined): AuthUser {
    const user = toUser(u);
    if (!user) throw new Error('Réponse inattendue du serveur (utilisateur absent).');
    return user;
  }

  async signOut(): Promise<void> {
    // scope 'local' : déconnecte cet appareil seulement, et fonctionne hors ligne.
    await getSupabase().auth.signOut({ scope: 'local' }).catch(() => undefined);
  }
}
