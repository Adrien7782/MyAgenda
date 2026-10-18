import type { CalendarEvent } from '../../domain/event/event';
import { eventRecurrence, recurrenceInterval } from '../../domain/event/eventRules';
import { recurrenceText } from '../../domain/shared/recurrence';
import { parseDayKey } from '../../domain/shared/date';

/** « Chaque semaine jusqu'au 30 juin », « Tous les 2 jours », ou '' pour un évènement unique. */
export function recurrenceLabel(ev: Pick<CalendarEvent, 'recurrence' | 'is_annual' | 'recurrence_until' | 'recurrence_interval'>): string {
  const rec = eventRecurrence(ev);
  if (rec === 'none') return '';
  const until = ev.recurrence_until
    ? ` jusqu'au ${parseDayKey(ev.recurrence_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : '';
  return `${recurrenceText(rec, recurrenceInterval(ev))}${until}`;
}
