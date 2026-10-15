import type { CalendarEvent } from '../../domain/event/event';
import type { Task } from '../../domain/task/task';
import { occursOnDay } from '../../domain/event/eventRules';
import { dayKeyFromIso } from '../../domain/shared/date';
import type { AgendaFilter } from './useAgendaNavigation';

/** Éléments affichés pour un jour donné, selon le filtre Tout / Tâches / Évènements. */
export function itemsForDay(tasks: Task[], events: CalendarEvent[], key: string, filter: AgendaFilter) {
  return {
    events: filter === 'tasks' ? [] : events.filter((e) => occursOnDay(e, key)).sort((a, b) => a.start_at.localeCompare(b.start_at)),
    tasks: filter === 'events' ? [] : tasks.filter((t) => t.deadline && dayKeyFromIso(t.deadline) === key),
  };
}
