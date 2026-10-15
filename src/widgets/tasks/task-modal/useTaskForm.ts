import { useEffect, useState } from 'react';
import type { Attachment, AttachmentDraft, Priority, Recurrence, SubtaskDraft, Task, TaskDraft, TaskStatus } from '../../../domain/task/task';
import { parseTags } from '../../../domain/task/taskRules';
import { fromLocalInputValue, toLocalInputValue } from '../../../domain/shared/date';
import { services } from '../../../app/container';
import { readReminder, writeReminder, type ReminderSetting } from '../../../domain/reminder/reminder';

/** État du formulaire de tâche + conversion en `TaskDraft` pour le service. */
export function useTaskForm(task: Task | null, prefillDeadline: string | null) {
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<Priority | 'none'>('none');
  const [tags, setTags] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [eventId, setEventId] = useState('');
  const [reminder, setReminder] = useState<ReminderSetting>({ kind: 'none' });
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newAttachments, setNewAttachments] = useState<AttachmentDraft[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);

  useEffect(() => {
    setTitle(task?.title ?? '');
    setComment(task?.comment ?? '');
    const dl = task?.deadline ?? prefillDeadline;
    setDeadline(dl ? toLocalInputValue(dl) : '');
    setStatus(task?.status ?? 'todo');
    setPriority(task?.priority ?? 'none');
    setTags(parseTags(task?.tags).join(', '));
    setRecurrence(task?.recurrence ?? 'none');
    setEventId(task?.event_id ?? '');
    setReminder(task ? readReminder(task) : { kind: 'none' });
    setSubtasks((task?.subtasks ?? []).map((s) => ({ id: s.id, title: s.title, is_done: s.is_done })));
    setNewAttachments([]);
    setRemovedAttachmentIds([]);
    setAttachments([]);
    if (task) services.tasks.listAttachments(task.id).then(setAttachments).catch(() => setAttachments([]));
  }, [task?.id, prefillDeadline]); // eslint-disable-line react-hooks/exhaustive-deps

  function toDraft(): TaskDraft {
    return {
      title: title.trim(),
      comment: comment.trim() || undefined,
      deadline: fromLocalInputValue(deadline),
      status,
      priority: priority === 'none' ? undefined : priority,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      recurrence,
      event_id: eventId || undefined,
      ...writeReminder(reminder),
      subtasks,
      newAttachments,
      removedAttachmentIds,
    };
  }

  return {
    fields: { title, comment, deadline, status, priority, tags, recurrence, eventId, reminder },
    set: { setTitle, setComment, setDeadline, setStatus, setPriority, setTags, setRecurrence, setEventId, setReminder },
    subtasks, setSubtasks,
    attachments: {
      existing: attachments.filter((a) => !removedAttachmentIds.includes(a.id)),
      added: newAttachments,
      add: (files: File[]) => setNewAttachments((a) => [...a, ...files.map((f) => ({ file_name: f.name, file_type: f.type || null, file_size: f.size }))]),
      removeExisting: (id: string) => setRemovedAttachmentIds((ids) => [...ids, id]),
      removeAdded: (index: number) => setNewAttachments((a) => a.filter((_, i) => i !== index)),
    },
    isValid: title.trim().length > 0,
    toDraft,
  };
}

export type TaskForm = ReturnType<typeof useTaskForm>;
