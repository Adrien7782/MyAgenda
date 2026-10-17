/**
 * Implémentations en mémoire, utilisées quand l'interface tourne dans un simple navigateur
 * (`npm run dev`) : pratique pour travailler le design sans lancer Tauri. Rien n'est persisté.
 */
import type { Attachment, SubTask, Task, TaskPatch } from '../../domain/task/task';
import type { CalendarEvent, CalendarSource, EventPatch } from '../../domain/event/event';
import type { Note, NotePatch } from '../../domain/note/note';
import type {
  CalendarSourceRepository,
  EventRepository,
  NoteRepository,
  Repositories,
  SettingsRepository,
  TaskRepository,
} from '../../services/ports';
import { demoEvents, demoNotes, demoTasks } from './demoData';

const clone = <T>(v: T): T => structuredClone(v);

class MemoryTaskRepository implements TaskRepository {
  private tasks = new Map<string, Task>();
  private subtasks = new Map<string, SubTask>();
  private attachments = new Map<string, Attachment>();

  constructor(seed: Task[]) {
    for (const t of seed) {
      const { subtasks, ...rest } = t;
      this.tasks.set(t.id, rest);
      for (const st of subtasks ?? []) this.subtasks.set(st.id, st);
    }
  }

  private withSubtasks(list: Task[]) {
    const subs = [...this.subtasks.values()].sort((a, b) => a.position - b.position);
    return list.map((t) => clone({ ...t, subtasks: subs.filter((s) => s.task_id === t.id) }));
  }
  async listAll() {
    return this.withSubtasks([...this.tasks.values()].filter((t) => t.is_deleted < 2).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }
  async listChangedSince(since: string) {
    return this.withSubtasks([...this.tasks.values()].filter((t) => t.updated_at > since));
  }
  async insert(t: Task) {
    const { subtasks: _ignored, ...rest } = t;
    this.tasks.set(t.id, clone(rest));
  }
  async update(id: string, patch: TaskPatch, updatedAt: string) {
    const t = this.tasks.get(id);
    if (t) this.tasks.set(id, { ...t, ...patch, updated_at: updatedAt });
  }
  async setDeleted(id: string, deleted: boolean, updatedAt: string) {
    const t = this.tasks.get(id);
    if (t) this.tasks.set(id, { ...t, is_deleted: deleted ? 1 : 0, updated_at: updatedAt });
  }
  async purge(id: string, updatedAt: string) {
    const t = this.tasks.get(id);
    if (t) this.tasks.set(id, { ...t, is_deleted: 2, title: '', comment: undefined, updated_at: updatedAt });
    for (const [k, s] of this.subtasks) if (s.task_id === id) this.subtasks.delete(k);
  }
  async upsert(t: Task) {
    await this.insert(t);
    if (t.subtasks) {
      for (const [k, s] of this.subtasks) if (s.task_id === t.id) this.subtasks.delete(k);
      for (const s of t.subtasks) this.subtasks.set(s.id, clone(s));
    }
  }
  async insertSubtask(st: SubTask) { this.subtasks.set(st.id, clone(st)); }
  async updateSubtask(id: string, patch: Partial<SubTask>) {
    const s = this.subtasks.get(id);
    if (s) this.subtasks.set(id, { ...s, ...patch });
  }
  async deleteSubtask(id: string) { this.subtasks.delete(id); }
  async listAttachments(taskId: string) { return [...this.attachments.values()].filter((a) => a.task_id === taskId); }
  async insertAttachment(a: Attachment) { this.attachments.set(a.id, a); }
  async deleteAttachment(id: string) { this.attachments.delete(id); }
}

class MemoryEventRepository implements EventRepository {
  private events = new Map<string, CalendarEvent>();
  constructor(seed: CalendarEvent[]) { for (const e of seed) this.events.set(e.id, e); }

