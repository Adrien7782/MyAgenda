import { displayTitle, notePreview, type Note } from '../../domain/note/note';
import { formatUpdated } from '../../shared/presentation/notePresentation';
import { DownloadIcon, PinIcon, TrashIcon } from '../../shared/icons/Icons';
import { IconButton } from '../../shared/ui';

/** Carte d'une note dans la liste : titre, début du texte, date de modification. */
export function NoteCard({ note, onOpen, onTogglePin, onExport, onTrash }: {
  note: Note;
  onOpen: () => void;
  onTogglePin: () => void;
  onExport: () => void;
  onTrash: () => void;
}) {
  const preview = notePreview(note, 220);
  const color = note.color ?? 'var(--border)';
  return (
    <div
      role="button"
      tabIndex={0}
      className="hoverable note-card"
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 112, padding: '12px 14px 10px',
        borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        background: note.color ? `color-mix(in srgb, ${note.color} 10%, var(--surface))` : 'var(--surface)',
        border: '1px solid var(--border)', borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{
          flex: 1, minWidth: 0, fontSize: 'var(--text-sm)', fontWeight: 650, color: 'var(--text)', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word',
        }}>{displayTitle(note)}</div>
        {note.is_pinned === 1 && <span title="Épinglée" style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}><PinIcon size={13} /></span>}
      </div>
      <div style={{
        flex: 1, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5,
        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word',
      }}>{preview || <i style={{ opacity: 0.7 }}>Note vide</i>}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 22 }}>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', opacity: 0.85 }}>{formatUpdated(note.updated_at)}</span>
        <div className="hover-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 3 }} onClick={(e) => e.stopPropagation()}>
          <IconButton label={note.is_pinned ? 'Désépingler' : 'Épingler'} size={24} onClick={onTogglePin}><PinIcon size={12} /></IconButton>
          <IconButton label="Télécharger en .txt" size={24} onClick={onExport}><DownloadIcon size={12} /></IconButton>
          <IconButton label="Mettre à la corbeille" size={24} variant="danger" onClick={onTrash}><TrashIcon size={12} /></IconButton>
        </div>
      </div>
    </div>
  );
}
