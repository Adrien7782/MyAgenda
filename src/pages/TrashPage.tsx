import { useState } from 'react';
import { TrashIcon } from '../shared/icons/Icons';
import { Badge, Button, EmptyState, PageHeader, SectionTitle } from '../shared/ui';
import { useDeletedTasks, useTaskStore } from '../store/taskStore';
import { useDeletedNotes, useNoteStore } from '../store/noteStore';
import { displayTitle, notePreview } from '../domain/note/note';
import { TrashItem } from '../widgets/trash/TrashItem';

export function TrashPage() {
  const deletedTasks = useDeletedTasks();
  const deletedNotes = useDeletedNotes();
  const { restore, purge, emptyTrash } = useTaskStore();
  const notes = useNoteStore();
  const deleted = { length: deletedTasks.length + deletedNotes.length };
  async function emptyAll() {
    await emptyTrash();
    for (const n of deletedNotes) await notes.purge(n.id);
  }
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  return (
    <div className="dot-grid" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>Corbeille {deleted.length > 0 && <Badge color="var(--danger)">{deleted.length}</Badge>}</span>}
        actions={deleted.length > 0 && (confirmEmpty ? (
          <>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Supprimer définitivement {deleted.length} élément(s) ?</span>
            <Button size="sm" variant="danger" onClick={() => { void emptyAll(); setConfirmEmpty(false); }}>Vider</Button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {deletedTasks.length > 0 && (
              <section>
                {deletedNotes.length > 0 && <SectionTitle>Tâches</SectionTitle>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {deletedTasks.map((t) => <TrashItem key={t.id} task={t} onRestore={() => restore(t.id)} onPurge={() => purge(t.id)} />)}
                </div>
              </section>
            )}
            {deletedNotes.length > 0 && (
              <section>
                <SectionTitle>Notes</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {deletedNotes.map((n) => (
                    <TrashItem key={n.id} task={{ title: displayTitle(n), comment: notePreview(n, 120), updated_at: n.updated_at }}
                      onRestore={() => void notes.restore(n.id)} onPurge={() => void notes.purge(n.id)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
