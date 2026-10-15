import type { CalendarEvent } from '../../domain/event/event';
import type { SubTask, Task } from '../../domain/task/task';
import type { RemotePage, RemoteStore } from '../../services/ports';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

/** Lignes des tables distantes (voir supabase/schema.sql). `user_id` est rempli par le serveur. */
interface RemoteTaskRow {
  id: string; title: string; comment: string | null; deadline: string | null; status: string;
  priority: string | null; tags: string | null; recurrence: string | null; event_id: string | null;
  is_deleted: number; created_at: string; updated_at: string; subtasks_json: string | null;
  reminder_offset_min: number | null; reminder_at: string | null;
  synced_at?: string;
}

interface RemoteEventRow {
  id: string; title: string; start_at: string; duration_min: number; comment: string | null;
  participants: string | null; location: string | null; is_annual: number; is_deleted: number;
  reminder_offset_min: number | null; reminder_at: string | null;
  created_at: string; updated_at: string;
  synced_at?: string;
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
});

const taskToRow = (t: Task): RemoteTaskRow => ({
  id: t.id, title: t.title, comment: t.comment ?? null, deadline: t.deadline ?? null, status: t.status,
  priority: t.priority ?? null, tags: t.tags ?? null, recurrence: t.recurrence ?? 'none',
  event_id: t.event_id ?? null, is_deleted: t.is_deleted, created_at: t.created_at,
  updated_at: t.updated_at, subtasks_json: JSON.stringify(t.subtasks ?? []),
  reminder_offset_min: t.reminder_offset_min ?? null, reminder_at: t.reminder_at ?? null,
});

const rowToEvent = (r: RemoteEventRow): CalendarEvent => ({
  id: r.id, title: r.title, start_at: r.start_at, duration_min: r.duration_min,
  comment: r.comment ?? undefined, participants: r.participants ?? undefined, location: r.location ?? undefined,
  is_annual: r.is_annual, is_deleted: r.is_deleted, created_at: r.created_at, updated_at: r.updated_at,
  reminder_offset_min: r.reminder_offset_min ?? null, reminder_at: r.reminder_at ?? null,
});

const eventToRow = (e: CalendarEvent): RemoteEventRow => ({
  id: e.id, title: e.title, start_at: e.start_at, duration_min: e.duration_min, comment: e.comment ?? null,
  participants: e.participants ?? null, location: e.location ?? null, is_annual: e.is_annual,
  is_deleted: e.is_deleted ?? 0, created_at: e.created_at, updated_at: e.updated_at,
  reminder_offset_min: e.reminder_offset_min ?? null, reminder_at: e.reminder_at ?? null,
});

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
    for (let i = 0; i < tasks.length; i += 500) {
      const { error } = await getSupabase().from('tasks').upsert(tasks.slice(i, i + 500).map(taskToRow), { onConflict: 'id' });
      if (error) throw new Error(`Envoi des tâches : ${schemaHint(error.message)}`);
    }
  }

  async pushEvents(events: CalendarEvent[]): Promise<void> {
    for (let i = 0; i < events.length; i += 500) {
      const { error } = await getSupabase().from('events').upsert(events.slice(i, i + 500).map(eventToRow), { onConflict: 'id' });
      if (error) throw new Error(`Envoi des évènements : ${schemaHint(error.message)}`);
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
}
