import type { CalendarSource } from '../../domain/event/event';
import type { CalendarSourceRepository, SettingsRepository } from '../../services/ports';
import { getDb } from './database';

export class SqliteSettingsRepository implements SettingsRepository {
  async get(key: string): Promise<string | null> {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>('SELECT value FROM settings WHERE key = ?', [key]);
    return rows[0]?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await getDb();
    await db.execute(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value],
    );
  }
}

const SOURCE_FIELDS = ['name', 'url', 'color', 'last_synced_at', 'last_error'] as const;

export class SqliteCalendarSourceRepository implements CalendarSourceRepository {
  async listAll(): Promise<CalendarSource[]> {
    const db = await getDb();
    return db.select<CalendarSource[]>('SELECT * FROM calendar_sources ORDER BY created_at ASC');
  }

  async insert(s: CalendarSource): Promise<void> {
    const db = await getDb();
    await db.execute(
      'INSERT INTO calendar_sources (id, name, url, color, last_synced_at, last_error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [s.id, s.name, s.url, s.color, s.last_synced_at, s.last_error, s.created_at],
    );
  }

  async update(id: string, patch: Partial<Omit<CalendarSource, 'id' | 'created_at'>>): Promise<void> {
    const fields = SOURCE_FIELDS.filter((k) => k in patch);
    if (fields.length === 0) return;
    const db = await getDb();
    await db.execute(
      `UPDATE calendar_sources SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
      [...fields.map((f) => patch[f] ?? null), id],
    );
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM calendar_sources WHERE id = ?', [id]);
  }
}
