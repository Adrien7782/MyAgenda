/**
 * Analyseur des phrases guidées (en français, sans IA).
 *
 * Il lit les phrases transcrites une par une (une même commande peut être dite en plusieurs fois)
 * et repère des mots-clés connus d'avance :
 *   « [My Agenda,] crée(-moi) une note / une tâche / un évènement »  → début de commande
 *   « titre », « contenu » / « description », « lieu »                → champs de texte libre
 *   « pour demain 14 h », « échéance … », « priorité haute »,
 *   « toutes les semaines », « durée 1 heure »                        → champs structurés
 *   « stop », « terminé », « c'est tout »                             → fin de la commande
 *   « annule », « éteins-toi », « aide »                              → ordres
 *
 * Les champs de texte libre gardent la position de leur son (début / fin) : l'application les fait
 * retranscrire dans leur vraie langue (français, anglais ou espagnol) avant de créer l'élément.
 */
import { splitWords } from './normalize';
import { parseDuration, parseFrenchWhen, type SpokenWhen } from './frenchDates';
import type { CommandKind, FieldName, FieldPiece, Utterance, VoiceIntent } from './types';

type Priority = 'high' | 'medium' | 'low';
type Repeat = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** Commande en cours de dictée. */
export interface VoiceDraft {
  kind: CommandKind;
  /** Champs de texte libre, éventuellement dits en plusieurs morceaux. */
  pieces: Partial<Record<'title' | 'content' | 'location', FieldPiece[]>>;
  when?: SpokenWhen;
  priority?: Priority;
  repeat?: Repeat;
  durationMin?: number;
  /** Champ en cours de remplissage. */
  current: FieldName;
}

export type ParseEvent =
  | { type: 'started'; kind: CommandKind }
  | { type: 'updated'; draft: VoiceDraft }
  | { type: 'complete'; draft: VoiceDraft }
  | { type: 'intent'; intent: Extract<VoiceIntent, { kind: 'turn_off' | 'cancel' | 'help' }> }
  | { type: 'unrecognized'; text: string };

// ── Vocabulaire ──────────────────────────────────────────────────────────────

const VERBS = new Set(['cree', 'creer', 'crees', 'creez', 'creee', 'creer', 'ajoute', 'ajouter', 'ajoutes', 'ajoutez', 'fais', 'faire', 'prends', 'prendre', 'ecris', 'note', 'mets', 'programme', 'planifie', 'nouvelle', 'nouveau', 'nouvel']);
const FILLERS = new Set(['moi', 'une', 'un', 'nouvelle', 'nouveau', 'nouvel', 'la', 'le', 'me', 'nous', 'stp', 'svp', 'peux', 'tu', 'je', 'veux', 'voudrais', 'aimerais', 'il', 'te', 'plait', 'vous', 'pourrais']);
const OBJECTS: Record<string, CommandKind> = {
  note: 'note', notes: 'note', memo: 'note',
  tache: 'task', taches: 'task', rappel: 'task', todo: 'task',
  evenement: 'event', evenements: 'event', evennement: 'event', rdv: 'event', rendezvous: 'event', 'rendez-vous': 'event',
};
const FIELD_WORDS: Record<string, FieldName> = {
  titre: 'title', titres: 'title', intitule: 'title', title: 'title', titulo: 'title',
  contenu: 'content', contenus: 'content', content: 'content', contenido: 'content', texte: 'content',
  description: 'content', details: 'content', detail: 'content', commentaire: 'content', notes: 'content',
  lieu: 'location', endroit: 'location', adresse: 'location',
  echeance: 'when', date: 'when', quand: 'when',
  priorite: 'priority',
  duree: 'duration',
  repetition: 'repeat', recurrence: 'repeat',
};
const WAKE_FIRST = new Set(['my', 'mon', 'mai', 'maille', 'mail', 'mi', 'ma', 'mae']);
const PRIORITY_WORDS: Record<string, Priority> = {
  haute: 'high', haut: 'high', elevee: 'high', urgente: 'high', urgent: 'high', importante: 'high', forte: 'high', maximale: 'high',
  moyenne: 'medium', normale: 'medium', normal: 'medium', moyen: 'medium',
  basse: 'low', bas: 'low', faible: 'low', minimale: 'low',
};

