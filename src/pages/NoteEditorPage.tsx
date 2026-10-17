import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { NotePatch } from '../domain/note/note';
import { PASTEL_PALETTE } from '../domain/event/eventColors';
import { ChevronLeftIcon, CopyIcon, DownloadIcon, NoteIcon, PinIcon, ShareIcon, TrashIcon } from '../shared/icons/Icons';
import { Button, ColorPicker, EmptyState, IconButton } from '../shared/ui';
import { IS_TOUCH } from '../shared/device';
import { usePhoneLayout } from '../shared/hooks/usePhoneLayout';
import { useNoteStore } from '../store/noteStore';
import { NoteEditor } from '../widgets/notes/NoteEditor';
import { copyNote, exportNote } from '../widgets/notes/noteActions';

let openNoteId: string | null = null;

/** Une note ouverte en pleine page (éditeur chargé à la demande : voir App.tsx). */
export default function NoteEditorPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const phone = usePhoneLayout();
  const note = useNoteStore((s) => s.notes.find((n) => n.id === id && n.is_deleted === 0));
  const loaded = useNoteStore((s) => s.loaded);
  const { update, togglePin, moveToTrash, discardIfEmpty } = useNoteStore();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Dernier enregistrement en cours (l'éditeur enregistre aussi en se fermant).
  const lastSave = useRef<Promise<void>>(Promise.resolve());

  // En quittant une note restée vide, elle disparaît (pas de « Sans titre » vides dans la liste).
  useEffect(() => {
    openNoteId = id;
    return () => {
      openNoteId = null;
      setTimeout(() => {
        if (openNoteId === id) return; // simple remontage (mode développement), pas une fermeture
        void lastSave.current.finally(() => discardIfEmpty(id));
      }, 0);
    };
  }, [id, discardIfEmpty]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  const save = useCallback((patch: NotePatch) => {
    const p = update(id, patch);
    lastSave.current = p.catch(() => undefined);
    return p;
  }, [id, update]);

  if (!note) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loaded && (
          <EmptyState icon={<NoteIcon size={44} />} message="Cette note n'existe plus (supprimée sur un autre appareil ?)">
            <Button onClick={() => navigate('/notes')}>Retour aux notes</Button>
          </EmptyState>
        )}
      </div>
    );
  }

  const back = () => navigate('/notes');
  const status = saving ? 'Enregistrement…' : 'Enregistré';

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <header style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: phone ? 4 : 8, borderBottom: '1px solid var(--border)',
        padding: phone ? '6px 8px' : '10px 20px', background: 'var(--bg)',
      }}>
        <Button variant="ghost" size="sm" icon={<ChevronLeftIcon size={16} />} onClick={back}>Notes</Button>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 4, whiteSpace: 'nowrap' }} aria-live="polite">{status}</span>
        <div style={{ flex: 1 }} />
        {!phone && (
          <div style={{ width: 190 }}>
            <ColorPicker value={note.color} onChange={(c) => void update(note.id, { color: c })} palette={PASTEL_PALETTE} defaultColor="var(--border)" defaultLabel="Sans couleur" />
          </div>
        )}
        <IconButton label={note.is_pinned ? 'Désépingler' : 'Épingler en haut de la liste'} size={34} aria-pressed={note.is_pinned === 1}
          onClick={() => void togglePin(note.id)} style={note.is_pinned ? { color: 'var(--accent)' } : undefined}>
          <PinIcon size={16} />
        </IconButton>
        <IconButton label="Copier le texte" size={34} onClick={() => void copyNote(note).then(setMessage)}><CopyIcon size={16} /></IconButton>
        <IconButton label={IS_TOUCH ? 'Partager / enregistrer en .txt' : 'Télécharger en .txt'} size={34}
          onClick={() => void exportNote(note).then((m) => m && setMessage(m))}>
          {IS_TOUCH ? <ShareIcon size={16} /> : <DownloadIcon size={16} />}
        </IconButton>
        <IconButton label="Mettre à la corbeille" size={34} variant="danger" onClick={() => { void moveToTrash(note.id); back(); }}><TrashIcon size={16} /></IconButton>
      </header>
      {phone && (
        <div style={{ flexShrink: 0, padding: '6px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Couleur</span>
          <div style={{ flex: 1 }}>
            <ColorPicker value={note.color} onChange={(c) => void update(note.id, { color: c })} palette={PASTEL_PALETTE} defaultColor="var(--border)" defaultLabel="Sans couleur" />
          </div>
        </div>
      )}
      <NoteEditor key={note.id} note={note} phone={phone} onSave={save} onSavingChange={setSaving} />
      {message && (
        <div role="status" className="fade-in" style={{
          position: 'absolute', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 30, padding: '9px 16px', borderRadius: 10,
          background: 'var(--surface-el)', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,.35)', fontSize: 'var(--text-sm)',
          maxWidth: 'calc(100% - 32px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{message}</div>
      )}
    </div>
  );
}
