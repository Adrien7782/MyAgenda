import type { Note, NotePatch } from '../../domain/note/note';
import type { NoteRepository } from '../../services/ports';
import { getDb } from './database';

const PATCHABLE = ['title', 'content', 'color', 'is_pinned'] as const;
const COLUMNS = 'id, title, content, color, is_pinned, is_deleted, created_at, updated_at';
const PLACEHOLDERS = COLUMNS.split(',').map(() => '?').join(', ');

const values = (n: Note) => [n.id, n.title, n.content, n.color ?? null, n.is_pinned, n.is_deleted, n.created_at, n.updated_at];
const toNote = (r: Note): Note => ({ ...r, color: r.color ?? null, is_pinned: Number(r.is_pinned) || 0, is_deleted: Number(r.is_deleted) || 0 });

export class SqliteNoteRepository implements NoteRepository {
  async listAll(): Promise<Note[]> {
    const db = await getDb();
    return (await db.select<Note[]>('SELECT * FROM notes WHERE is_deleted < 2 ORDER BY updated_at DESC')).map(toNote);
  }

  async listChangedSince(since: string): Promise<Note[]> {
    const db = await getDb();
    return (await db.select<Note[]>('SELECT * FROM notes WHERE updated_at > ? ORDER BY updated_at ASC', [since])).map(toNote);
  }

  async insert(n: Note): Promise<void> {
    const db = await getDb();
    await db.execute(`INSERT INTO notes (${COLUMNS}) VALUES (${PLACEHOLDERS})`, values(n));
  }

  async update(id: string, patch: NotePatch, updatedAt: string): Promise<void> {
    const fields = PATCHABLE.filter((k) => k in patch);
    if (!fields.length) return;
    const db = await getDb();
    const sets = [...fields.map((f) => `${f} = ?`), 'updated_at = ?'].join(', ');
    await db.execute(`UPDATE notes SET ${sets} WHERE id = ?`, [...fields.map((f) => patch[f] ?? null), updatedAt, id]);
  }

  async setDeleted(id: string, deleted: boolean, updatedAt: string): Promise<void> {
    const db = await getDb();
    await db.execute('UPDATE notes SET is_deleted = ?, updated_at = ? WHERE id = ?', [deleted ? 1 : 0, updatedAt, id]);
  }

  async purge(id: string, updatedAt: string): Promise<void> {
    const db = await getDb();
    // Pierre tombale : le texte est effacé, seule la trace de suppression part aux autres appareils.
    await db.execute("UPDATE notes SET is_deleted = 2, title = '', content = '', updated_at = ? WHERE id = ?", [updatedAt, id]);
  }

  async upsert(n: Note): Promise<void> {
    const db = await getDb();
    await db.execute(`INSERT OR REPLACE INTO notes (${COLUMNS}) VALUES (${PLACEHOLDERS})`, values(n));
  }
}