/** Ordres dits seuls (phrase courte) : « éteins-toi », « annule », « aide ». */
function shortOrder(t: string[]): 'turn_off' | 'cancel' | 'help' | null {
  if (t.length === 0 || t.length > 6) return null;
  const s = ` ${t.join(' ')} `;
  if (/ (eteins|eteint|eteindre|eteignez|desactive|desactiver|desactivez) /.test(s)) return 'turn_off';
  if (/ (arrete|arretes|arreter|coupe|couper|ferme|fermer) (toi|l ecoute|ecoute|d ecouter|ecouter|le micro|micro) /.test(s)) return 'turn_off';
  if (/ (stop|fin de l) ecoute /.test(s) || / au revoir /.test(s) || / bonne nuit /.test(s)) return 'turn_off';
  if (/ (annule|annuler|annulez|annules|laisse tomber|oublie ca|oublie) /.test(s)) return 'cancel';
  if (/ (aide|aider|aide moi) /.test(s) || / que (je )?peux je dire /.test(s) || / comment ca marche /.test(s)) return 'help';
  return null;
}

const END_SINGLE = new Set(['stop', 'stoppe', 'stopper', 'termine', 'terminee', 'terminer', 'fini', 'finie', 'valide', 'valider', 'validez', 'enregistre', 'enregistrer', 'enregistrez']);

// ── Mots repérés dans une phrase ─────────────────────────────────────────────

interface Tok { n: string; word: number }

function tokenize(u: Utterance): Tok[] {
  const out: Tok[] = [];
  u.words.forEach((w, word) => { for (const n of splitWords(w.text)) out.push({ n, word }); });
  return out;
}

/** Fin de commande à la position i : « stop », « c'est tout », « fin de la note »… Renvoie le nombre de mots. */
function endAt(t: string[], i: number): number {
  if (END_SINGLE.has(t[i])) return 1;
  if (t[i] === 'c' && t[i + 1] === 'est' && t[i + 2] === 'tout') return 3;
  if (t[i] === 'cest' && t[i + 1] === 'tout') return 2;
  if (t[i] === 'fin' && (t[i + 1] === 'de' || t[i + 1] === 'du') ) return 2 + (['la', 'l'].includes(t[i + 2]) ? 2 : 1);
  return 0;
}

/** Début de commande : verbe (ou « nouvelle ») suivi, à 4 mots près, d'un objet (note, tâche, évènement). */
function commandAt(t: string[], i: number): { kind: CommandKind; consumed: number } | null {
  if (!VERBS.has(t[i])) return null;
  for (let j = i + 1; j <= i + 5 && j < t.length; j++) {
    const joined = t[j] === 'rendez' && t[j + 1] === 'vous' ? 'rendez-vous' : t[j];
    if (joined in OBJECTS) return { kind: OBJECTS[joined], consumed: j - i + (joined === 'rendez-vous' ? 2 : 1) };
    if (!FILLERS.has(t[j]) && !VERBS.has(t[j])) return null;
  }
  return null;
}

/** « My Agenda » (et ses transcriptions approximatives) à la position i. */
function wakeAt(t: string[], i: number): number {
  if (t[i] === 'myagenda') return 1;
  if (WAKE_FIRST.has(t[i]) && /^agendas?$/.test(t[i + 1] ?? '')) return 2;
  return 0;
}

/** « priorité haute » / « urgent ». */
function priorityAt(t: string[], i: number): { value: Priority; consumed: number } | null {
  if (t[i] === 'priorite') {
    const k = t[i + 1] === 'est' || t[i + 1] === 'a' ? i + 2 : i + 1;
    if (t[k] && t[k] in PRIORITY_WORDS) return { value: PRIORITY_WORDS[t[k]], consumed: k - i + 1 };
  }
  if ((t[i] === 'tres' && t[i + 1] === 'urgent') || (t[i] === 'c' && t[i + 1] === 'est' && t[i + 2] === 'urgent')) return { value: 'high', consumed: t[i] === 'tres' ? 2 : 3 };
  return null;
}

