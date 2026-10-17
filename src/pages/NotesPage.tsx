import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchesNote, type Note } from '../domain/note/note';
import { NoteIcon, PlusIcon, SearchIcon, XIcon } from '../shared/icons/Icons';
import { Badge, Button, EmptyState, IconButton, PageHeader, SearchInput, SectionTitle } from '../shared/ui';
import { usePhoneLayout } from '../shared/hooks/usePhoneLayout';
import { useActiveNotes, useNoteStore } from '../store/noteStore';
import { NoteCard } from '../widgets/notes/NoteCard';
import { exportNote } from '../widgets/notes/noteActions';

/** Page Notes : toutes les notes, recherche, création ; une note s'ouvre en pleine page. */
export function NotesPage() {
  const phone = usePhoneLayout();
  const navigate = useNavigate();
  const notes = useActiveNotes();
  const { create, togglePin, moveToTrash, restore } = useNoteStore();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; undoId?: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const shown = useMemo(() => notes.filter((n) => matchesNote(n, query)), [notes, query]);
  const pinned = shown.filter((n) => n.is_pinned === 1);
  const others = shown.filter((n) => n.is_pinned !== 1);

  function say(text: string, undoId?: string) {
    clearTimeout(toastTimer.current);
    setToast({ text, undoId });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  async function newNote() {
    const id = await create();
    navigate(`/notes/${id}`);
  }

  async function trash(note: Note) {
    await moveToTrash(note.id);
    say('Note mise à la corbeille', note.id);
  }

  async function download(note: Note) {
    const msg = await exportNote(note);
    if (msg) say(msg);
  }

  const grid = (list: Note[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: phone ? '1fr 1fr' : 'repeat(auto-fill, minmax(230px, 1fr))', gap: phone ? 10 : 12 }}>
      {list.map((n) => (
        <NoteCard key={n.id} note={n} onOpen={() => navigate(`/notes/${n.id}`)} onTogglePin={() => void togglePin(n.id)}
          onExport={() => void download(n)} onTrash={() => void trash(n)} />
      ))}
    </div>
  );

  return (
    <div className="dot-grid" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>Notes {notes.length > 0 && <Badge color="var(--accent)">{notes.length}</Badge>}</span>}
        actions={phone ? (
          <IconButton label={searchOpen ? 'Fermer la recherche' : 'Rechercher'} size={34} onClick={() => { setSearchOpen(!searchOpen); setQuery(''); }}>
            {searchOpen ? <XIcon size={16} /> : <SearchIcon size={16} />}
          </IconButton>
        ) : (
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Rechercher dans les notes…" width={240} />
            <Button variant="primary" icon={<PlusIcon size={14} />} onClick={() => void newNote()}>Nouvelle note</Button>
          </>
        )}
      >
        {phone && searchOpen ? <div style={{ flex: 1, display: 'flex' }}><SearchInput value={query} onChange={setQuery} placeholder="Rechercher dans les notes…" width={10000} /></div> : undefined}
      </PageHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: phone ? '14px 12px 96px' : '18px 24px 28px' }}>
        {notes.length === 0 ? (
          <EmptyState icon={<NoteIcon size={44} />} message="Aucune note pour l'instant">
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', maxWidth: 320, textAlign: 'center', lineHeight: 1.6 }}>
              Une idée, une liste, quelque chose à ne pas oublier ? Écris-le ici : tout est enregistré automatiquement.
            </p>
            {!phone && <Button variant="primary" icon={<PlusIcon size={14} />} onClick={() => void newNote()}>Créer une note</Button>}
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState icon={<SearchIcon size={40} />} message={`Aucune note ne contient « ${query.trim()} »`} />
        ) : pinned.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section><SectionTitle>Épinglées</SectionTitle>{grid(pinned)}</section>
            {others.length > 0 && <section><SectionTitle>Autres notes</SectionTitle>{grid(others)}</section>}
          </div>
        ) : grid(others)}
      </div>

      {phone && (
        <button type="button" className="fab" aria-label="Nouvelle note" onClick={() => void newNote()}>
          <PlusIcon size={24} />
        </button>
      )}

      {toast && (
        <div role="status" className="fade-in" style={{
          position: 'absolute', left: '50%', bottom: phone ? 84 : 24, transform: 'translateX(-50%)', zIndex: 30,
          display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px 9px 16px', borderRadius: 10, maxWidth: 'calc(100% - 32px)',
          background: 'var(--surface-el)', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,.35)', fontSize: 'var(--text-sm)',
        }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toast.text}</span>
          {toast.undoId && (
            <Button size="sm" variant="ghost" onClick={() => { void restore(toast.undoId!); setToast(null); }}>Annuler</Button>
          )}
        </div>
      )}
    </div>
  );
}
