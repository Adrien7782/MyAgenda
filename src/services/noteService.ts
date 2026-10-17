import type { Note, NotePatch } from '../domain/note/note';
import { nowIso } from '../domain/shared/date';
import { newId } from '../domain/shared/id';
import type { NoteRepository } from './ports';

/** Notes : création, enregistrement automatique, corbeille. */
export function createNoteService(repo: NoteRepository) {
  return {
    listAll: () => repo.listAll(),

    async create(initial: Partial<Pick<Note, 'title' | 'content' | 'color'>> = {}): Promise<Note> {
      const now = nowIso();
      const note: Note = {
        id: newId(), title: initial.title ?? '', content: initial.content ?? '', color: initial.color ?? null,
        is_pinned: 0, is_deleted: 0, created_at: now, updated_at: now,
      };
      await repo.insert(note);
      return note;
    },

    async update(note: Note, patch: NotePatch): Promise<Note> {
      const now = nowIso();
      await repo.update(note.id, patch, now);
      return { ...note, ...patch, updated_at: now };
    },

    async trash(note: Note): Promise<Note> {
      const now = nowIso();
      await repo.setDeleted(note.id, true, now);
      return { ...note, is_deleted: 1, updated_at: now };
    },

    async restore(note: Note): Promise<Note> {
      const now = nowIso();
      await repo.setDeleted(note.id, false, now);
      return { ...note, is_deleted: 0, updated_at: now };
    },

    /** Suppression définitive (propagée aux autres appareils). */
    purge: (note: Note) => repo.purge(note.id, nowIso()),
  };
}

export type NoteService = ReturnType<typeof createNoteService>;