/** « tous les jours », « chaque semaine », « toutes les semaines », « chaque mois », « tous les ans », « chaque lundi ». */
function repeatAt(t: string[], i: number): { value: Repeat; consumed: number } | null {
  let k = i;
  if (t[k] === 'repetition' || t[k] === 'recurrence') k++;
  if (t[k] === 'chaque') {
    const unit = t[k + 1];
    if (unit === 'jour') return { value: 'daily', consumed: k - i + 2 };
    if (unit === 'semaine' || ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].includes(unit)) return { value: 'weekly', consumed: k - i + 2 };
    if (unit === 'mois') return { value: 'monthly', consumed: k - i + 2 };
    if (unit === 'annee' || unit === 'an') return { value: 'yearly', consumed: k - i + 2 };
  }
  if ((t[k] === 'tous' || t[k] === 'toutes') && t[k + 1] === 'les') {
    const unit = t[k + 2];
    if (unit === 'jours') return { value: 'daily', consumed: k - i + 3 };
    if (unit === 'semaines' || ['lundis', 'mardis', 'mercredis', 'jeudis', 'vendredis', 'samedis', 'dimanches'].includes(unit)) return { value: 'weekly', consumed: k - i + 3 };
    if (unit === 'mois') return { value: 'monthly', consumed: k - i + 3 };
    if (unit === 'ans' || unit === 'annees') return { value: 'yearly', consumed: k - i + 3 };
  }
  if (['quotidien', 'quotidienne', 'quotidiennement'].includes(t[k])) return { value: 'daily', consumed: k - i + 1 };
  if (['hebdo', 'hebdomadaire', 'hebdomadairement'].includes(t[k])) return { value: 'weekly', consumed: k - i + 1 };
  if (['mensuel', 'mensuelle', 'mensuellement'].includes(t[k])) return { value: 'monthly', consumed: k - i + 1 };
  if (['annuel', 'annuelle', 'annuellement'].includes(t[k])) return { value: 'yearly', consumed: k - i + 1 };
  return null;
}

/** Une date peut commencer ici (pour la repérer à la fin d'un titre : « appeler le garage pour demain 10 h »). */
const WHEN_STARTERS = new Set(['pour', 'demain', 'apres', "aujourd'hui", 'aujourdhui', 'ce', 'cet', 'cette', 'le', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'dans', 'a', 'vers', 'echeance']);

// ── Analyseur ────────────────────────────────────────────────────────────────

export class GuidedParser {
  private draft: VoiceDraft | null = null;

  constructor(private readonly now: () => Date = () => new Date()) {}

  current(): VoiceDraft | null {
    return this.draft;
  }

  reset(): void {
    this.draft = null;
  }

  /** Long silence après une commande commencée : on la termine si elle contient quelque chose. */
  pause(): ParseEvent[] {
    if (!this.draft) return [];
    return this.finish();
  }

