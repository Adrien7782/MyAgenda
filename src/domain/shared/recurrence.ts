/**
 * Intervalle d'une répétition : « tous les 2 jours », « toutes les 3 semaines »…
 * La fréquence (jour / semaine / mois / année) est dans `recurrence`, l'intervalle dans `recurrence_interval`
 * (absent ou 1 = chaque jour, chaque semaine…). Les versions précédentes ignorent l'intervalle :
 * elles répètent simplement à chaque unité.
 */
export type RecurrenceUnit = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const MAX_RECURRENCE_INTERVAL = 99;

/** Entier entre 1 et 99 (1 si la valeur est absente ou invalide). */
export function normalizeInterval(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_RECURRENCE_INTERVAL);
}

const EVERY: Record<RecurrenceUnit, string> = {
  daily: 'Chaque jour',
  weekly: 'Chaque semaine',
  monthly: 'Chaque mois',
  yearly: 'Chaque année',
};

/** Unité au pluriel, et accord de « tous / toutes ». */
export const UNIT_PLURAL: Record<RecurrenceUnit, { plural: string; feminine: boolean }> = {
  daily: { plural: 'jours', feminine: false },
  weekly: { plural: 'semaines', feminine: true },
  monthly: { plural: 'mois', feminine: false },
  yearly: { plural: 'ans', feminine: false },
};

/** « Chaque semaine », « Tous les 2 jours », « Toutes les 3 semaines ». */
export function recurrenceText(unit: RecurrenceUnit, interval: number | null | undefined): string {
  const n = normalizeInterval(interval);
  if (n === 1) return EVERY[unit];
  const { plural, feminine } = UNIT_PLURAL[unit];
  return `${feminine ? 'Toutes' : 'Tous'} les ${n} ${plural}`;
}
