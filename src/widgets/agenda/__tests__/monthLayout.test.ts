import { describe, expect, it } from 'vitest';
import { hiddenPerDay, layoutWeek, monthWeeks } from '../monthLayout';
import { allDaySpan } from '../../../domain/event/eventRules';
import type { CalendarEvent } from '../../../domain/event/event';
import type { Task } from '../../../domain/task/task';

const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({ id: 'e', title: 'e', start_at: '', duration_min: 60, is_annual: 0, created_at: '', updated_at: '', ...p });
const task = (p: Partial<Task>): Task => ({ id: 't', title: 't', status: 'todo', is_deleted: 0, created_at: '', updated_at: '', ...p });
const at = (key: string, h: number) => new Date(`${key}T${String(h).padStart(2, '0')}:00`).toISOString();

describe('mois sur téléphone', () => {
  it('semaines du lundi au dimanche couvrant le mois', () => {
    const weeks = monthWeeks(new Date(2026, 9, 16)); // octobre 2026 : commence un jeudi
    expect(weeks[0][0]).toBe('2026-09-28');
    expect(weeks[weeks.length - 1]).toContain('2026-10-31');
    expect(weeks.length).toBe(5);
  });

  it('voyage sur plusieurs jours = une barre continue, placée en premier', () => {
    const week = monthWeeks(new Date(2026, 9, 16))[2]; // 12 → 18 octobre
    const trip = ev({ id: 'trip', ...allDaySpan('2026-10-14', '2026-10-20') });
    const meeting = ev({ id: 'meet', start_at: at('2026-10-15', 10) });
    const todo = task({ id: 'todo', deadline: at('2026-10-15', 18) });
    const segs = layoutWeek(week, [todo], [meeting, trip], 'all');
    const t = segs.find((s) => s.item.id === 'trip')!;
    expect([t.startCol, t.endCol, t.lane, t.long, t.continuesAfter, t.continuesBefore]).toEqual([2, 6, 0, true, true, false]);
    expect(segs.find((s) => s.item.id === 'meet')!.lane).toBe(1);
    expect(segs.find((s) => s.item.id === 'todo')!.lane).toBe(2);
    expect(hiddenPerDay(segs, 2)[3]).toBe(1); // jeudi : la tâche ne tient pas sur 2 lignes
  });

  it('filtre Tâches / Évènements', () => {
    const week = monthWeeks(new Date(2026, 9, 16))[2];
    const segs = layoutWeek(week, [task({ deadline: at('2026-10-13', 9) })], [ev({ start_at: at('2026-10-13', 9) })], 'tasks');
    expect(segs.map((s) => s.item.kind)).toEqual(['task']);
  });
});
