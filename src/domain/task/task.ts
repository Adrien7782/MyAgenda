/**
 * Entités "Tâche". La forme reprend exactement les colonnes SQLite / Supabase
 * (snake_case, booléens en 0/1) pour rester compatible avec les données existantes.
 */

export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done';
export type Priority = 'high' | 'medium' | 'low';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface SubTask {
  id: string;
  task_id: string;
  title: string;
  is_done: number;
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  comment?: string;
  deadline?: string;
  status: TaskStatus;
  priority?: Priority;
  /** Tableau JSON sérialisé : '["tag1","tag2"]' */
  tags?: string;
  recurrence?: Recurrence;
  /** « Tous les N … » (absent ou 1 = à chaque jour / semaine / mois). */
  recurrence_interval?: number | null;
  event_id?: string;
  /** Rappel : minutes avant l'échéance… */
  reminder_offset_min?: number | null;
  /** …ou date fixe (ISO). */
  reminder_at?: string | null;
  is_deleted: number;
  created_at: string;
  updated_at: string;
  /** Jointure en mémoire, pas une colonne. */
  subtasks?: SubTask[];
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  created_at: string;
}

/** Champs modifiables d'une tâche (hors cycle de vie). */
export type TaskPatch = Partial<
  Pick<Task, 'title' | 'comment' | 'deadline' | 'status' | 'priority' | 'tags' | 'recurrence' | 'recurrence_interval' | 'event_id' | 'reminder_offset_min' | 'reminder_at'>
>;

/** Données saisies dans le formulaire de tâche. */
export interface TaskDraft {
  title: string;
  comment?: string;
  deadline?: string;
  status: TaskStatus;
  priority?: Priority;
  tags: string[];
  recurrence: Recurrence;
  /** « Tous les N … » (1 par défaut). */
  recurrence_interval?: number;
  event_id?: string;
  reminder_offset_min?: number | null;
  reminder_at?: string | null;
  subtasks: SubtaskDraft[];
  /** Fichiers ajoutés pendant l'édition (métadonnées seulement). */
  newAttachments: AttachmentDraft[];
  removedAttachmentIds: string[];
}

export interface SubtaskDraft {
  /** Absent pour une sous-tâche nouvellement ajoutée. */
  id?: string;
  title: string;
  is_done: number;
}

export interface AttachmentDraft {
  file_name: string;
  file_type: string | null;
  file_size: number | null;
}

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'waiting', 'done'];
