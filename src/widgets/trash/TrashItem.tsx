import type { Task } from '../../domain/task/task';
import { RestoreIcon, TrashIcon } from '../../shared/icons/Icons';
import { Button } from '../../shared/ui';

/** Élément de la corbeille : une tâche, ou une note (titre + début du texte). */
export function TrashItem({ task, onRestore, onPurge }: { task: Pick<Task, 'title' | 'comment' | 'updated_at'>; onRestore: () => void; onPurge: () => void }) {
  return (
    <div className="hoverable" style={{
      padding: '12px 16px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0, opacity: 0.75 }}>
        <div style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </div>
        {task.comment && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{task.comment}</div>}
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3, opacity: 0.7 }}>
          Mise à la corbeille le {new Date(task.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
      <Button size="sm" icon={<RestoreIcon size={12} />} onClick={onRestore}>Restaurer</Button>
      <Button size="sm" variant="danger" icon={<TrashIcon size={12} />} onClick={onPurge}>Supprimer</Button>
    </div>
  );
}
