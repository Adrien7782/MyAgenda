/**
 * Utilitaires de dates purs (aucune dépendance UI / plateforme).
 * Convention : un "dayKey" est une date locale au format YYYY-MM-DD.
 */

export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
export const DAYS_SHORT_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dayKeyFromIso(iso: string): string {
  return dayKey(new Date(iso));
}

export function parseDayKey(key: string, hours = 0, minutes = 0): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, hours, minutes);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

/** Lundi 00:00 de la semaine contenant `date`. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const offset = (d.getDay() + 6) % 7; // Lundi = 0
  return addDays(d, -offset);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Index du jour de la semaine avec Lundi = 0 … Dimanche = 6. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Grille d'un mois en semaines complètes (lundi → dimanche).
 * Les cellules hors du mois valent `null`.
 */
export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = weekdayIndex(first);
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const n = i - offset + 1;
    return n >= 1 && n <= daysInMonth ? new Date(year, month, n) : null;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

/** Minutes écoulées depuis minuit (heure locale). */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

// ── Formatage ───────────────────────────────────────────────────────────────

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDuration(min: number): string {
  if (min >= 1440 && min % 1440 === 0) {
    const days = min / 1440;
    return days === 1 ? 'Journée' : `${days} jours`;
  }
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

export function formatDayLabel(key: string): string {
  const d = parseDayKey(key);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
}

export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()}–${end.getDate()} ${MONTHS_FR[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  }
  return `${weekStart.getDate()} ${MONTHS_FR[weekStart.getMonth()].slice(0, 3)} – ${end.getDate()} ${MONTHS_FR[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
}

// ── <input type="datetime-local"> ──────────────────────────────────────────

export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function nowIso(): string {
  return new Date().toISOString();
}
