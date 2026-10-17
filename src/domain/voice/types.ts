/**
 * Commande vocale — données échangées entre le moteur de reconnaissance (Rust, Whisper)
 * et l'analyseur de phrases guidées (ce dossier, sans aucune IA).
 */

/** Un mot reconnu, avec sa position dans l'enregistrement (en secondes). */
export interface VoiceWord {
  text: string;
  start: number;
  end: number;
}

/** Une phrase prononcée (entre deux silences), transcrite en français par la 1re passe. */
export interface Utterance {
  id: number;
  text: string;
  words: VoiceWord[];
  /** Durée de l'enregistrement, en secondes. */
  duration: number;
}

/** Morceau de son d'un champ dicté (titre, contenu…), à retranscrire dans sa vraie langue. */
export interface FieldPiece {
  utteranceId: number;
  start: number;
  end: number;
  /** Texte de la 1re passe (en français). */
  text: string;
}

export type CommandKind = 'note' | 'task' | 'event';
export type FieldName = 'title' | 'content' | 'when' | 'priority' | 'repeat' | 'duration' | 'location';
export type SpokenLanguage = 'fr' | 'en' | 'es';

/** Fiche finale : ce que l'application exécute. */
export type VoiceIntent =
  | { kind: 'create_note'; title: string; content: string }
  | {
      kind: 'create_task'; title: string; comment?: string; deadline?: string;
      priority?: 'high' | 'medium' | 'low'; recurrence?: 'daily' | 'weekly' | 'monthly';
    }
  | {
      kind: 'create_event'; title: string; start?: string; allDay?: boolean; durationMin?: number;
      location?: string; recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    }
  | { kind: 'turn_off' }
  | { kind: 'cancel' }
  | { kind: 'help' };
