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
];

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
