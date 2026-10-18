import { addDays, dayKey, dayKeyFromIso, minutesOfDay, MINUTE_MS, parseDayKey } from '../shared/date';
import type { CalendarEvent, EventRecurrence } from './event';
import { normalizeInterval } from '../shared/recurrence';

export function eventStart(ev: CalendarEvent): Date {
  return new Date(ev.start_at);
}

export function eventEnd(ev: CalendarEvent): Date {
  return new Date(new Date(ev.start_at).getTime() + ev.duration_min * MINUTE_MS);
}

export function isImported(ev: CalendarEvent): boolean {
  return !!ev.source_id;
}

/** Évènement "journée entière" : commence à minuit et dure un multiple de 24h. */
export function isAllDay(ev: CalendarEvent): boolean {
  const start = new Date(ev.start_at);
  return minutesOfDay(start) === 0 && ev.duration_min >= 1440 && ev.duration_min % 1440 === 0;
}

/** Nombre de jours calendaires de `fromKey` à `toKey` (0 si même jour), insensible au changement d'heure. */
export function daysBetween(fromKey: string, toKey: string): number {
  const utc = (k: string) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((utc(toKey) - utc(fromKey)) / 86_400_000);
}

/** Évènement « journée entière » du jour `fromKey` au jour `toKey` inclus (voyage, vacances…). */
export function allDaySpan(fromKey: string, toKey: string): { start_at: string; duration_min: number } {
  const days = Math.max(1, daysBetween(fromKey, toKey) + 1);
  return { start_at: parseDayKey(fromKey).toISOString(), duration_min: days * 1440 };
}

/** Nombre de jours d'un évènement « journée entière ». */
export function allDayCount(ev: CalendarEvent): number {
  return Math.max(1, Math.round(ev.duration_min / 1440));
}

/** Dernier jour (inclus) d'un évènement « journée entière ». */
export function allDayLastKey(ev: CalendarEvent): string {
  return dayKey(addDays(parseDayKey(dayKeyFromIso(ev.start_at)), allDayCount(ev) - 1));
}

/** L'évènement a-t-il lieu ce jour-là ? (répétitions, évènements sur plusieurs jours) */
export function occursOnDay(ev: CalendarEvent, key: string): boolean {
  return occurrenceCovering(ev, key) !== null;
}

// ── Répétitions ──────────────────────────────────────────────────────────────

/** Répétition effective (les anciens évènements « annuels » n'ont que is_annual). */
export function eventRecurrence(ev: Pick<CalendarEvent, 'recurrence' | 'is_annual'>): EventRecurrence {
  if (ev.recurrence && ev.recurrence !== 'none') return ev.recurrence;
  return ev.is_annual ? 'yearly' : 'none';
}

/** « Tous les N … » : 1 pour une répétition simple (ou les évènements créés avant l'intervalle). */
export function recurrenceInterval(ev: Pick<CalendarEvent, 'recurrence_interval'>): number {
  return normalizeInterval(ev.recurrence_interval ?? 1);
}

export function isRecurring(ev: Pick<CalendarEvent, 'recurrence' | 'is_annual'>): boolean {
  return eventRecurrence(ev) !== 'none';
}

/** Nombre de jours calendaires couverts par UNE occurrence (1 pour un évènement dans la journée). */
function spanDays(ev: CalendarEvent): number {
  if (isAllDay(ev)) return allDayCount(ev);
  // Moins de 24 h (même à cheval sur minuit) : affiché seulement le jour où il commence.
  if (ev.duration_min < 1440) return 1;
  const startKey = dayKeyFromIso(ev.start_at);
  const endKey = dayKeyFromIso(new Date(Math.max(eventStart(ev).getTime(), eventEnd(ev).getTime() - 1)).toISOString());
  return daysBetween(startKey, endKey) + 1;
}

function keyParts(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y, m, d];
}

/** Une occurrence commence-t-elle ce jour-là ? */
function startsOn(ev: CalendarEvent, key: string): boolean {
  const rec = eventRecurrence(ev);
  const startKey = dayKeyFromIso(ev.start_at);
  if (rec === 'none') return key === startKey;
  if (key < startKey) return false;
  if (ev.recurrence_until && key > ev.recurrence_until) return false;
  const n = recurrenceInterval(ev);
  const [sy, sm, sd] = keyParts(startKey);
  const [y, m, d] = keyParts(key);
  switch (rec) {
    case 'daily': return daysBetween(startKey, key) % n === 0;
    case 'weekly': return daysBetween(startKey, key) % (7 * n) === 0;
    // Le 31 : seulement les mois qui en ont un.
    case 'monthly': return d === sd && ((y - sy) * 12 + (m - sm)) % n === 0;
    case 'yearly': return d === sd && m === sm && (y - sy) % n === 0;
  }
}

/** Début d'une occurrence qui commence le jour `key` (même heure que l'évènement d'origine). */
function occurrenceStartOn(ev: CalendarEvent, key: string): Date {
  const start = eventStart(ev);
  const [y, m, d] = keyParts(key);
  return new Date(y, m - 1, d, start.getHours(), start.getMinutes(), start.getSeconds());
}

