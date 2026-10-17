import { useMemo } from 'react';
import { create } from 'zustand';
import { services } from '../app/container';
import { isEmptyNote, sortNotes, type Note, type NotePatch } from '../domain/note/note';

interface NoteState {
  notes: Note[];
  loaded: boolean;
  load(): Promise<void>;
  /** Crée une note vide et renvoie son identifiant (pour l'ouvrir aussitôt). */
  create(initial?: Partial<Pick<Note, 'title' | 'content' | 'color'>>): Promise<string>;
  /** Enregistrement (appelé par l'éditeur, quelques centaines de ms après la dernière frappe). */
  update(id: string, patch: NotePatch): Promise<void>;
  togglePin(id: string): Promise<void>;
  moveToTrash(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  purge(id: string): Promise<void>;
  /** Une note restée vide quand on la quitte n'encombre pas la liste : supprimée définitivement. */
  discardIfEmpty(id: string): Promise<void>;
}

const svc = services.notes;
const publish = () => services.changeBus.publish('notes');

export const useNoteStore = create<NoteState>((set, get) => {
  const find = (id: string) => get().notes.find((n) => n.id === id);
  const put = (note: Note) => {
    set((s) => ({ notes: s.notes.some((n) => n.id === note.id) ? s.notes.map((n) => (n.id === note.id ? note : n)) : [note, ...s.notes] }));
    publish();
  };
  const drop = (id: string) => {
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    publish();
  };

  return {
    notes: [],
    loaded: false,

    async load() {
      set({ notes: await svc.listAll(), loaded: true });
    },

    async create(initial) {
      const note = await svc.create(initial);
      put(note);
      return note.id;
    },

    async update(id, patch) {
      const note = find(id);
      if (!note) return;
      put(await svc.update(note, patch));
    },

    async togglePin(id) {
      const note = find(id);
      if (note) put(await svc.update(note, { is_pinned: note.is_pinned ? 0 : 1 }));
    },

    async moveToTrash(id) {
      const note = find(id);
      if (note) put(await svc.trash(note));
    },

    async restore(id) {
      const note = find(id);
      if (note) put(await svc.restore(note));
    },

    async purge(id) {
      const note = find(id);
      if (!note) return;
      await svc.purge(note);
      drop(id);
    },

    async discardIfEmpty(id) {
      const note = find(id);
      if (note && note.is_deleted === 0 && isEmptyNote(note)) await get().purge(id);
    },
  };
});

/** Notes actives, épinglées d'abord puis les plus récentes. */
export function useActiveNotes(): Note[] {
  const notes = useNoteStore((s) => s.notes);
  return useMemo(() => sortNotes(notes.filter((n) => n.is_deleted === 0)), [notes]);
}

export function useDeletedNotes(): Note[] {
  const notes = useNoteStore((s) => s.notes);
  return useMemo(() => notes.filter((n) => n.is_deleted === 1).sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [notes]);
}
