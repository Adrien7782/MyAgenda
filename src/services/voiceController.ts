import { GuidedParser, type ParseEvent, type VoiceDraft } from '../domain/voice/guidedParser';
import { applyDictation, describeDraft, draftToIntent, type FinalTexts } from '../domain/voice/intent';
import type { SpokenLanguage, Utterance, VoiceIntent } from '../domain/voice/types';
import type { VoiceEngine, VoiceEngineEvent } from './ports';

/** Élément créé à la voix (affiché sur une carte avec « Annuler » / « Ouvrir »). */
export interface VoiceResult {
  kind: 'note' | 'task' | 'event';
  id: string;
  title: string;
  /** Détails lisibles : échéance, priorité, langue du contenu… */
  detail: string;
  at: number;
  undone?: boolean;
}

export type VoicePhase = 'off' | 'loading' | 'listening' | 'hearing' | 'processing';

export interface VoiceUiState {
  phase: VoicePhase;
  level: number;
  /** Dernière phrase entendue (1re passe). */
  heard: string | null;
  /** Commande en cours de dictée, en clair. */
  draft: string | null;
  message: { tone: 'info' | 'error' | 'help'; text: string } | null;
  /** Le modèle de reconnaissance n'est pas encore téléchargé. */
  needsModel: boolean;
  results: VoiceResult[];
}

export const VOICE_HELP = [
  '« My Agenda, crée-moi une note. Titre : idées cadeaux. Contenu : un livre pour Léa. Stop. »',
  '« Nouvelle tâche, titre appeler le garage, pour demain 10 h, priorité haute, stop. »',
  '« Nouvel évènement, titre réunion, le 25 octobre à 14 h, durée 1 heure, lieu salle B, stop. »',
  '« Annule » (commande en cours ou dernier élément créé) · « Éteins-toi » (couper le micro).',
];

const UNDO_WINDOW_MS = 2 * 60_000;

export interface VoiceControllerDeps {
  engine: VoiceEngine;
  now?: () => Date;
  modelId: () => string;
  /** Crée l'élément décrit par la fiche ; renvoie de quoi l'afficher et l'annuler. */
  execute: (intent: Exclude<VoiceIntent, { kind: 'turn_off' | 'cancel' | 'help' }>) => Promise<Omit<VoiceResult, 'at' | 'detail'>>;
  undo: (result: VoiceResult) => Promise<void>;
  onChange: (state: VoiceUiState) => void;
}

/**
 * Chef d'orchestre de la commande vocale : reçoit les évènements du moteur (phrases transcrites,
 * silences…), les passe à l'analyseur, fait retranscrire les champs libres dans leur langue,
 * puis crée la note / tâche / évènement.
 */