function occurrenceEnd(ev: CalendarEvent, start: Date): Date {
  if (isAllDay(ev)) return addDays(start, allDayCount(ev));
  return new Date(start.getTime() + ev.duration_min * MINUTE_MS);
}

/** L'occurrence de l'évènement qui recouvre le jour `key` (début et fin), ou null. */
export function occurrenceCovering(ev: CalendarEvent, key: string): { start: Date; end: Date } | null {
  if (!isRecurring(ev)) {
    const startKey = dayKeyFromIso(ev.start_at);
    if (key < startKey) return null;
    if (key === startKey) return { start: eventStart(ev), end: eventEnd(ev) };
    // Journées entières : on compte en jours calendaires (pas en minutes, faux au changement d'heure).
    if (isAllDay(ev)) return key <= allDayLastKey(ev) ? { start: eventStart(ev), end: eventEnd(ev) } : null;
    if (ev.duration_min < 1440) return null;
    // Multi-jours / à cheval sur minuit : la fin est exclusive.
    const endKey = dayKeyFromIso(new Date(eventEnd(ev).getTime() - 1).toISOString());
    return key <= endKey ? { start: eventStart(ev), end: eventEnd(ev) } : null;
  }
  const span = Math.min(spanDays(ev), 366);
  const day = parseDayKey(key);
  for (let back = 0; back < span; back++) {
    const k = back === 0 ? key : dayKey(addDays(day, -back));
    if (startsOn(ev, k)) {
      const start = occurrenceStartOn(ev, k);
      return { start, end: occurrenceEnd(ev, start) };
    }
  }
  return null;
}

/** Débuts des occurrences entre `from` et `to` (au plus `max`), dans l'ordre. */
export function occurrencesBetween(ev: CalendarEvent, from: Date, to: Date, max = 60): Date[] {
  const rec = eventRecurrence(ev);
  const start = eventStart(ev);
  if (rec === 'none') return start >= from && start <= to ? [start] : [];
  const out: Date[] = [];
  const startKey = dayKeyFromIso(ev.start_at);
  // On démarre au plus tard au premier jour utile (pas besoin de parcourir des années en arrière).
  let day = parseDayKey(dayKey(from) > startKey ? dayKey(from) : startKey);
  const lastKey = ev.recurrence_until && ev.recurrence_until < dayKey(to) ? ev.recurrence_until : dayKey(to);
  const n = recurrenceInterval(ev);
  // Pas d'avance une fois calé sur une occurrence : N jours (quotidien) ou 7 × N (hebdo) ; sinon jour par jour.
  const stride = rec === 'daily' ? n : rec === 'weekly' ? 7 * n : 1;
  const maxSteps = Math.min(20_000, Math.max(800, daysBetween(dayKey(day), lastKey) + 2));
  for (let i = 0; out.length < max && dayKey(day) <= lastKey && i < maxSteps; i++) {
    const key = dayKey(day);
    const hit = startsOn(ev, key);
    if (hit) {
      const s = occurrenceStartOn(ev, key);
      if (s >= from && s <= to) out.push(s);
    }
    day = addDays(day, hit ? stride : 1);
  }
  return out;
}

/**
 * Début de la prochaine occurrence : la date de l'évènement, ou pour un évènement répété
 * la première occurrence d'aujourd'hui ou après (même si l'heure d'aujourd'hui est passée).
 */
export function nextOccurrenceStart(ev: CalendarEvent, now = new Date()): Date {
  if (!isRecurring(ev)) return eventStart(ev);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rec = eventRecurrence(ev);
  const n = recurrenceInterval(ev);
  // Assez loin pour trouver l'occurrence suivante (29 février, 31 du mois, « tous les 3 ans »…).
  const days = { daily: n + 1, weekly: 7 * n + 1, monthly: 400 * n, yearly: (366 * 4 + 1) * n }[rec as Exclude<EventRecurrence, 'none'>];
  const horizon = addDays(today, Math.min(days, 20_000));
  const next = occurrencesBetween(ev, today, horizon, 1)[0];
  // Répétition terminée (date de fin passée) : on garde la dernière date connue.
  return next ?? eventStart(ev);
}

export interface TimedItem {
  id: string;
  startMin: number;
  endMin: number;
}

export interface LaidOutItem extends TimedItem {
  lane: number;
  lanes: number;
}

/**
 * Répartit des créneaux qui se chevauchent sur plusieurs colonnes (comme Google Agenda).
 * Algorithme glouton : on regroupe les éléments qui se chevauchent en "clusters",
 * puis chaque élément prend la première colonne libre.
 */
export function layoutOverlapping(items: TimedItem[]): LaidOutItem[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const result: LaidOutItem[] = [];
  let cluster: LaidOutItem[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const lanes = laneEnds.length;
    for (const it of cluster) it.lanes = lanes;
    result.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.startMin >= clusterEnd && cluster.length) flush();
    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }
    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (cluster.length) flush();
  return result;
}
