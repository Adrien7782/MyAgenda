import type { Task } from '../../domain/task/task';
import { Dot } from '../../shared/ui';
import { formatRelativeDeadline, PRIORITY_COLOR, STATUS_COLOR } from '../../shared/presentation/taskPresentation';
import { useUiStore } from '../../store/uiStore';

export function UpcomingList({ tasks }: { tasks: Task[] }) {
  const openTaskModal = useUiStore((s) => s.openTaskModal);
  if (tasks.length === 0) {
    return <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Rien à l'horizon 🎉</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {tasks.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => openTaskModal({ taskId: t.id })}
          className="ui-btn--ghost"
          style={{ display: 'flex', gap: 8, alignItems: 'flex-start', textAlign: 'left', padding: '6px 6px', borderRadius: 8, margin: '0 -6px' }}
        >
          <span style={{ marginTop: 5 }}><Dot color={t.priority ? PRIORITY_COLOR[t.priority] : STATUS_COLOR[t.status]} /></span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.title}
            </span>
            <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{formatRelativeDeadline(t.deadline!)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
