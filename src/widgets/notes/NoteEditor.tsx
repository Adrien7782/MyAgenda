import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { noteToPlainText, type Note, type NotePatch } from '../../domain/note/note';
import { countWords, formatUpdatedLong } from '../../shared/presentation/notePresentation';
import { NoteToolbar } from './NoteToolbar';

const SAVE_DELAY_MS = 500;

/**
 * Éditeur d'une note : titre + texte mis en forme. Enregistrement automatique pendant la frappe
 * (et immédiatement en quittant la note). Une modification arrivée d'un autre appareil remplace
 * le texte affiché seulement si on n'est pas en train d'écrire.
 */
export function NoteEditor({ note, phone, onSave, onSavingChange }: {
  note: Note;
  phone: boolean;
  onSave: (patch: NotePatch) => Promise<void>;
  onSavingChange?: (saving: boolean) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const pending = useRef<NotePatch>({});
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [, setTick] = useState(0);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    onSavingChange?.(true);
    try { await onSave(patch); } finally { onSavingChange?.(false); }
  }, [onSave, onSavingChange]);

  const schedule = useCallback((patch: NotePatch) => {
    pending.current = { ...pending.current, ...patch };
    onSavingChange?.(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [flush, onSavingChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Écris ici…' }),
    ],
    content: note.content,
    editorProps: { attributes: { class: 'note-editor', spellcheck: 'true', 'aria-label': 'Texte de la note' } },
    onUpdate: ({ editor: e }) => {
      schedule({ content: e.getHTML() });
      setTick((t) => t + 1);
    },
  });

  // Quitter la note (ou fermer l'onglet / l'application) : on enregistre tout de suite.
  useEffect(() => {
    const save = () => void flush();
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', save);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', save);
      void flush();
    };
  }, [flush]);

  // Modification venue d'un autre appareil (synchronisation) pendant que la note est ouverte.
  useEffect(() => {
    if (!editor || Object.keys(pending.current).length) return;
    if (!editor.isFocused && note.content !== editor.getHTML()) editor.commands.setContent(note.content, false);
    if (document.activeElement !== titleRef.current && note.title !== title) setTitle(note.title);
  }, [note.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nouvelle note : le curseur est dans le titre.
  useEffect(() => {
    if (!note.title && !noteToPlainText(note.content).trim()) setTimeout(() => titleRef.current?.focus(), 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Le titre s'agrandit sur plusieurs lignes si besoin.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const words = editor ? countWords(editor.getText()) : 0;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg)',
        padding: phone ? '0 8px' : '0 20px',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}><NoteToolbar editor={editor} /></div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', cursor: 'text' }} onClick={(e) => { if (e.target === e.currentTarget) editor?.commands.focus('end'); }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: phone ? '18px 16px 120px' : '32px 40px 120px' }}>
          <textarea
            ref={titleRef}
            rows={1}
            value={title}
            placeholder="Titre"
            aria-label="Titre de la note"
            onChange={(e) => { const v = e.target.value.replace(/\n/g, ' '); setTitle(v); schedule({ title: v }); }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || !editor) return;
              // Entrée dans le titre : on passe au texte, tout de suite (pas de frappe perdue entre les deux).
              e.preventDefault();
              editor.chain().setTextSelection(1).run();
              editor.view.focus();
            }}
            className="note-title"
            style={{
              width: '100%', resize: 'none', border: 'none', outline: 'none', background: 'transparent', overflow: 'hidden',
              fontSize: phone ? 24 : 28, fontWeight: 700, lineHeight: 1.25, color: 'var(--text)', padding: 0, marginBottom: 12,
              fontFamily: 'inherit',
            }}
          />
          <EditorContent editor={editor} />
          <div style={{ marginTop: 28, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', opacity: 0.8 }}>
            Modifiée le {formatUpdatedLong(note.updated_at)} · {words} mot{words > 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
