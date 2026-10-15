import type { CalendarEvent, EventDraft } from '../domain/event/event';
import { nowIso } from '../domain/shared/date';
import { newId } from '../domain/shared/id';
import type { EventRepository } from './ports';

export function createEventService(repo: EventRepository) {
  async function create(draft: EventDraft): Promise<CalendarEvent> {
    const now = nowIso();
    const event: CalendarEvent = { id: newId(), ...draft, created_at: now, updated_at: now };
    await repo.insert(event);
    return event;
  }

  async function update(event: CalendarEvent, draft: EventDraft): Promise<CalendarEvent> {
    const now = nowIso();
    await repo.update(event.id, draft, now);
    return { ...event, ...draft, updated_at: now };
  }

  return {
    listAll: () => repo.listAll(),
    create,
    update,
    /** Suppression définitive. Les tâches liées sont conservées (spec). */
    remove: (event: CalendarEvent) => repo.markDeleted(event.id, nowIso()),
  };
}

export type EventService = ReturnType<typeof createEventService>;
