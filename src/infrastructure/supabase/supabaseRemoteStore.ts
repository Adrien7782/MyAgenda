import type { CalendarEvent } from '../../domain/event/event';
import type { SubTask, Task } from '../../domain/task/task';
import type { Note } from '../../domain/note/note';
import type { RemotePage, RemoteStore } from '../../services/ports';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

/** Lignes des tables distantes (voir supabase/schema.sql). `user_id` est rempli par le serveur. */
interface RemoteTaskRow {
  id: string; title: string; comment: string | null; deadline: string | null; status: string;
  priority: string | null; tags: string | null; recurrence: string | null; event_id: string | null;
  is_deleted: number; created_at: string; updated_at: string; subtasks_json: string | null;
  reminder_offset_min: number | null; reminder_at: string | null;
  /** Ajoutée en 1.1 (relancer supabase/schema.sql) : absente des anciennes bases serveur. */
  recurrence_interval?: number | null;
  synced_at?: string;
}

interface RemoteEventRow {
  id: string; title: string; start_at: string; duration_min: number; comment: string | null;
  participants: string | null; location: string | null; is_annual: number; is_deleted: number;
  reminder_offset_min: number | null; reminder_at: string | null;
  /** Ajoutées en 1.1 (relancer supabase/schema.sql) : absentes des anciennes bases serveur. */
  recurrence?: string | null; recurrence_until?: string | null; recurrence_interval?: number | null;
  created_at: string; updated_at: string;
  synced_at?: string;
}

/** Le serveur n'a pas encore une colonne / une table ajoutée par une mise à jour (schema.sql pas relancé). */
function isMissingSchema(message: string): boolean {
  return /schema cache|does not exist|could not find/i.test(message);
}

/** Colonne inconnue côté serveur = script supabase/schema.sql pas relancé après une mise à jour. */
function schemaHint(message: string): string {
  return /column|schema cache/i.test(message)
    ? `${message} → relance supabase/schema.sql dans Supabase (SQL Editor) pour mettre la base du serveur à jour.`
    : message;
}

