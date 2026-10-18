import type { CalendarEvent, EventDraft } from '../domain/event/event';
import { eventRecurrence } from '../domain/event/eventRules';
import { normalizeInterval } from '../domain/shared/recurrence';
import { nowIso } from '../domain/shared/date';
import { newId } from '../domain/shared/id';
import type { EventRepository } from './ports';

/**
 * Répétition : `recurrence` est la référence ; `is_annual` est tenu à jour (= « chaque année »)
 * pour que les appareils encore en version précédente affichent correctement les anniversaires.
 */
function normalize(draft: EventDraft): EventDraft {
  const recurrence = eventRecurrence(draft);
  return {
    ...draft,
    recurrence,
    // « Annuel » pour les anciennes versions : seulement si c'est bien chaque année.
    is_annual: recurrence === 'yearly' && normalizeInterval(draft.recurrence_interval) === 1 ? 1 : 0,
    recurrence_interval: recurrence === 'none' ? 1 : normalizeInterval(draft.recurrence_interval),
    recurrence_until: recurrence === 'none' ? null : draft.recurrence_until ?? null,
  };
}

export function createEventService(repo: EventRepository) {
  async function create(input: EventDraft): Promise<CalendarEvent> {
    const draft = normalize(input);
    const now = nowIso();
    const event: CalendarEvent = { id: newId(), ...draft, created_at: now, updated_at: now };
    await repo.insert(event);
    return event;
  }

  async function update(event: CalendarEvent, input: EventDraft): Promise<CalendarEvent> {
    const draft = normalize(input);
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
