import { dayKeyFromIso, minutesOfDay, MINUTE_MS } from '../shared/date';
import type { CalendarEvent } from './event';

export function eventStart(ev: CalendarEvent): Date {
  return new Date(ev.start_at);
}

export function eventEnd(ev: CalendarEvent): Date {
  return new Date(new Date(ev.start_at).getTime() + ev.duration_min * MINUTE_MS);
}

/**
 * Début de la prochaine occurrence : la date de l'évènement, ou pour un évènement annuel
 * (anniversaire…) sa date de cette année — ou de l'an prochain si elle est déjà passée.
 */
export function nextOccurrenceStart(ev: CalendarEvent, now = new Date()): Date {
  const start = new Date(ev.start_at);
  if (!ev.is_annual) return start;
  const thisYear = new Date(start);
  thisYear.setFullYear(now.getFullYear());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (thisYear < today) thisYear.setFullYear(now.getFullYear() + 1);
  return thisYear;
}

export function isImported(ev: CalendarEvent): boolean {
  return !!ev.source_id;
}

/** Évènement "journée entière" : commence à minuit et dure un multiple de 24h. */
export function isAllDay(ev: CalendarEvent): boolean {
  const start = new Date(ev.start_at);
  return minutesOfDay(start) === 0 && ev.duration_min >= 1440 && ev.duration_min % 1440 === 0;
}

/** L'évènement a-t-il lieu ce jour-là ? (gère les annuels et les évènements sur plusieurs jours) */
export function occursOnDay(ev: CalendarEvent, key: string): boolean {
  if (ev.is_annual) {
    const d = new Date(ev.start_at);
    const [, m, day] = key.split('-').map(Number);
    return d.getMonth() + 1 === m && d.getDate() === day;
  }
  const startKey = dayKeyFromIso(ev.start_at);
  if (startKey === key) return true;
  if (ev.duration_min < 1440 && !isAllDay(ev)) return false;
  // Multi-jours : la fin est exclusive.
  const endKey = dayKeyFromIso(new Date(eventEnd(ev).getTime() - 1).toISOString());
  return key > startKey && key <= endKey;
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
