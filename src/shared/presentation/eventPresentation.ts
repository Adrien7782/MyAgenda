import type { CalendarEvent, EventRecurrence } from '../../domain/event/event';
import { eventRecurrence } from '../../domain/event/eventRules';
import { parseDayKey } from '../../domain/shared/date';
import type { Option } from '../ui/OptionGroup';

/** Mêmes choix que pour les tâches, plus « chaque année » (anniversaires, fêtes…). */
export const EVENT_RECURRENCE_OPTIONS: Option<EventRecurrence>[] = [
  { value: 'none', label: 'Aucune' },
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdo' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'yearly', label: 'Annuel' },
];

const LABEL: Record<Exclude<EventRecurrence, 'none'>, string> = {
  daily: 'Chaque jour',
  weekly: 'Chaque semaine',
  monthly: 'Chaque mois',
  yearly: 'Chaque année',
};

/** « Chaque semaine jusqu'au 30 juin », ou '' pour un évènement unique. */
export function recurrenceLabel(ev: Pick<CalendarEvent, 'recurrence' | 'is_annual' | 'recurrence_until'>): string {
  const rec = eventRecurrence(ev);
  if (rec === 'none') return '';
  const until = ev.recurrence_until
    ? ` jusqu'au ${parseDayKey(ev.recurrence_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : '';
  return `${LABEL[rec]}${until}`;
}
