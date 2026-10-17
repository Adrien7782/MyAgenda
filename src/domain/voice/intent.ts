import type { VoiceDraft } from './guidedParser';
import type { SpokenLanguage, VoiceIntent } from './types';
import { capitalize, trimField } from './normalize';

/** Heure par défaut d'une tâche dont on n'a dit que le jour (« pour vendredi ») : fin de journée. */
export const TASK_DEFAULT_HOUR = 18;

/**
 * Ponctuation dictée : « virgule », « point », « à la ligne »… (et leurs équivalents anglais / espagnols,
 * pour un contenu dicté dans ces langues). Whisper ajoute déjà de lui-même la ponctuation la plus courante.
 */
export function applyDictation(text: string, lang: SpokenLanguage = 'fr'): string {
  // Limites de mot compatibles avec les accents (\b ne connaît pas « à », « é »…).
  // Pas de « lookbehind » : non pris en charge par les anciens Safari / macOS.
  const w = (alts: string) => `(^|[^\\p{L}])(?:${alts})(?![\\p{L}])[.,]?`;
  const re = (alts: string) => new RegExp(`\\s*${w(alts)}`, 'giu');
  const NL = '\\s*,?\\s*';
  const rules: [RegExp, string][] = {
    fr: [
      [new RegExp(`${NL}${w("à la ligne|a la ligne|retour à la ligne|nouvelle ligne|nouveau paragraphe")}\\s*`, 'giu'), '\n'],
      [re("point d'interrogation"), ' ?'],
      [re("point d'exclamation"), ' !'],
      [re('points? de suspension'), '…'],
      [re('deux points'), ' :'],
      [re('virgule'), ','],
      [re('point final'), '.'],
    ] as [RegExp, string][],
    en: [
      [new RegExp(`${NL}${w('new line|new paragraph|next line')}\\s*`, 'giu'), '\n'],
      [re('question mark'), '?'],
      [re('exclamation mark|exclamation point'), '!'],
      [re('comma'), ','],
      [re('full stop'), '.'],
    ] as [RegExp, string][],
    es: [
      [new RegExp(`${NL}${w('nueva línea|nueva linea|punto y aparte|nuevo párrafo')}\\s*`, 'giu'), '\n'],
      [re('signos? de interrogación'), '?'],
      [re('coma'), ','],
      [re('punto final'), '.'],
    ] as [RegExp, string][],
  }[lang];
  let out = text;
  // $1 = caractère qui précédait le mot dicté (conservé).
  for (const [pattern, replacement] of rules) out = out.replace(pattern, (_m, before: string) => `${before.trim() ? before : ''}${replacement}`);
  return out
    .replace(/,\s*,/g, ',')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t,.]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Texte d'un contenu dicté → HTML de note (un paragraphe par ligne). */
export function textToNoteHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => `<p>${esc(capitalize(l))}</p>`).join('');
}

export interface FinalTexts {
  title?: string;
  content?: string;
  location?: string;
}

function localIso(d: Date): string {
  return d.toISOString();
}

/**
 * Fiche finale à partir de la commande analysée et des textes retranscrits.
 * Renvoie une erreur lisible si l'essentiel manque (pas de titre ni de contenu…).
 */
export function draftToIntent(draft: VoiceDraft, texts: FinalTexts): { intent: VoiceIntent } | { error: string } {
  const title = capitalize(trimField(texts.title ?? ''));
  const content = trimField(texts.content ?? '');
  const location = capitalize(trimField(texts.location ?? ''));

  if (draft.kind === 'note') {
    if (!title && !content) return { error: "Je n'ai rien entendu à mettre dans la note. Dis par exemple « titre … contenu … stop »." };
    return { intent: { kind: 'create_note', title, content } };
  }

  if (draft.kind === 'task') {
    const name = title || capitalize(content.split('\n')[0] ?? '');
    if (!name) return { error: "Il manque le titre de la tâche. Dis par exemple « nouvelle tâche, titre appeler le garage, stop »." };
    let deadline: string | undefined;
    if (draft.when) {
      const d = new Date(draft.when.date);
      if (!draft.when.hasTime) d.setHours(TASK_DEFAULT_HOUR, 0, 0, 0);
      deadline = localIso(d);
    }
    const recurrence = draft.repeat && draft.repeat !== 'yearly' ? draft.repeat : undefined;
    return {
      intent: {
        kind: 'create_task', title: name, comment: title ? content || undefined : undefined,
        deadline, priority: draft.priority, recurrence,
      },
    };
  }

  // Évènement
  const name = title || capitalize(content.split('\n')[0] ?? '');
  if (!name) return { error: "Il manque le titre de l'évènement. Dis par exemple « nouvel évènement, titre réunion, demain à 14 h, stop »." };
  if (!draft.when) return { error: `Il manque la date de « ${name} ». Dis par exemple « demain à 14 h » ou « le 25 octobre ».` };
  const allDay = !draft.when.hasTime;
  return {
    intent: {
      kind: 'create_event', title: name, start: localIso(draft.when.date), allDay,
      durationMin: allDay ? 1440 : draft.durationMin ?? 60, location: location || undefined,
      recurrence: draft.repeat,
    },
  };
}

/** Résumé lisible d'une commande en cours (affiché pendant la dictée). */
export function describeDraft(draft: VoiceDraft): string {
  const label = { note: 'Note', task: 'Tâche', event: 'Évènement' }[draft.kind];
  const parts: string[] = [];
  const t = draft.pieces.title?.map((p) => p.text).join(' ');
  if (t) parts.push(`titre « ${trimField(t)} »`);
  const c = draft.pieces.content?.map((p) => p.text).join(' ');
  if (c) parts.push(`${draft.kind === 'note' ? 'contenu' : 'description'} « ${trimField(c).slice(0, 60)}${c.length > 60 ? '…' : ''} »`);
  if (draft.when) parts.push(draft.when.date.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', ...(draft.when.hasTime ? { hour: '2-digit', minute: '2-digit' } : {}) }));
  if (draft.priority) parts.push(`priorité ${{ high: 'haute', medium: 'moyenne', low: 'basse' }[draft.priority]}`);
  if (draft.repeat) parts.push({ daily: 'chaque jour', weekly: 'chaque semaine', monthly: 'chaque mois', yearly: 'chaque année' }[draft.repeat]);
  if (draft.durationMin) parts.push(`${draft.durationMin} min`);
  const loc = draft.pieces.location?.map((p) => p.text).join(' ');
  if (loc) parts.push(`lieu « ${trimField(loc)} »`);
  return parts.length ? `${label} : ${parts.join(' · ')}` : `${label} : dis « titre … », puis « stop »`;
}
