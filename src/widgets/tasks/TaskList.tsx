import { useState } from 'react';
import type { Task } from '../../domain/task/task';
import { CheckSquareIcon } from '../../shared/icons/Icons';
import { EmptyState } from '../../shared/ui';
import { useTaskStore } from '../../store/taskStore';
import { useUiStore } from '../../store/uiStore';
import { TaskCard } from './TaskCard';
import { OverdueActionsCard } from './OverdueActionsCard';
import { useTaskCardActions } from './useTaskCardActions';

/** Vue liste. Les tâches en retard peuvent se déplier pour proposer snooze / reprogrammer / terminer. */
export function TaskList({ tasks }: { tasks: Task[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const actions = useTaskCardActions();
  const snooze = useTaskStore((s) => s.snooze);
  const setStatus = useTaskStore((s) => s.setStatus);
  const openTaskModal = useUiStore((s) => s.openTaskModal);

  if (tasks.length === 0) {
    return <EmptyState icon={<CheckSquareIcon size={44} />} message="Aucune tâche dans cette catégorie" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 2px' }}>
      {tasks.map((task) => (
        <div key={task.id} style={{ opacity: expandedId && expandedId !== task.id ? 0.4 : 1, transition: 'opacity .2s' }}>
          {expandedId === task.id ? (
            <OverdueActionsCard
              task={task}
              onClose={() => setExpandedId(null)}
              onSnooze={() => { void snooze(task.id, 15); setExpandedId(null); }}
              onReschedule={() => { openTaskModal({ taskId: task.id }); setExpandedId(null); }}
              onComplete={() => { void setStatus(task.id, 'done'); setExpandedId(null); }}
            />
          ) : (
            <TaskCard task={task} {...actions} onShowOverdueActions={(t) => setExpandedId(t.id)} />
          )}
        </div>
      ))}
    </div>
  );
}
