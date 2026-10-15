import { useState } from 'react';
import { TrashIcon } from '../shared/icons/Icons';
import { Badge, Button, EmptyState, PageHeader } from '../shared/ui';
import { useDeletedTasks, useTaskStore } from '../store/taskStore';
import { TrashItem } from '../widgets/trash/TrashItem';

export function TrashPage() {
  const deleted = useDeletedTasks();
  const { restore, purge, emptyTrash } = useTaskStore();
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  return (
    <div className="dot-grid" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>Corbeille {deleted.length > 0 && <Badge color="var(--danger)">{deleted.length}</Badge>}</span>}
        actions={deleted.length > 0 && (confirmEmpty ? (
          <>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Supprimer définitivement {deleted.length} tâche(s) ?</span>
            <Button size="sm" variant="danger" onClick={() => { void emptyTrash(); setConfirmEmpty(false); }}>Vider</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmEmpty(false)}>Annuler</Button>
          </>
        ) : (
          <Button size="sm" variant="danger" icon={<TrashIcon size={12} />} onClick={() => setConfirmEmpty(true)}>Vider la corbeille</Button>
        ))}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {deleted.length === 0 ? (
          <EmptyState icon={<TrashIcon size={44} />} message="La corbeille est vide" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deleted.map((t) => <TrashItem key={t.id} task={t} onRestore={() => restore(t.id)} onPurge={() => purge(t.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}
