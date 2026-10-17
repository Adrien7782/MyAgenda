/**
 * Couleurs par "type" d'évènement : tous les évènements portant le même titre
 * (ex. les 34 séances de « CM Réseaux ») partagent une couleur.
 * La règle est indexée par titre normalisé : elle survit aux ré-imports .ics.
 */

export type EventColorRules = Record<string, string>;

/** Pastels doux, choisis pour rester lisibles sans "crier" sur les thèmes sombres (Bleu Neon). */
export const PASTEL_PALETTE: { name: string; hex: string }[] = [
  { name: 'Lavande', hex: '#B4B8F8' },
  { name: 'Bleu ciel', hex: '#9CC8F5' },
  { name: 'Lagon', hex: '#8EDDE0' },
  { name: 'Menthe', hex: '#9FE0C0' },
  { name: 'Sauge', hex: '#B9D99A' },
  { name: 'Citron', hex: '#E8DE9A' },
  { name: 'Pêche', hex: '#F4C29C' },
  { name: 'Corail', hex: '#F2A7A0' },
  { name: 'Rose', hex: '#F2AFCF' },
  { name: 'Mauve', hex: '#D3B2EE' },
  { name: 'Sable', hex: '#D9C7AE' },
  { name: 'Perle', hex: '#C3CBD8' },
  // Couleurs vives : bien visibles sur les thèmes clairs et pour distinguer d'un coup d'œil.
  { name: 'Bleu roi', hex: '#4F7DFF' },
  { name: 'Turquoise', hex: '#14B8C4' },
  { name: 'Émeraude', hex: '#10B981' },
  { name: 'Vert pomme', hex: '#84CC16' },
  { name: 'Moutarde', hex: '#EAB308' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Rouge', hex: '#EF4444' },
  { name: 'Framboise', hex: '#E11D74' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Cuivre', hex: '#C2703D' },
  { name: 'Ardoise', hex: '#64748B' },
];

/** Coche lisible (sombre ou claire) sur une pastille de couleur. */
export function contrastOn(hex: string): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return '#1a1f2e';
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#1a1f2e' : '#ffffff';
}

export function eventColorKey(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr-FR');
}

export function colorForTitle(rules: EventColorRules, title: string): string | undefined {
  return rules[eventColorKey(title)];
}

export function withTitleColor(rules: EventColorRules, title: string, color: string | null): EventColorRules {
  const key = eventColorKey(title);
  const next = { ...rules };
  if (color) next[key] = color;
  else delete next[key];
  return next;
}
