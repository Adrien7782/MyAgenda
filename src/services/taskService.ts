import type { Attachment, SubTask, Task, TaskDraft, TaskPatch, TaskStatus } from '../domain/task/task';
import {
  draftToPatch,
  nextDeadline,
  parseTags,
  shouldSpawnNextOccurrence,
  snoozedDeadline,
} from '../domain/task/taskRules';
import { nowIso } from '../domain/shared/date';
import { newId } from '../domain/shared/id';
import type { TaskRepository } from './ports';

/**
 * Cas d'usage autour des tâches. Chaque méthode renvoie l'état à jour
 * pour que le store n'ait qu'à le refléter (pas de logique dupliquée dans l'UI).
 */
export function createTaskService(repo: TaskRepository) {
  async function insertSubtasks(taskId: string, drafts: TaskDraft['subtasks'], startAt = 0): Promise<SubTask[]> {
    const created: SubTask[] = [];
    for (const [i, d] of drafts.entries()) {
      const st: SubTask = {
        id: newId(),
        task_id: taskId,
        title: d.title.trim(),
        is_done: d.is_done,
        position: startAt + i,
        created_at: nowIso(),
      };
      await repo.insertSubtask(st);
      created.push(st);
    }
    return created;
  }

  async function saveAttachments(taskId: string, draft: TaskDraft): Promise<void> {
    for (const id of draft.removedAttachmentIds) await repo.deleteAttachment(id);
    for (const a of draft.newAttachments) {
      const att: Attachment = { id: newId(), task_id: taskId, storage_path: null, created_at: nowIso(), ...a };
      await repo.insertAttachment(att);
    }
  }

  async function create(draft: TaskDraft): Promise<Task> {
    const now = nowIso();
    const patch = draftToPatch(draft);
    const task: Task = {
      id: newId(),
      title: patch.title!,
      comment: patch.comment,
      deadline: patch.deadline,
      status: patch.status ?? 'todo',
      priority: patch.priority,
      tags: patch.tags,
      recurrence: patch.recurrence ?? 'none',
      recurrence_interval: patch.recurrence_interval ?? 1,
      event_id: patch.event_id,
      reminder_offset_min: patch.reminder_offset_min ?? null,
      reminder_at: patch.reminder_at ?? null,
      is_deleted: 0,
      created_at: now,
      updated_at: now,
      subtasks: [],
    };
    await repo.insert(task);
    task.subtasks = await insertSubtasks(task.id, draft.subtasks.filter((s) => s.title.trim()));
    await saveAttachments(task.id, draft);
    return task;
  }

  /** Met à jour une tâche depuis le formulaire, y compris le diff des sous-tâches. */
  async function updateFromDraft(existing: Task, draft: TaskDraft): Promise<{ task: Task; spawned?: Task }> {
    const now = nowIso();
    const patch = draftToPatch(draft);
    await repo.update(existing.id, patch, now);

    const current = existing.subtasks ?? [];
    const keptIds = new Set(draft.subtasks.filter((d) => d.id).map((d) => d.id!));
    for (const st of current) if (!keptIds.has(st.id)) await repo.deleteSubtask(st.id);

    const subtasks: SubTask[] = [];
    for (const [position, d] of draft.subtasks.entries()) {
      if (!d.title.trim()) continue;
      const orig = d.id ? current.find((s) => s.id === d.id) : undefined;
      if (orig) {
        const changes: Partial<SubTask> = {};
        if (orig.title !== d.title) changes.title = d.title.trim();
        if (orig.is_done !== d.is_done) changes.is_done = d.is_done;
        if (orig.position !== position) changes.position = position;
        if (Object.keys(changes).length) await repo.updateSubtask(orig.id, changes);
        subtasks.push({ ...orig, ...changes });
      } else {
        const [created] = await insertSubtasks(existing.id, [d], position);
        subtasks.push(created);
      }
    }
    await saveAttachments(existing.id, draft);

    const task: Task = { ...existing, ...patch, updated_at: now, subtasks };
    const spawned = shouldSpawnNextOccurrence(existing, patch.status ?? existing.status)
      ? await spawnNext(existing)
      : undefined;
    return { task, spawned };
  }

  async function update(task: Task, patch: TaskPatch): Promise<{ task: Task; spawned?: Task }> {
    const now = nowIso();
    await repo.update(task.id, patch, now);
    const spawned = patch.status && shouldSpawnNextOccurrence(task, patch.status) ? await spawnNext(task) : undefined;
    return { task: { ...task, ...patch, updated_at: now }, spawned };
  }

  function setStatus(task: Task, status: TaskStatus) {
    return update(task, { status });
  }

  function snooze(task: Task, minutes: number) {
    return update(task, { deadline: snoozedDeadline(task, minutes) });
  }

  /** Crée l'occurrence suivante d'une tâche récurrente (sous-tâches remises à zéro). */
  function spawnNext(task: Task): Promise<Task> {
    return create({
      title: task.title,
      comment: task.comment,
      deadline: nextDeadline(task.deadline!, task.recurrence!, task.recurrence_interval),
      status: 'todo',
      priority: task.priority,
      tags: parseTags(task.tags),
      recurrence: task.recurrence!,
      recurrence_interval: task.recurrence_interval ?? 1,
      // Un rappel "X min avant" suit la nouvelle échéance ; une date fixe ne se répète pas.
      reminder_offset_min: task.reminder_offset_min ?? null,
      subtasks: (task.subtasks ?? []).map((s) => ({ title: s.title, is_done: 0 })),
      newAttachments: [],
      removedAttachmentIds: [],
    });
  }

  async function moveToTrash(task: Task): Promise<Task> {
    const now = nowIso();
    await repo.setDeleted(task.id, true, now);
    return { ...task, is_deleted: 1, updated_at: now };
  }

  async function restore(task: Task): Promise<Task> {
    const now = nowIso();
    await repo.setDeleted(task.id, false, now);
    return { ...task, is_deleted: 0, updated_at: now };
  }

  async function toggleSubtask(subtask: SubTask): Promise<SubTask> {
    const is_done = subtask.is_done ? 0 : 1;
    await repo.updateSubtask(subtask.id, { is_done });
    return { ...subtask, is_done };
  }

  return {
    listAll: () => repo.listAll(),
    listAttachments: (taskId: string) => repo.listAttachments(taskId),
    create,
    updateFromDraft,
    update,
    setStatus,
    snooze,
    moveToTrash,
    restore,
    purge: (task: Task) => repo.purge(task.id, nowIso()),
    toggleSubtask,
  };
}

export type TaskService = ReturnType<typeof createTaskService>;
