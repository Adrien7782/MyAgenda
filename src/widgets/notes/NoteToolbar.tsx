import type { Editor } from '@tiptap/react';
import type { ReactNode } from 'react';
import {
  HighlightIcon, ListBulletIcon, ListCheckIcon, ListNumberIcon, QuoteIcon, RedoIcon, UndoIcon,
} from '../../shared/icons/Icons';

function Tool({ label, active, disabled, onClick, children, wide }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode; wide?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Garder le curseur dans le texte (sinon le bouton prend le focus et la sélection est perdue).
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="note-tool"
      style={{
        minWidth: wide ? 40 : 32, height: 32, padding: '0 7px', borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        background: active ? 'var(--accent-bg)' : 'transparent',
        opacity: disabled ? 0.35 : 1,
      }}
    >{children}</button>
  );
}

const Sep = () => <span aria-hidden style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />;

/** Barre de mise en forme : titres, gras, italique, souligné, barré, surligné, listes, citation. */
export function NoteToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const c = () => editor.chain().focus();
  return (
    <div role="toolbar" aria-label="Mise en forme" className="h-scroll" style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 0' }}>
      <Tool label="Annuler" disabled={!editor.can().undo()} onClick={() => c().undo().run()}><UndoIcon size={15} /></Tool>
      <Tool label="Rétablir" disabled={!editor.can().redo()} onClick={() => c().redo().run()}><RedoIcon size={15} /></Tool>
      <Sep />
      <Tool label="Titre" wide active={editor.isActive('heading', { level: 1 })} onClick={() => c().toggleHeading({ level: 1 }).run()}><b>T1</b></Tool>
      <Tool label="Sous-titre" wide active={editor.isActive('heading', { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}><b>T2</b></Tool>
      <Sep />
      <Tool label="Gras (Ctrl+B)" active={editor.isActive('bold')} onClick={() => c().toggleBold().run()}><b style={{ fontSize: 15 }}>G</b></Tool>
      <Tool label="Italique (Ctrl+I)" active={editor.isActive('italic')} onClick={() => c().toggleItalic().run()}><i style={{ fontSize: 15, fontFamily: 'Georgia, serif' }}>I</i></Tool>
      <Tool label="Souligné (Ctrl+U)" active={editor.isActive('underline')} onClick={() => c().toggleUnderline().run()}><u style={{ fontSize: 15 }}>S</u></Tool>
      <Tool label="Barré" active={editor.isActive('strike')} onClick={() => c().toggleStrike().run()}><s style={{ fontSize: 15 }}>B</s></Tool>
      <Tool label="Surligner" active={editor.isActive('highlight')} onClick={() => c().toggleHighlight().run()}><HighlightIcon size={15} /></Tool>
      <Sep />
      <Tool label="Liste à puces" active={editor.isActive('bulletList')} onClick={() => c().toggleBulletList().run()}><ListBulletIcon size={16} /></Tool>
      <Tool label="Liste numérotée" active={editor.isActive('orderedList')} onClick={() => c().toggleOrderedList().run()}><ListNumberIcon size={16} /></Tool>
      <Tool label="Liste à cocher" active={editor.isActive('taskList')} onClick={() => c().toggleTaskList().run()}><ListCheckIcon size={16} /></Tool>
      <Tool label="Citation" active={editor.isActive('blockquote')} onClick={() => c().toggleBlockquote().run()}><QuoteIcon size={15} /></Tool>
      <Tool label="Effacer la mise en forme" onClick={() => c().unsetAllMarks().clearNodes().run()}><span style={{ fontSize: 12, textDecoration: 'line-through', opacity: 0.8 }}>Aa</span></Tool>
    </div>
  );
}