export function createVoiceController(deps: VoiceControllerDeps) {
  const now = deps.now ?? (() => new Date());
  const parser = new GuidedParser(now);
  let state: VoiceUiState = { phase: 'off', level: 0, heard: null, draft: null, message: null, needsModel: false, results: [] };
  // Les phrases sont traitées une par une, dans l'ordre (la 2e passe prend un peu de temps).
  let queue: Promise<void> = Promise.resolve();

  const set = (patch: Partial<VoiceUiState>) => {
    state = { ...state, ...patch };
    deps.onChange(state);
  };
  const say = (tone: 'info' | 'error' | 'help', text: string) => set({ message: { tone, text } });

  async function finalText(draft: VoiceDraft, field: 'title' | 'content' | 'location'): Promise<{ text: string; lang: SpokenLanguage } | undefined> {
    const pieces = draft.pieces[field];
    if (!pieces?.length) return undefined;
    const parts: string[] = [];
    let lang: SpokenLanguage = 'fr';
    for (const piece of pieces) {
      let text = piece.text;
      try {
        const r = await deps.engine.transcribeRange(piece.utteranceId, piece.start, piece.end);
        // Français : la 1re passe (même langue, phrase entière) est la plus fiable.
        if ((r.lang === 'en' || r.lang === 'es') && r.text.trim()) {
          text = r.text;
          lang = r.lang;
        }
      } catch {
        // Phrase expirée / moteur arrêté : on garde la 1re passe.
      }
      parts.push(applyDictation(text, lang));
    }
    return { text: parts.join(' ').replace(/\s+([,.])/g, '$1'), lang };
  }

  function detailOf(intent: VoiceIntent, langs: SpokenLanguage[]): string {
    const bits: string[] = [];
    const date = (iso: string, withTime: boolean) => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
    if (intent.kind === 'create_task') {
      if (intent.deadline) bits.push(`échéance ${date(intent.deadline, true)}`);
      if (intent.priority) bits.push(`priorité ${{ high: 'haute', medium: 'moyenne', low: 'basse' }[intent.priority]}`);
      if (intent.recurrence) bits.push({ daily: 'chaque jour', weekly: 'chaque semaine', monthly: 'chaque mois' }[intent.recurrence]);
    }
    if (intent.kind === 'create_event' && intent.start) {
      bits.push(intent.allDay ? date(intent.start, false) : date(intent.start, true));
      if (intent.location) bits.push(intent.location);
    }
    if (intent.kind === 'create_note' && intent.content) bits.push(`${intent.content.length} caractères`);
    const foreign = langs.filter((l) => l !== 'fr');
    if (foreign.length) bits.push(`dicté en ${foreign.includes('en') ? 'anglais' : 'espagnol'}`);
    return bits.join(' · ');
  }

  async function finalize(draft: VoiceDraft) {
    set({ phase: state.phase === 'off' ? 'off' : 'processing', draft: describeDraft(draft) });
    const texts: FinalTexts = {};
    const langs: SpokenLanguage[] = [];
    for (const field of ['title', 'content', 'location'] as const) {
      const r = await finalText(draft, field);
      if (r) { texts[field] = r.text; langs.push(r.lang); }
    }
    const built = draftToIntent(draft, texts);
    set({ draft: null });
    if ('error' in built) { say('error', built.error); return; }
    const intent = built.intent as Exclude<VoiceIntent, { kind: 'turn_off' | 'cancel' | 'help' }>;
    try {
      const created = await deps.execute(intent);
      const result: VoiceResult = { ...created, at: now().getTime(), detail: detailOf(intent, langs) };
      set({ results: [result, ...state.results].slice(0, 5), message: null });
    } catch (e) {
      say('error', `Création impossible : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function undoLast(): Promise<boolean> {
    const last = state.results.find((r) => !r.undone && now().getTime() - r.at < UNDO_WINDOW_MS);
    if (!last) return false;
    await undo(last);
    return true;
  }

  async function undo(result: VoiceResult) {
    await deps.undo(result);
    set({
      results: state.results.map((r) => (r === result ? { ...r, undone: true } : r)),
      message: { tone: 'info', text: `« ${result.title} » supprimé.` },
    });
  }

  async function handleParse(events: ParseEvent[], heard?: string) {
    for (const ev of events) {
      if (ev.type === 'started' || ev.type === 'updated') {
        const d = parser.current();
        set({ draft: d ? describeDraft(d) : null, message: null });
      } else if (ev.type === 'complete') {
        await finalize(ev.draft);
      } else if (ev.type === 'intent') {
        if (ev.intent.kind === 'turn_off') { set({ draft: null }); await stop(); }
        else if (ev.intent.kind === 'help') say('help', VOICE_HELP.join('\n'));
        else if (state.draft) { set({ draft: null }); say('info', 'Commande annulée.'); }
        else if (!(await undoLast())) say('info', 'Rien à annuler.');
      } else if (ev.type === 'unrecognized') {
        say('info', `Je n'ai pas reconnu de commande dans « ${heard ?? ev.text} ». Dis « aide » pour des exemples.`);
      }
    }
    if (!parser.current() && state.draft) set({ draft: null });
  }

  function onUtterance(u: Utterance) {
    set({ heard: u.text });
    queue = queue.then(() => handleParse(parser.feed(u), u.text)).catch((e) => say('error', String(e)));
  }

  async function start() {
    set({ phase: 'loading', message: null, needsModel: false });
    try {
      await deps.engine.start(deps.modelId());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('model-missing')) set({ phase: 'off', needsModel: true, message: { tone: 'info', text: 'Télécharge d’abord le modèle de reconnaissance vocale (une seule fois).' } });
      else set({ phase: 'off', message: { tone: 'error', text: msg } });
    }
  }

  async function stop() {
    parser.reset();
    await deps.engine.stop().catch(() => undefined);
    set({ phase: 'off', level: 0, draft: null });
  }

  return {
    get state() { return state; },
    handle(e: VoiceEngineEvent) {
      switch (e.type) {
        case 'state':
          set({
            phase: e.phase,
            ...(e.phase === 'off' ? { level: 0, draft: null } : {}),
            ...(e.phase === 'off' && e.reason === 'silence' ? { message: { tone: 'info' as const, text: 'Micro coupé : 30 s sans rien entendre.' } } : {}),
            ...(e.phase === 'off' && e.reason && e.reason !== 'silence' && e.reason !== 'model-missing' ? { message: { tone: 'error' as const, text: e.reason } } : {}),
          });
          if (e.phase === 'off') parser.reset();
          break;
        case 'level': set({ level: e.level }); break;
        case 'utterance': onUtterance(e.utterance); break;
        case 'pause': queue = queue.then(() => handleParse(parser.pause())); break;
        case 'error': say('error', e.message); break;
        case 'toggle': void (state.phase === 'off' ? start() : stop()); break;
        default: break;
      }
    },
    start,
    stop,
    toggle: () => (state.phase === 'off' ? start() : stop()),
    undo,
    dismissMessage: () => set({ message: null }),
    clearResults: () => set({ results: [] }),
    /** Attendre la fin des traitements en cours (tests). */
    idle: () => queue,
  };
}

export type VoiceController = ReturnType<typeof createVoiceController>;
