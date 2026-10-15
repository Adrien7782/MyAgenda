import { useRef } from 'react';
import { PaperclipIcon, PlusIcon, TrashIcon } from '../../../shared/icons/Icons';
import { IconButton } from '../../../shared/ui';
import { formatFileSize } from '../../../shared/presentation/taskPresentation';
import type { TaskForm } from './useTaskForm';

function Row({ name, size, onRemove }: { name: string; size: number | null; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--surface-el)', border: '1px solid var(--border)' }}>
      <PaperclipIcon size={13} color="var(--text-muted)" />
      <span style={{ flex: 1, fontSize: 'var(--text-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      {size !== null && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatFileSize(size)}</span>}
      <IconButton label="Retirer" variant="danger" size={20} onClick={onRemove}><TrashIcon size={10} /></IconButton>
    </div>
  );
}

/** Pièces jointes (seules les métadonnées sont enregistrées pour l'instant). */
export function AttachmentEditor({ attachments }: { attachments: TaskForm['attachments'] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {attachments.existing.map((a) => (
        <Row key={a.id} name={a.file_name} size={a.file_size} onRemove={() => attachments.removeExisting(a.id)} />
      ))}
      {attachments.added.map((a, i) => (
        <Row key={`new-${i}`} name={a.file_name} size={a.file_size} onRemove={() => attachments.removeAdded(i)} />
      ))}
      <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
        onChange={(e) => { attachments.add(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      <button type="button" onClick={() => inputRef.current?.click()} className="ui-btn ui-btn--secondary ui-btn--sm"
        style={{ borderStyle: 'dashed', justifyContent: 'flex-start', width: '100%', padding: '8px 12px' }}>
        <PlusIcon size={12} /> Ajouter une pièce jointe
      </button>
    </div>
  );
}
