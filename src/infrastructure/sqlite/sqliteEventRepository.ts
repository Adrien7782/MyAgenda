import type { CalendarEvent, EventPatch } from '../../domain/event/event';
import type { EventRepository } from '../../services/ports';
import { getDb, nullsToUndefined } from './database';

const PATCHABLE = ['title', 'start_at', 'duration_min', 'comment', 'participants', 'location', 'is_annual', 'reminder_offset_min', 'reminder_at'] as const;
const COLUMNS = 'id, title, start_at, duration_min, comment, participants, location, is_annual, source_id, external_uid, is_deleted, reminder_offset_min, reminder_at, created_at, updated_at';
const PLACEHOLDERS = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';

function values(e: CalendarEvent) {
  return [e.id, e.title, e.start_at, e.duration_min, e.comment ?? null, e.participants ?? null, e.location ?? null,
    e.is_annual, e.source_id ?? null, e.external_uid ?? null, e.is_deleted ?? 0, e.reminder_offset_min ?? null, e.reminder_at ?? null,
    e.created_at, e.updated_at];
}

export class SqliteEventRepository implements EventRepository {
  async listAll(): Promise<CalendarEvent[]> {
    const db = await getDb();
    const rows = await db.select<CalendarEvent[]>('SELECT * FROM events WHERE COALESCE(is_deleted, 0) = 0 ORDER BY start_at ASC');
    return rows.map(nullsToUndefined);
  }

  async listChangedSince(since: string): Promise<CalendarEvent[]> {
    const db = await getDb();
    const rows = await db.select<CalendarEvent[]>(
      'SELECT * FROM events WHERE source_id IS NULL AND updated_at > ? ORDER BY updated_at ASC', [since],
    );
    return rows.map(nullsToUndefined);
  }

  async insert(e: CalendarEvent): Promise<void> {
    const db = await getDb();
    await db.execute(`INSERT INTO events (${COLUMNS}) VALUES (${PLACEHOLDERS})`, values(e));
  }

  async update(id: string, patch: EventPatch, updatedAt: string): Promise<void> {
    const fields = PATCHABLE.filter((k) => k in patch);
    if (fields.length === 0) return;
    const db = await getDb();
    const sets = [...fields.map((f) => `${f} = ?`), 'updated_at = ?'].join(', ');
    await db.execute(`UPDATE events SET ${sets} WHERE id = ?`, [...fields.map((f) => patch[f] ?? null), updatedAt, id]);
  }

  async markDeleted(id: string, updatedAt: string): Promise<void> {
    const db = await getDb();
    await db.execute('UPDATE events SET is_deleted = 1, updated_at = ? WHERE id = ?', [updatedAt, id]);
  }

  async upsert(e: CalendarEvent): Promise<void> {
    const db = await getDb();
    // Préserve source_id/external_uid si l'évènement distant ne les connaît pas.
    const existing = await db.select<{ source_id: string | null; external_uid: string | null }[]>(
      'SELECT source_id, external_uid FROM events WHERE id = ?', [e.id],
    );
    const merged: CalendarEvent = {
      ...e,
      source_id: e.source_id ?? existing[0]?.source_id ?? undefined,
      external_uid: e.external_uid ?? existing[0]?.external_uid ?? undefined,
    };
    await db.execute(`INSERT OR REPLACE INTO events (${COLUMNS}) VALUES (${PLACEHOLDERS})`, values(merged));
  }

  async replaceSourceEvents(sourceId: string, events: CalendarEvent[]): Promise<void> {
    const db = await getDb();
    const existing = await db.select<{ id: string; created_at: string; reminder_offset_min: number | null; reminder_at: string | null }[]>(
      'SELECT id, created_at, reminder_offset_min, reminder_at FROM events WHERE source_id = ?', [sourceId],
    );
    const createdAt = new Map(existing.map((r) => [r.id, r.created_at]));
    // Un rappel posé sur un cours importé survit aux ré-imports.
    const reminders = new Map(existing.map((r) => [r.id, { reminder_offset_min: r.reminder_offset_min, reminder_at: r.reminder_at }]));
    const keep = new Set(events.map((e) => e.id));
    for (const r of existing) if (!keep.has(r.id)) await db.execute('DELETE FROM events WHERE id = ?', [r.id]);
    for (const e of events) {
      await db.execute(
        `INSERT OR REPLACE INTO events (${COLUMNS}) VALUES (${PLACEHOLDERS})`,
        values({ ...e, ...reminders.get(e.id), created_at: createdAt.get(e.id) ?? e.created_at }),
      );
    }
  }

  async deleteBySource(sourceId: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM events WHERE source_id = ?', [sourceId]);
  }
}
