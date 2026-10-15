import { DAY_MS, MINUTE_MS } from '../shared/date';
import type { Recurrence, Task, TaskDraft, TaskPatch, TaskStatus } from './task';
import type { CalendarEvent } from '../event/event';
import { nextOccurrenceStart } from '../event/eventRules';

/** Ordre du cycle quand on clique sur la pastille de statut. */
const STATUS_CYCLE: TaskStatus[] = ['todo', 'in_progress', 'waiting', 'done'];

export function nextStatus(status: TaskStatus): TaskStatus {
  return STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length];
}

export function isActive(task: Task): boolean {
  return task.is_deleted === 0;
}

export function isOverdue(task: Task, now = Date.now()): boolean {
  if (!task.deadline || task.status === 'done') return false;
  return new Date(task.deadline).getTime() < now;
}

export function overdueDays(task: Task, now = Date.now()): number {
  if (!task.deadline) return 0;
  return Math.max(1, Math.ceil((now - new Date(task.deadline).getTime()) / DAY_MS));
}

export function nextDeadline(iso: string, recurrence: Recurrence): string {
  const d = new Date(iso);
  if (recurrence === 'daily') d.setDate(d.getDate() + 1);
  if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
  if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/** Une tâche récurrente terminée doit-elle générer sa prochaine occurrence ? */
export function shouldSpawnNextOccurrence(task: Task, newStatus: TaskStatus): boolean {
  return (
    newStatus === 'done' &&
    task.status !== 'done' &&
    !!task.deadline &&
    !!task.recurrence &&
    task.recurrence !== 'none'
  );
}

export function snoozedDeadline(task: Task, minutes: number, now = Date.now()): string {
  // Le rappel part de "maintenant" : repousser une deadline vieille de 3 jours de 15 min n'a pas de sens.
  const base = Math.max(now, task.deadline ? new Date(task.deadline).getTime() : now);
  return new Date(base + minutes * MINUTE_MS).toISOString();
}

export function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

export function serializeTags(tags: string[]): string | undefined {
  const clean = tags.map((t) => t.trim()).filter(Boolean);
  return clean.length > 0 ? JSON.stringify(clean) : undefined;
}

export function matchesSearch(task: Task, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    task.title.toLowerCase().includes(q) ||
    (task.comment ?? '').toLowerCase().includes(q) ||
    parseTags(task.tags).some((t) => t.toLowerCase().includes(q))
  );
}

export function draftToPatch(draft: TaskDraft): TaskPatch {
  return {
    title: draft.title.trim(),
    comment: draft.comment?.trim() || undefined,
    deadline: draft.deadline,
    status: draft.status,
    priority: draft.priority,
    tags: serializeTags(draft.tags),
    recurrence: draft.recurrence,
    event_id: draft.event_id,
    reminder_offset_min: draft.reminder_offset_min ?? null,
    reminder_at: draft.reminder_at ?? null,
  };
}

export function sortByDeadline(a: Task, b: Task): number {
  return new Date(a.deadline ?? 0).getTime() - new Date(b.deadline ?? 0).getTime();
}

/** Une tâche liée à un évènement a pour échéance le début de cet évènement. */
export function deadlineFromEvent(ev: CalendarEvent, now = new Date()): string {
  return nextOccurrenceStart(ev, now).toISOString();
}

/** Tâches liées dont l'échéance n'est plus alignée sur leur évènement (évènement déplacé, ré-import…). */
export function tasksToRealign(tasks: Task[], events: CalendarEvent[], now = new Date()): { task: Task; deadline: string }[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const out: { task: Task; deadline: string }[] = [];
  for (const t of tasks) {
    if (!t.event_id || t.is_deleted || t.status === 'done') continue;
    const ev = byId.get(t.event_id);
    if (!ev) continue; // évènement supprimé : la tâche garde son échéance
    const deadline = deadlineFromEvent(ev, now);
    if (!t.deadline || new Date(t.deadline).getTime() !== new Date(deadline).getTime()) out.push({ task: t, deadline });
  }
  return out;
}
