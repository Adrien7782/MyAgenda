import { useMemo } from 'react';
import { nextStatus } from '../../domain/task/taskRules';
import { useTaskStore } from '../../store/taskStore';
import { useUiStore } from '../../store/uiStore';
import type { TaskCardActions } from './TaskCard';

/** Branche les actions d'une carte de tâche sur le store (évite de les redéclarer partout). */
export function useTaskCardActions(): Omit<TaskCardActions, 'onShowOverdueActions'> {
  const setStatus = useTaskStore((s) => s.setStatus);
  const moveToTrash = useTaskStore((s) => s.moveToTrash);
  const openTaskModal = useUiStore((s) => s.openTaskModal);

  return useMemo(() => ({
    onToggleDone: (t) => setStatus(t.id, t.status === 'done' ? 'todo' : 'done'),
    onCycleStatus: (t) => setStatus(t.id, nextStatus(t.status)),
    onEdit: (t) => openTaskModal({ taskId: t.id }),
    onDelete: (t) => moveToTrash(t.id),
  }), [setStatus, moveToTrash, openTaskModal]);
}
