import type { CalendarEvent } from '../../domain/event/event';
import type { Task } from '../../domain/task/task';
import { isAllDay, occursOnDay } from '../../domain/event/eventRules';
import { addDays, dayKey, dayKeyFromIso, parseDayKey, startOfWeek } from '../../domain/shared/date';
import type { AgendaFilter } from './useAgendaNavigation';

export type MonthItem =
  | { kind: 'event'; id: string; event: CalendarEvent }
  | { kind: 'task'; id: string; task: Task };

/** Une barre dans une ligne de semaine : de la colonne `startCol` à `endCol` (0 = lundi). */
export interface WeekSegment {
  item: MonthItem;
  startCol: number;
  endCol: number;
  /** L'élément commence avant / continue après cette semaine (bord droit, pas arrondi). */
  continuesBefore: boolean;
  continuesAfter: boolean;
  /** Ligne d'affichage dans la case (0 = juste sous le numéro du jour). */
  lane: number;
  /** Plusieurs jours ou journée entière : barre pleine. */
  long: boolean;
}

/** Semaines (lundi → dimanche) affichées pour le mois de `anchor` : 4 à 6 lignes. */
export function monthWeeks(anchor: Date): string[][] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const weeks: string[][] = [];
  for (let ws = startOfWeek(first); ws <= last; ws = addDays(ws, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => dayKey(addDays(ws, i))));
  }
  return weeks;
}

function startMinutes(item: MonthItem): string {
  return item.kind === 'event' ? item.event.start_at.slice(11) : (item.task.deadline ?? '').slice(11);
}

/**
 * Barres d'une semaine : les évènements sur plusieurs jours forment une seule barre continue,
 * placée en premier ; chaque barre prend la première ligne libre sur toutes ses colonnes.
 */
export function layoutWeek(weekKeys: string[], tasks: Task[], events: CalendarEvent[], filter: AgendaFilter): WeekSegment[] {
  const before = dayKey(addDays(parseDayKey(weekKeys[0]), -1));
  const after = dayKey(addDays(parseDayKey(weekKeys[6]), 1));
  const raw: Omit<WeekSegment, 'lane'>[] = [];

  if (filter !== 'tasks') {
    for (const event of events) {
      const cols = weekKeys.map((k, i) => (occursOnDay(event, k) ? i : -1)).filter((i) => i >= 0);
      if (!cols.length) continue;
      const startCol = cols[0];
      const endCol = cols[cols.length - 1];
      raw.push({
        item: { kind: 'event', id: event.id, event },
        startCol, endCol,
        continuesBefore: startCol === 0 && !event.is_annual && occursOnDay(event, before),
        continuesAfter: endCol === 6 && !event.is_annual && occursOnDay(event, after),
        long: isAllDay(event) || endCol > startCol,
      });
    }
  }
  if (filter !== 'events') {
    for (const task of tasks) {
      if (!task.deadline) continue;
      const col = weekKeys.indexOf(dayKeyFromIso(task.deadline));
      if (col < 0) continue;
      raw.push({ item: { kind: 'task', id: task.id, task }, startCol: col, endCol: col, continuesBefore: false, continuesAfter: false, long: false });
    }
  }

  raw.sort((a, b) =>
    (b.endCol - b.startCol) - (a.endCol - a.startCol)
    || Number(b.long) - Number(a.long)
    || a.startCol - b.startCol
    || (a.item.kind === b.item.kind ? 0 : a.item.kind === 'event' ? -1 : 1)
    || startMinutes(a.item).localeCompare(startMinutes(b.item)));

  const lanes: boolean[][] = [];
  return raw.map((seg) => {
    let lane = 0;
    for (;; lane++) {
      lanes[lane] ??= Array(7).fill(false);
      let free = true;
      for (let c = seg.startCol; c <= seg.endCol; c++) if (lanes[lane][c]) { free = false; break; }
      if (free) break;
    }
    for (let c = seg.startCol; c <= seg.endCol; c++) lanes[lane][c] = true;
    return { ...seg, lane };
  });
}

/** Nombre d'éléments cachés par jour quand seules `visibleLanes` lignes tiennent dans la case. */
export function hiddenPerDay(segments: WeekSegment[], visibleLanes: number): number[] {
  const hidden = Array(7).fill(0);
  for (const s of segments) {
    if (s.lane < visibleLanes) continue;
    for (let c = s.startCol; c <= s.endCol; c++) hidden[c]++;
  }
  return hidden;
}
