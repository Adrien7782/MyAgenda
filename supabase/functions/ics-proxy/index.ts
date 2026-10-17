// Relais pour importer un emploi du temps par lien iCal depuis la WEB APP.
//
// Pourquoi : dans un navigateur, le site de l'université (ADE, Hyperplanning, Celcat…) refuse
// qu'une autre page lise son lien .ics (règle CORS). L'application installée n'a pas ce problème.
// Ce relais, hébergé dans TON projet Supabase, télécharge le calendrier et le renvoie à la web app.
//
// Sécurité : réservé aux utilisateurs connectés à My Agenda ; seulement des liens http(s) publics ;
// la réponse doit être un vrai calendrier (.ics) de 5 Mo au plus. Rien n'est enregistré.
//
// Installation : voir SETUP_SUPABASE.md, section « Relais des emplois du temps ».

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 20_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function fail(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/** Adresses internes interdites (le relais ne doit servir qu'à joindre des sites publics). */
function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true;
  if (h.includes(':')) return true; // adresse IPv6 écrite en chiffres : jamais utile pour un calendrier
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** Le jeton envoyé est-il celui d'un compte My Agenda connecté ? (demandé au service Auth du projet) */
async function isSignedIn(authorization: string): Promise<boolean> {
  if (!/^Bearer\s+\S+/i.test(authorization)) return false;
  try {
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return typeof user?.id === 'string';
  } catch {
    return false;
  }
}

async function readLimited(res: Response): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) { all.set(c, offset); offset += c.byteLength; }
  return new TextDecoder('utf-8').decode(all);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('Méthode non autorisée.', 405);

  // Uniquement pour un utilisateur connecté (pas seulement la clé publique de l'application).
  if (!(await isSignedIn(req.headers.get('Authorization') ?? ''))) {
    return fail('Connecte-toi à My Agenda pour importer un emploi du temps.', 401);
  }

  let url: URL;
  try {
    const body = await req.json();
    url = new URL(String(body?.url ?? '').trim().replace(/^webcals?:\/\//i, 'https://'));
  } catch {
    return fail('Lien invalide.', 400);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return fail('Le lien doit commencer par https://', 400);
  if (isPrivateHost(url.hostname)) return fail('Cette adresse ne peut pas être utilisée.', 400);

  // Redirections suivies une par une : chaque adresse intermédiaire est vérifiée elle aussi.
  let res: Response | null = null;
  try {
    for (let hop = 0; hop < 5; hop++) {
      res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: 'text/calendar, text/plain, */*', 'User-Agent': 'MyAgenda/1.0 (import de calendrier)' },
      });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get('Location') : null;
      if (!location) break;
      url = new URL(location, url);
      if ((url.protocol !== 'https:' && url.protocol !== 'http:') || isPrivateHost(url.hostname)) return fail('Cette adresse ne peut pas être utilisée.', 400);
      res = null;
    }
  } catch {
    return fail("Le site de l'emploi du temps ne répond pas. Vérifie le lien.", 502);
  }
  if (!res) return fail('Trop de redirections.', 502);
  if (!res.ok) return fail(`Le site de l'emploi du temps a répondu ${res.status} ${res.statusText}`.trim(), 502);

  const text = await readLimited(res);
  if (text === null) return fail('Calendrier trop volumineux (5 Mo maximum).', 413);
  if (!/BEGIN:VCALENDAR/i.test(text.slice(0, 4096))) {
    return fail("Ce lien n'ouvre pas un calendrier .ics : copie le lien d'export iCal (souvent « Exporter » ou « S'abonner »), pas l'adresse de la page.", 422);
  }
  return new Response(text, { headers: { ...CORS, 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' } });
});
