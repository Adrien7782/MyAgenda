export interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  duration_min: number;
  comment?: string;
  participants?: string;
  location?: string;
  is_annual: number;
  /** Renseigné quand l'évènement provient d'un calendrier importé (.ics). */
  source_id?: string;
  external_uid?: string;
  /** 1 = supprimé (conservé pour propager la suppression aux autres appareils). */
  is_deleted?: number;
  /** Rappel : minutes avant le début… ou date fixe (ISO). */
  reminder_offset_min?: number | null;
  reminder_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Champs saisis dans le formulaire d'évènement. */
export interface EventDraft {
  title: string;
  start_at: string;
  duration_min: number;
  comment?: string;
  participants?: string;
  location?: string;
  is_annual: number;
  reminder_offset_min?: number | null;
  reminder_at?: string | null;
}

export type EventPatch = Partial<EventDraft>;

/** Calendrier externe (emploi du temps universitaire, Google Agenda…) importé via lien ou fichier .ics. */
export interface CalendarSource {
  id: string;
  name: string;
  /** null pour un fichier importé une seule fois. */
  url: string | null;
  color: string;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
}

export const SOURCE_COLORS = ['#3b6eff', '#00d4a0', '#9061f9', '#f59e0b', '#f43f5e', '#38bdf8', '#e879f9'];