  async listAll() {
    return [...this.events.values()].filter((e) => !e.is_deleted).sort((a, b) => a.start_at.localeCompare(b.start_at)).map(clone);
  }
  async listChangedSince(since: string) {
    return [...this.events.values()].filter((e) => !e.source_id && e.updated_at > since).map(clone);
  }
  async insert(e: CalendarEvent) { this.events.set(e.id, clone(e)); }
  async update(id: string, patch: EventPatch, updatedAt: string) {
    const e = this.events.get(id);
    if (e) this.events.set(id, { ...e, ...patch, updated_at: updatedAt });
  }
  async markDeleted(id: string, updatedAt: string) {
    const e = this.events.get(id);
    if (e) this.events.set(id, { ...e, is_deleted: 1, updated_at: updatedAt });
  }
  async upsert(e: CalendarEvent) { this.events.set(e.id, clone(e)); }
  async replaceSourceEvents(sourceId: string, events: CalendarEvent[]) {
    const previous = new Map([...this.events.values()].filter((e) => e.source_id === sourceId).map((e) => [e.id, e]));
    await this.deleteBySource(sourceId);
    for (const e of events) {
      const old = previous.get(e.id);
      this.events.set(e.id, clone({ ...e, reminder_offset_min: old?.reminder_offset_min ?? null, reminder_at: old?.reminder_at ?? null }));
    }
  }
  async deleteBySource(sourceId: string) {
    for (const [k, e] of this.events) if (e.source_id === sourceId) this.events.delete(k);
  }
}

class MemorySourceRepository implements CalendarSourceRepository {
  private sources = new Map<string, CalendarSource>();
  async listAll() { return [...this.sources.values()].map(clone); }
  async insert(s: CalendarSource) { this.sources.set(s.id, clone(s)); }
  async update(id: string, patch: Partial<CalendarSource>) {
    const s = this.sources.get(id);
    if (s) this.sources.set(id, { ...s, ...patch });
  }
  async delete(id: string) { this.sources.delete(id); }
}

class MemoryNoteRepository implements NoteRepository {
  private notes = new Map<string, Note>();
  constructor(seed: Note[]) { for (const n of seed) this.notes.set(n.id, clone(n)); }
  async listAll() { return [...this.notes.values()].filter((n) => n.is_deleted < 2).map(clone); }
  async listChangedSince(since: string) { return [...this.notes.values()].filter((n) => n.updated_at > since).map(clone); }
  async insert(n: Note) { this.notes.set(n.id, clone(n)); }
  async update(id: string, patch: NotePatch, updatedAt: string) {
    const n = this.notes.get(id);
    if (n) this.notes.set(id, { ...n, ...patch, updated_at: updatedAt });
  }
  async setDeleted(id: string, deleted: boolean, updatedAt: string) {
    const n = this.notes.get(id);
    if (n) this.notes.set(id, { ...n, is_deleted: deleted ? 1 : 0, updated_at: updatedAt });
  }
  async purge(id: string, updatedAt: string) {
    const n = this.notes.get(id);
    if (n) this.notes.set(id, { ...n, is_deleted: 2, title: '', content: '', updated_at: updatedAt });
  }
  async upsert(n: Note) { this.notes.set(n.id, clone(n)); }
}

/** Les réglages survivent au rechargement de la page grâce au localStorage (si disponible). */
class LocalStorageSettingsRepository implements SettingsRepository {
  private memory = new Map<string, string>();
  private key = (k: string) => `my-agenda:${k}`;
  async get(k: string) {
    try {
      return window.localStorage.getItem(this.key(k)) ?? this.memory.get(k) ?? null;
    } catch {
      return this.memory.get(k) ?? null;
    }
  }
  async set(k: string, v: string) {
    this.memory.set(k, v);
    try { window.localStorage.setItem(this.key(k), v); } catch { /* navigation privée */ }
  }
}

export function createMemoryRepositories(opts: { demo?: boolean } = {}): Repositories {
  const demo = opts.demo ?? true;
  return {
    tasks: new MemoryTaskRepository(demo ? demoTasks() : []),
    events: new MemoryEventRepository(demo ? demoEvents() : []),
    notes: new MemoryNoteRepository(demo ? demoNotes() : []),
    sources: new MemorySourceRepository(),
    settings: new LocalStorageSettingsRepository(),
  };
}
