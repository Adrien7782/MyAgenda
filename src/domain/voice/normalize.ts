/** Mise en forme commune pour comparer des mots : minuscules, sans accents ni ponctuation. */
export function norm(word: string): string {
  return word
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
}

/**
 * Découpe en mots « comparables » : « crée-moi » → « cree », « moi » ; « l'écoute » → « l », « ecoute » ;
 * « 14h30 » reste un seul mot. Chaque morceau garde l'indice du mot reconnu d'origine.
 */
export function splitWords(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\s+/)) {
    // « crée-moi » → « crée », « moi » (mais « 25-10 » reste entier)
    for (const part of /[a-zà-ÿ]-[a-zà-ÿ]/i.test(raw) ? raw.split('-') : [raw]) {
      // « l'écoute » → « l », « écoute » (une seule lettre avant l'apostrophe)
      const m = /^([a-zà-ÿ])['’](.+)$/i.exec(part);
      for (const piece of m ? [m[1], m[2]] : [part]) {
        const n = norm(piece);
        if (n) out.push(n);
      }
    }
  }
  return out;
}

/** Supprime la ponctuation qui entoure un champ dicté (« : courses du week-end. » → « courses du week-end »). */
export function trimField(text: string): string {
  return text
    .replace(/^[\s:;,.\-–—!?]+/, '')
    .replace(/[\s:;,\-–—]+$/, '')
    .replace(/\s*\.+$/, '')
    .trim();
}

export function capitalize(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1) : text;
}