  feed(u: Utterance): ParseEvent[] {
    const toks = tokenize(u);
    const t = toks.map((x) => x.n);
    const events: ParseEvent[] = [];

    // Ordres courts, valables à tout moment.
    const order = shortOrder(t.slice(wakeAt(t, 0)));
    if (order) {
      if (order === 'cancel' && this.draft) this.draft = null;
      return [{ type: 'intent', intent: { kind: order } }];
    }

    let i = 0;
    // Début de mot du texte libre courant, en attente d'être fermé.
    let freeStart: number | null = null;
    const closeFree = (endTok: number) => {
      if (freeStart === null || !this.draft) return;
      const field = this.draft.current;
      if ((field === 'title' || field === 'content' || field === 'location') && endTok > freeStart) {
        this.addPiece(field, u, toks, freeStart, endTok);
      }
      freeStart = null;
    };

    while (i < t.length) {
      const wake = wakeAt(t, i);
      // Nouvelle commande : en début de phrase, après « My Agenda », ou s'il n'y a pas de commande en cours.
      const canStart = !this.draft || i <= 1 || wake > 0 || (i >= 1 && wakeAt(t, i - 2) > 0);
      const cmd = canStart ? commandAt(t, i + wake) : null;
      if (cmd) {
        closeFree(i);
        if (this.draft) events.push(...this.finish());
        this.draft = { kind: cmd.kind, pieces: {}, current: 'title' };
        events.push({ type: 'started', kind: cmd.kind });
        i += wake + cmd.consumed;
        freeStart = i;
        continue;
      }
      if (wake && !this.draft) { i += wake; continue; }
      if (!this.draft) { i++; continue; }

      const end = endAt(t, i);
      if (end) {
        closeFree(i);
        events.push(...this.finish());
        i += end;
        continue;
      }

      const field = FIELD_WORDS[t[i]];
      const inContent = this.draft.current === 'content';
      // Mot-clé de champ (sauf le même champ répété, et « notes » qui est du texte dans un contenu).
      if (field && !(inContent && field === 'content') && !(t[i] === 'notes' && this.draft.kind === 'note')) {
        closeFree(i);
        i++;
        if (t[i] === 'est' || t[i] === 'c') i++; // « le titre est … »
        if (field === 'priority') {
          const p = PRIORITY_WORDS[t[i]];
          if (p) { this.draft.priority = p; i++; }
          continue;
        }
        if (field === 'when') {
          const w = parseFrenchWhen(t, i, this.now());
          if (w) { this.draft.when = w; i += w.consumed; }
          continue;
        }
        if (field === 'duration') {
          const d = parseDuration(t, i);
          if (d) { this.draft.durationMin = d.minutes; i += d.consumed; }
          continue;
        }
        if (field === 'repeat') {
          const r = repeatAt(t, i - 1);
          if (r) { this.draft.repeat = r.value; i += r.consumed - 1; }
          continue;
        }
        this.draft.current = field;
        freeStart = i;
        continue;
      }

      // Hors contenu : priorité, répétition et date dites sans mot-clé de champ (« pour demain », « tous les lundis »).
      if (!inContent && this.draft.kind !== 'note') {
        const p = priorityAt(t, i);
        if (p) { closeFree(i); this.draft.priority = p.value; i += p.consumed; freeStart = this.reopen(); continue; }
        const r = repeatAt(t, i);
        if (r) { closeFree(i); this.draft.repeat = r.value; i += r.consumed; freeStart = this.reopen(); continue; }
        const d = this.draft.kind === 'event' && t[i] === 'pendant' ? parseDuration(t, i + 1) : null;
        if (d) { closeFree(i); this.draft.durationMin = d.minutes; i += d.consumed + 1; freeStart = this.reopen(); continue; }
        if (WHEN_STARTERS.has(t[i]) && (freeStart === null || i > freeStart)) {
          const w = parseFrenchWhen(t, i, this.now());
          // Une date en fin de titre doit aller jusqu'au bout du morceau (ou jusqu'au mot-clé suivant).
          if (w && this.wholeTail(t, i + w.consumed)) {
            closeFree(i);
            this.draft.when = w;
            i += w.consumed;
            freeStart = this.reopen();
            continue;
          }
        }
      }

      if (freeStart === null && (this.draft.current === 'title' || this.draft.current === 'content' || this.draft.current === 'location')) freeStart = i;
      i++;
    }
    closeFree(t.length);

    if (this.draft && !events.some((e) => e.type === 'complete' && e.draft === this.draft)) {
      events.push({ type: 'updated', draft: this.draft });
    } else if (!this.draft && events.length === 0) {
      events.push({ type: 'unrecognized', text: u.text });
    }
    return events;
  }

  /** Après un élément structuré dit sans mot-clé, le texte libre reprend dans le même champ. */
  private reopen(): number | null {
    return null;
  }

  /** Le reste de la phrase (après une date) ne contient plus de texte libre : fin, mot-clé, priorité… */
  private wholeTail(t: string[], k: number): boolean {
    let j = k;
    while (j < t.length) {
      if (endAt(t, j) || FIELD_WORDS[t[j]] || priorityAt(t, j) || repeatAt(t, j)) return true;
      if (['et', 'avec'].includes(t[j])) { j++; continue; }
      return false;
    }
    return true;
  }

  private addPiece(field: 'title' | 'content' | 'location', u: Utterance, toks: Tok[], from: number, to: number) {
    const firstWord = toks[from].word;
    const lastWord = toks[to - 1].word;
    const words = u.words.slice(firstWord, lastWord + 1);
    const text = words.map((w) => w.text).join(' ').replace(/\s+/g, ' ').trim();
    if (!text.replace(/[\s.,:;!?-]/g, '')) return;
    const piece: FieldPiece = { utteranceId: u.id, start: words[0].start, end: words[words.length - 1].end, text };
    (this.draft!.pieces[field] ??= []).push(piece);
  }

  private finish(): ParseEvent[] {
    const draft = this.draft;
    this.draft = null;
    if (!draft) return [];
    return [{ type: 'complete', draft }];
  }
}
