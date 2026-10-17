/**
 * Notes : pages de texte libres (idées, choses à se rappeler).
 * Le contenu est du HTML simple produit par l'éditeur (paragraphes, titres, listes, cases à cocher,
 * gras/italique…). Pour l'export .txt et les aperçus, il est converti en texte brut lisible.
 */

export interface Note {
  id: string;
  title: string;
  /** HTML de l'éditeur. */
  content: string;
  /** Couleur d'étiquette (palette des évènements), null = aucune. */
  color: string | null;
  /** 1 = épinglée en haut de la liste. */
  is_pinned: number;
  /** 0 active · 1 corbeille · 2 supprimée définitivement (pierre tombale pour la synchronisation). */
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export type NotePatch = Partial<Pick<Note, 'title' | 'content' | 'color' | 'is_pinned'>>;

// ── HTML → texte brut ───────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/**
 * Texte brut de la note, mis en forme pour un fichier .txt :
 * titres soulignés, puces « • », listes numérotées, cases « [ ] » / « [x] », citations « > ».
 */
export function noteToPlainText(html: string): string {
  const out: string[] = [];
  let line = '';
  const lists: { ordered: boolean; n: number; task: boolean }[] = [];
  let quote = 0;
  let heading = 0;
  /** Puce (« • », « 1. », « [ ] ») à placer devant le prochain texte de l'élément de liste. */
  let bullet = '';

  const flush = (force = false) => {
    if (line.trim() || force) {
      const prefix = quote ? '> '.repeat(quote) : '';
      out.push(prefix + line.replace(/[ \t]+$/g, ''));
      if (heading === 1) out.push('='.repeat(Math.max(3, line.trim().length)));
      if (heading === 2) out.push('-'.repeat(Math.max(3, line.trim().length)));
    }
    line = '';
  };
  const blank = () => { if (out.length && out[out.length - 1] !== '') out.push(''); };

  const re = /<\/?([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[3] !== undefined) {
      const text = decode(m[3]).replace(/\s+/g, ' ');
      if (!text.trim() && !line) continue;
      if (!line && bullet) { line = bullet; bullet = ''; }
      line += text;
      continue;
    }
    const closing = m[0][1] === '/';
    const tag = m[1].toLowerCase();
    const attrs = m[2] ?? '';
    switch (tag) {
      case 'p': case 'div': case 'pre':
        if (closing) { flush(); if (!lists.length) blank(); }
        else if (line.trim()) flush();
        break;
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        if (closing) { flush(); heading = 0; blank(); }
        else { flush(); blank(); heading = Number(tag[1]); }
        break;
      case 'br': flush(true); break;
      case 'hr': flush(); blank(); out.push('----------'); blank(); break;
      case 'blockquote':
        if (closing) { flush(); quote = Math.max(0, quote - 1); blank(); } else { flush(); quote++; }
        break;
      case 'ul': case 'ol':
        if (closing) { flush(); lists.pop(); if (!lists.length) blank(); }
        else { flush(); lists.push({ ordered: tag === 'ol', n: Number(/start="(\d+)"/.exec(attrs)?.[1] ?? 1), task: /data-type="taskList"/i.test(attrs) }); }
        break;
      case 'li': {
        if (closing) { flush(); break; }
        flush();
        const list = lists[lists.length - 1];
        const indent = '  '.repeat(Math.max(0, lists.length - 1));
        if (list?.task || /data-checked=/i.test(attrs)) bullet = `${indent}[${/data-checked="true"/i.test(attrs) ? 'x' : ' '}] `;
        else if (list?.ordered) bullet = `${indent}${list.n++}. `;
        else bullet = `${indent}• `;
        break;
      }
      // Case à cocher de l'éditeur : déjà traduite par « [x] ».
      case 'input': case 'label': break;
      default: break;
    }
  }
  flush();
  while (out.length && out[out.length - 1] === '') out.pop();
  while (out.length && out[0] === '') out.shift();
  // Pas plus d'une ligne vide d'affilée.
  return out.filter((l, i) => !(l === '' && out[i - 1] === '')).join('\n');
}

/** Titre affiché : le titre, sinon la première ligne du texte. */
export function displayTitle(note: Pick<Note, 'title' | 'content'>): string {
  if (note.title.trim()) return note.title.trim();
  const first = noteToPlainText(note.content).split('\n').find((l) => l.trim());
  return first ? first.replace(/^(\[[ x]\]|•|\d+\.|>)\s*/, '').slice(0, 80) : 'Sans titre';
}

/** Aperçu de quelques lignes pour la liste des notes. */
export function notePreview(note: Pick<Note, 'title' | 'content'>, maxChars = 160): string {
  const lines = noteToPlainText(note.content).split('\n').filter((l) => l.trim() && !/^[=-]{3,}$/.test(l));
  // Pas de titre : la 1re ligne sert déjà de titre.
  const body = note.title.trim() ? lines : lines.slice(1);
  const text = body.map((l) => l.replace(/^(\s*)\[x\] /, '$1☑ ').replace(/^(\s*)\[ \] /, '$1☐ ')).join(' · ');
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

export function isEmptyNote(note: Pick<Note, 'title' | 'content'>): boolean {
  return !note.title.trim() && !noteToPlainText(note.content).trim();
}

/** Contenu du fichier .txt : titre, ligne de séparation, texte. */
export function noteToTxt(note: Pick<Note, 'title' | 'content' | 'updated_at'>): string {
  const title = displayTitle(note);
  const body = noteToPlainText(note.content);
  // CRLF : s'ouvre proprement dans le Bloc-notes de Windows comme sur Mac / téléphone.
  return [title, '='.repeat(Math.min(60, Math.max(3, title.length))), '', body, ''].join('\n').replace(/\n/g, '\r\n');
}

/** Nom de fichier sûr sur Windows, Mac, Android et iPhone. */
export function noteFileName(note: Pick<Note, 'title' | 'content'>): string {
  const base = displayTitle(note)
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 60);
  return `${base || 'Note'}.txt`;
}

/** Épinglées d'abord, puis les plus récemment modifiées. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.is_pinned - a.is_pinned || b.updated_at.localeCompare(a.updated_at));
}

export function matchesNote(note: Note, query: string): boolean {
  const q = query.trim().toLocaleLowerCase('fr-FR');
  if (!q) return true;
  return `${note.title}\n${noteToPlainText(note.content)}`.toLocaleLowerCase('fr-FR').includes(q);
}
