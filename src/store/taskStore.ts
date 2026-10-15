import { useMemo } from 'react';
import { create } from 'zustand';
import type { Task, TaskDraft, TaskStatus } from '../domain/task/task';
import { isActive, tasksToRealign } from '../domain/task/taskRules';
import type { CalendarEvent } from '../domain/event/event';
import { services } from '../app/container';

interface TaskState {
  tasks: Task[];
  loaded: boolean;
  load(): Promise<void>;
  /** Crée ou met à jour depuis le formulaire. */
  saveDraft(id: string | null, draft: TaskDraft): Promise<void>;
  setStatus(id: string, status: TaskStatus): Promise<void>;
  snooze(id: string, minutes: number): Promise<void>;
  moveToTrash(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  purge(id: string): Promise<void>;
  emptyTrash(): Promise<void>;
  toggleSubtask(taskId: string, subtaskId: string): Promise<void>;
  /** Intègre des tâches reçues de la synchronisation (déjà persistées). */
  mergeRemote(tasks: Task[]): void;
  /** Recale l'échéance des tâches liées sur le début de leur évènement. */
  alignToEvents(events: CalendarEvent[]): Promise<void>;
}

const tasksSvc = services.tasks;
/** Prévient l'autre fenêtre (mini / grand agenda) qu'elle doit relire les tâches. */
const publish = () => services.changeBus.publish('tasks');

function upsertInList(list: Task[], ...items: (Task | undefined)[]): Task[] {
  let next = list;
  for (const item of items) {
    if (!item) continue;
    const i = next.findIndex((t) => t.id === item.id);
    next = i === -1 ? [item, ...next] : next.map((t, j) => (j === i ? item : t));
  }
  return next;
}

export const useTaskStore = create<TaskState>((set, get) => {
  const find = (id: string) => get().tasks.find((t) => t.id === id);
  const apply = (...items: (Task | undefined)[]) => {
    set((s) => ({ tasks: upsertInList(s.tasks, ...items) }));
    publish();
  };

  return {
    tasks: [],
    loaded: false,

    async load() {
      const tasks = await tasksSvc.listAll();
      set({ tasks, loaded: true });
    },

    async saveDraft(id, draft) {
      const existing = id ? find(id) : undefined;
      if (existing) {
        const { task, spawned } = await tasksSvc.updateFromDraft(existing, draft);
        apply(task, spawned);
      } else {
        apply(await tasksSvc.create(draft));
      }
    },

    async setStatus(id, status) {
      const task = find(id);
      if (!task || task.status === status) return;
      // Mise à jour optimiste : l'interface bouge tout de suite (Kanban, case à cocher),
      // l'écriture en base suit ; en cas d'échec on revient à l'état précédent.
      set((s) => ({ tasks: upsertInList(s.tasks, { ...task, status }) }));
      try {
        const { task: updated, spawned } = await tasksSvc.setStatus(task, status);
        apply(updated, spawned);
      } catch (e) {
        set((s) => ({ tasks: upsertInList(s.tasks, task) }));
        throw e;
      }
    },

    async snooze(id, minutes) {
      const task = find(id);
      if (!task) return;
      apply((await tasksSvc.snooze(task, minutes)).task);
    },

    async moveToTrash(id) {
      const task = find(id);
      if (task) apply(await tasksSvc.moveToTrash(task));
    },

    async restore(id) {
      const task = find(id);
      if (task) apply(await tasksSvc.restore(task));
    },

    async purge(id) {
      const task = find(id);
      if (!task) return;
      await tasksSvc.purge(task);
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      publish();
    },

    async emptyTrash() {
      for (const t of get().tasks.filter((t) => t.is_deleted === 1)) await tasksSvc.purge(t);
      set((s) => ({ tasks: s.tasks.filter((t) => t.is_deleted === 0) }));
      publish();
    },

    async toggleSubtask(taskId, subtaskId) {
      const task = find(taskId);
      const st = task?.subtasks?.find((s) => s.id === subtaskId);
      if (!task || !st) return;
      const updated = await tasksSvc.toggleSubtask(st);
      apply({ ...task, subtasks: task.subtasks!.map((s) => (s.id === subtaskId ? updated : s)) });
    },

    mergeRemote(tasks) {
      apply(...tasks);
    },

    async alignToEvents(events) {
      const todo = tasksToRealign(get().tasks, events);
      if (todo.length === 0) return;
      const updated: Task[] = [];
      for (const { task, deadline } of todo) updated.push((await tasksSvc.update(task, { deadline })).task);
      apply(...updated);
    },
  };
});

/** Tâches hors corbeille. */
export function useActiveTasks(): Task[] {
  const tasks = useTaskStore((s) => s.tasks);
  return useMemo(() => tasks.filter(isActive), [tasks]);
}

export function useDeletedTasks(): Task[] {
  const tasks = useTaskStore((s) => s.tasks);
  return useMemo(
    () => tasks.filter((t) => t.is_deleted === 1).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [tasks],
  );
}