function parseSubtasks(raw: string | null): SubTask[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

const rowToTask = (r: RemoteTaskRow): Task => ({
  id: r.id, title: r.title, comment: r.comment ?? undefined, deadline: r.deadline ?? undefined,
  status: r.status as Task['status'], priority: (r.priority ?? undefined) as Task['priority'],
  tags: r.tags ?? undefined, recurrence: (r.recurrence ?? 'none') as Task['recurrence'],
  event_id: r.event_id ?? undefined, is_deleted: r.is_deleted, created_at: r.created_at,
  updated_at: r.updated_at, subtasks: parseSubtasks(r.subtasks_json),
  reminder_offset_min: r.reminder_offset_min ?? null, reminder_at: r.reminder_at ?? null,
  recurrence_interval: r.recurrence_interval ?? null,
});

const taskToRow = (t: Task): RemoteTaskRow => ({
  id: t.id, title: t.title, comment: t.comment ?? null, deadline: t.deadline ?? null, status: t.status,
  priority: t.priority ?? null, tags: t.tags ?? null, recurrence: t.recurrence ?? 'none',
  event_id: t.event_id ?? null, is_deleted: t.is_deleted, created_at: t.created_at,
  updated_at: t.updated_at, subtasks_json: JSON.stringify(t.subtasks ?? []),
  reminder_offset_min: t.reminder_offset_min ?? null, reminder_at: t.reminder_at ?? null,
  recurrence_interval: t.recurrence_interval ?? 1,
});

const rowToEvent = (r: RemoteEventRow): CalendarEvent => ({
  id: r.id, title: r.title, start_at: r.start_at, duration_min: r.duration_min,
  comment: r.comment ?? undefined, participants: r.participants ?? undefined, location: r.location ?? undefined,
  is_annual: r.is_annual, is_deleted: r.is_deleted, created_at: r.created_at, updated_at: r.updated_at,
  reminder_offset_min: r.reminder_offset_min ?? null, reminder_at: r.reminder_at ?? null,
  recurrence: (r.recurrence ?? null) as CalendarEvent['recurrence'], recurrence_until: r.recurrence_until ?? null,
  recurrence_interval: r.recurrence_interval ?? null,
});

const eventToRow = (e: CalendarEvent): RemoteEventRow => ({
  id: e.id, title: e.title, start_at: e.start_at, duration_min: e.duration_min, comment: e.comment ?? null,
  participants: e.participants ?? null, location: e.location ?? null, is_annual: e.is_annual,
  is_deleted: e.is_deleted ?? 0, created_at: e.created_at, updated_at: e.updated_at,
  reminder_offset_min: e.reminder_offset_min ?? null, reminder_at: e.reminder_at ?? null,
  recurrence: e.recurrence ?? null, recurrence_until: e.recurrence_until ?? null,
  recurrence_interval: e.recurrence_interval ?? 1,
});

interface RemoteNoteRow {
  id: string; title: string; content: string; color: string | null; is_pinned: number; is_deleted: number;
  created_at: string; updated_at: string;
  synced_at?: string;
}

const noteToRow = (n: Note): RemoteNoteRow => ({
  id: n.id, title: n.title, content: n.content, color: n.color ?? null, is_pinned: n.is_pinned, is_deleted: n.is_deleted,
  created_at: n.created_at, updated_at: n.updated_at,
});

const rowToNote = (r: RemoteNoteRow): Note => ({
  id: r.id, title: r.title ?? '', content: r.content ?? '', color: r.color ?? null, is_pinned: r.is_pinned ?? 0,
  is_deleted: r.is_deleted ?? 0, created_at: r.created_at, updated_at: r.updated_at,
});

/** Colonnes ajoutées après la 1.0 : envoyées seulement si le serveur les connaît. */
const OPTIONAL_COLUMNS: Record<'tasks' | 'events', string[]> = {
  tasks: ['recurrence_interval'],
  events: ['recurrence', 'recurrence_until', 'recurrence_interval'],
};

function withoutColumns<R extends object>(row: R, columns: Set<string>): R {
  if (!columns.size) return row;
  const out = { ...row } as Record<string, unknown>;
  for (const c of columns) delete out[c];
  return out as R;
}

/** Colonnes optionnelles qu'un message d'erreur « colonne inconnue » désigne. */
function missingColumns(table: 'tasks' | 'events', message: string): string[] {
  if (!isMissingSchema(message)) return [];
  const named = OPTIONAL_COLUMNS[table].filter((c) => new RegExp(`['"]${c}['"]`).test(message));
  if (named.length) return named;
  return /recurrence/i.test(message) ? OPTIONAL_COLUMNS[table] : [];
}

/**
 * Adaptateur Supabase pour la synchronisation. Grâce aux règles RLS,
 * chaque requête ne voit et ne modifie QUE les lignes du compte connecté.
 */
export class SupabaseRemoteStore implements RemoteStore {
  async isConnected(): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { data } = await getSupabase().auth.getSession();
    return !!data.session;
  }

  async pushTasks(tasks: Task[]): Promise<void> {
    await this.upsertTolerant('tasks', tasks.map(taskToRow), 'Envoi des tâches');
  }

  async pushEvents(events: CalendarEvent[]): Promise<void> {
    await this.upsertTolerant('events', events.map(eventToRow), 'Envoi des évènements');
  }

  /** Base serveur pas encore mise à jour (schema.sql pas relancé) : colonnes récentes à ne pas envoyer. */
  private skipped: Record<'tasks' | 'events', Set<string>> = { tasks: new Set(), events: new Set() };

  private async upsertTolerant<R extends object>(table: 'tasks' | 'events', rows: R[], label: string): Promise<void> {
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      for (;;) {
        const skip = this.skipped[table];
        const { error } = await getSupabase().from(table).upsert(chunk.map((r) => withoutColumns(r, skip)), { onConflict: 'id' });
        if (!error) break;
        const missing = missingColumns(table, error.message).filter((c) => !skip.has(c));
        if (!missing.length) throw new Error(`${label} : ${schemaHint(error.message)}`);
        // La synchronisation continue ; seules ces informations (répétitions) ne passent pas tant que schema.sql n'est pas relancé.
        console.warn(`[Sync] Colonnes absentes du serveur (${table} : ${missing.join(', ')}) : relance supabase/schema.sql.`);
        for (const c of missing) skip.add(c);
      }
    }
  }

  /** `synced_at` est posé par le serveur (trigger) à chaque écriture : c'est lui qui sert de curseur. */
  private async pull<R extends { synced_at?: string }>(table: string, cursor?: string): Promise<{ rows: R[]; cursor: string | null }> {
    const all: R[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      let q = getSupabase().from(table).select('*').order('synced_at', { ascending: true }).range(from, from + PAGE - 1);
      if (cursor) q = q.gt('synced_at', cursor);
      const { data, error } = await q;
      if (error) throw new Error(`Récupération (${table}) : ${error.message}`);
      all.push(...((data ?? []) as R[]));
      if (!data || data.length < PAGE) break;
    }
    return { rows: all, cursor: all.length ? all[all.length - 1].synced_at ?? null : null };
  }

  async pullTasks(cursor?: string): Promise<RemotePage<Task>> {
    const page = await this.pull<RemoteTaskRow>('tasks', cursor);
    return { rows: page.rows.map(rowToTask), cursor: page.cursor };
  }

  async pullEvents(cursor?: string): Promise<RemotePage<CalendarEvent>> {
    const page = await this.pull<RemoteEventRow>('events', cursor);
    return { rows: page.rows.map(rowToEvent), cursor: page.cursor };
  }

  // ── Notes (table ajoutée en 1.1 : tant que schema.sql n'est pas relancé, elles restent locales) ──

  async pushNotes(notes: Note[]): Promise<boolean> {
    if (!notes.length) return this.notesTableExists();
    for (let i = 0; i < notes.length; i += 200) {
      const rows = notes.slice(i, i + 200).map(noteToRow);
      const { error } = await getSupabase().from('notes').upsert(rows, { onConflict: 'id' });
      if (error && isMissingSchema(error.message)) return false;
      if (error) throw new Error(`Envoi des notes : ${schemaHint(error.message)}`);
    }
    this.notesTableSeen = true;
    return true;
  }

  async pullNotes(cursor?: string): Promise<RemotePage<Note> | null> {
    try {
      const page = await this.pull<RemoteNoteRow>('notes', cursor);
      return { rows: page.rows.map(rowToNote), cursor: page.cursor };
    } catch (e) {
      if (e instanceof Error && isMissingSchema(e.message)) return null;
      throw e;
    }
  }

  private notesTableSeen = false;
  private async notesTableExists(): Promise<boolean> {
    if (this.notesTableSeen) return true;
    const { error } = await getSupabase().from('notes').select('id').limit(1);
    this.notesTableSeen = !error || !isMissingSchema(error.message);
    return this.notesTableSeen;
  }
}
