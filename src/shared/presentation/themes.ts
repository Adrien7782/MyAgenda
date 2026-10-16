export type Theme = 'bleu' | 'violet' | 'jaune' | 'nb' | 'sombre' | 'rose' | 'rosenoir' | 'jauneblanc';

export const THEMES: { key: Theme; label: string; accent: string; bg: string }[] = [
  { key: 'bleu', label: 'Bleu Neon', accent: '#3b6eff', bg: '#030b18' },
  { key: 'violet', label: 'Violet', accent: '#9061f9', bg: '#07050f' },
  { key: 'jaune', label: 'Jaune', accent: '#e08a00', bg: '#0c0900' },
  { key: 'nb', label: 'N&B', accent: '#111111', bg: '#ffffff' },
  { key: 'sombre', label: 'Sombre', accent: '#d2d2d2', bg: '#0d0d0d' },
  { key: 'rose', label: 'Rose & blanc', accent: '#e2457f', bg: '#ffffff' },
  { key: 'rosenoir', label: 'Rose & noir', accent: '#ff4f9a', bg: '#0b0609' },
  { key: 'jauneblanc', label: 'Jaune & blanc', accent: '#e0a100', bg: '#ffffff' },
];

export function isTheme(v: string | null): v is Theme {
  return !!v && THEMES.some((t) => t.key === v);
}

const LAST_THEME_KEY = 'my-agenda:last-theme';

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  // Mémorisé hors de la base du compte : l'écran de connexion garde le dernier thème utilisé.
  try { localStorage.setItem(LAST_THEME_KEY, theme); } catch { /* ignore */ }
}

export function applyLastTheme(): void {
  try {
    const t = localStorage.getItem(LAST_THEME_KEY);
    if (isTheme(t)) document.documentElement.setAttribute('data-theme', t);
  } catch { /* ignore */ }
}

/** Les champs date natifs doivent suivre la luminosité du thème. */
export function isLightTheme(theme: Theme): boolean {
  return theme === 'nb' || theme === 'rose' || theme === 'jauneblanc';
}
