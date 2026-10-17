import { describe, expect, it } from 'vitest';
import { displayTitle, matchesNote, noteFileName, notePreview, noteToPlainText, noteToTxt, sortNotes, type Note } from '../note/note';

const note = (p: Partial<Note>): Note => ({ id: 'n', title: '', content: '', color: null, is_pinned: 0, is_deleted: 0, created_at: '', updated_at: '2026-10-17T10:00:00Z', ...p });

describe('notes', () => {
  it('texte brut : titres, listes, cases à cocher, citations, entités', () => {
    const html = '<h1>Courses</h1><p>Pour <strong>samedi</strong> &amp; dimanche</p>'
      + '<ul><li><p>Pain</p></li><li><p>Lait</p><ul><li><p>demi-écrémé</p></li></ul></li></ul>'
      + '<ol><li><p>Un</p></li><li><p>Deux</p></li></ol>'
      + '<ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Banque</p></div></li>'
      + '<li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Poste</p></div></li></ul>'
      + '<blockquote><p>Ne pas oublier</p></blockquote><p>Fin<br>ligne 2</p>';
    expect(noteToPlainText(html)).toBe([
      'Courses', '=======', '',
      'Pour samedi & dimanche', '',
      '• Pain', '• Lait', '  • demi-écrémé', '',
      '1. Un', '2. Deux', '',
      '[x] Banque', '[ ] Poste', '',
      '> Ne pas oublier', '',
      'Fin', 'ligne 2',
    ].join('\n'));
  });

  it('titre de secours, aperçu, recherche', () => {
    const n = note({ content: '<p>Idée de cadeau</p><p>Un livre sur les volcans</p>' });
    expect(displayTitle(n)).toBe('Idée de cadeau');
    expect(notePreview(n)).toBe('Un livre sur les volcans');
    expect(displayTitle(note({}))).toBe('Sans titre');
    expect(matchesNote(n, 'VOLCAN')).toBe(true);
    expect(matchesNote(n, 'plage')).toBe(false);
  });

  it('export .txt et nom de fichier sûr', () => {
    const n = note({ title: 'Plan: été 2027 / Italie?', content: '<p>Rome</p>' });
    expect(noteFileName(n)).toBe('Plan été 2027 Italie.txt');
    expect(noteToTxt(n)).toBe('Plan: été 2027 / Italie?\r\n========================\r\n\r\nRome\r\n');
    expect(noteFileName(note({}))).toBe('Sans titre.txt');
  });

  it('épinglées en premier, puis les plus récentes', () => {
    const list = sortNotes([
      note({ id: 'a', updated_at: '2026-10-01' }),
      note({ id: 'b', updated_at: '2026-10-10' }),
      note({ id: 'c', updated_at: '2026-09-01', is_pinned: 1 }),
    ]);
    expect(list.map((n) => n.id)).toEqual(['c', 'b', 'a']);
  });
});
