import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../event/event';
import { nextOccurrenceStart, occurrencesBetween, occursOnDay } from '../event/eventRules';
import { nextDeadline } from '../task/taskRules';
import { normalizeInterval, recurrenceText } from '../shared/recurrence';
import { recurrenceLabel } from '../../shared/presentation/eventPresentation';
import { agendaToIcs } from '../../services/exportService';
import { createEventService } from '../../services/eventService';
import { createTaskService } from '../../services/taskService';
import { createMemoryRepositories } from '../../infrastructure/memory/memoryRepositories';

const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'e', title: 'Cours', start_at: new Date(2026, 9, 5, 9, 0).toISOString(), duration_min: 60, // lundi 5 octobre 2026
  is_annual: 0, created_at: '', updated_at: '', ...p,
});
const days = (e: CalendarEvent, keys: string[]) => keys.filter((k) => occursOnDay(e, k));

describe('répétition « tous les N »', () => {
  it('libellés', () => {
    expect(recurrenceText('daily', 1)).toBe('Chaque jour');
    expect(recurrenceText('daily', 2)).toBe('Tous les 2 jours');
    expect(recurrenceText('weekly', 3)).toBe('Toutes les 3 semaines');
    expect(recurrenceText('monthly', 6)).toBe('Tous les 6 mois');
    expect(recurrenceText('yearly', 2)).toBe('Tous les 2 ans');
    expect(recurrenceLabel(ev({ recurrence: 'weekly', recurrence_interval: 2, recurrence_until: '2026-12-20' })))
      .toBe('Toutes les 2 semaines jusqu’au 20 décembre 2026'.replace('’', "'"));
  });

  it('intervalle invalide ou absent = 1', () => {
    expect([normalizeInterval(undefined), normalizeInterval(null), normalizeInterval(0), normalizeInterval('3'), normalizeInterval(500)]).toEqual([1, 1, 1, 3, 99]);
  });

  it('évènement tous les 2 jours', () => {
    const e = ev({ recurrence: 'daily', recurrence_interval: 2 });
    expect(days(e, ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'])).toEqual(['2026-10-05', '2026-10-07', '2026-10-09']);
  });

  it('évènement toutes les 2 semaines', () => {
    const e = ev({ recurrence: 'weekly', recurrence_interval: 2 });
    expect(days(e, ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'])).toEqual(['2026-10-05', '2026-10-19', '2026-11-02']);
    const occ = occurrencesBetween(e, new Date(2026, 9, 6), new Date(2026, 10, 30, 23, 59));
    expect(occ.map((d) => d.getDate())).toEqual([19, 2, 16, 30]);
  });

  it('évènement tous les 3 mois, et tous les 2 ans', () => {
    const q = ev({ recurrence: 'monthly', recurrence_interval: 3 });
    expect(days(q, ['2026-11-05', '2027-01-05', '2027-01-06', '2027-04-05'])).toEqual(['2027-01-05', '2027-04-05']);
    const y = ev({ recurrence: 'yearly', recurrence_interval: 2 });
    expect(days(y, ['2027-10-05', '2028-10-05', '2030-10-05'])).toEqual(['2028-10-05', '2030-10-05']);
  });

  it('prochaine occurrence avec un grand intervalle', () => {
    const e = ev({ recurrence: 'monthly', recurrence_interval: 12, start_at: new Date(2026, 0, 31, 9).toISOString() });
    expect(nextOccurrenceStart(e, new Date(2026, 1, 1)).toISOString()).toBe(new Date(2027, 0, 31, 9).toISOString());
    const w = ev({ recurrence: 'weekly', recurrence_interval: 3 });
    expect(nextOccurrenceStart(w, new Date(2026, 9, 6)).getDate()).toBe(26);
  });

  it('export iCal : INTERVAL', () => {
    const ics = agendaToIcs([], [ev({ recurrence: 'weekly', recurrence_interval: 2 })]);
    expect(ics).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2');
  });

  it('tâche tous les 2 jours : la suivante est 2 jours plus tard', async () => {
    expect(nextDeadline('2026-10-20T10:00:00.000Z', 'daily', 2)).toBe('2026-10-22T10:00:00.000Z');
    const repos = createMemoryRepositories();
    const svc = createTaskService(repos.tasks);
    const t = await svc.create({ title: 'Arroser', status: 'todo', tags: [], recurrence: 'daily', recurrence_interval: 2,
      deadline: '2026-10-20T10:00:00.000Z', subtasks: [], newAttachments: [], removedAttachmentIds: [] });
    expect(t.recurrence_interval).toBe(2);
    const { spawned } = await svc.setStatus(t, 'done');
    expect(spawned?.deadline).toBe('2026-10-22T10:00:00.000Z');
    expect(spawned?.recurrence_interval).toBe(2);
  });

  it("« annuel » des anciennes versions seulement si c'est chaque année", async () => {
    const svc = createEventService(createMemoryRepositories().events);
    const base = { title: 'Fête', start_at: new Date(2026, 5, 21).toISOString(), duration_min: 1440, is_annual: 0 };
    expect((await svc.create({ ...base, recurrence: 'yearly' })).is_annual).toBe(1);
    expect((await svc.create({ ...base, recurrence: 'yearly', recurrence_interval: 2 })).is_annual).toBe(0);
  });
});
