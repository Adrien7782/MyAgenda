import { describe, expect, it } from 'vitest';
import { planReminders, readReminder, reminderTime, writeReminder, formatOffset } from '../reminder/reminder';
import { nextOccurrenceStart } from '../event/eventRules';
import { deadlineFromEvent, tasksToRealign } from '../task/taskRules';
import type { Task } from '../task/task';
import type { CalendarEvent } from '../event/event';

const task = (p: Partial<Task>): Task => ({ id: 't', title: 'Rendre le TP', status: 'todo', is_deleted: 0, created_at: '', updated_at: '', ...p });
const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({ id: 'e', title: 'Cours', start_at: '', duration_min: 60, is_annual: 0, created_at: '', updated_at: '', ...p });

const NOW = new Date('2026-10-15T08:00:00Z').getTime();
const iso = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 15, h, m)).toISOString();

describe('réglage du rappel', () => {
  it('aller-retour lecture / écriture', () => {
    expect(readReminder({})).toEqual({ kind: 'none' });
    expect(readReminder(writeReminder({ kind: 'before', minutes: 30 }))).toEqual({ kind: 'before', minutes: 30 });
    expect(readReminder(writeReminder({ kind: 'at', at: iso(9) }))).toEqual({ kind: 'at', at: iso(9) });
    expect(writeReminder({ kind: 'none' })).toEqual({ reminder_at: null, reminder_offset_min: null });
    expect(readReminder({ reminder_offset_min: 0 })).toEqual({ kind: 'before', minutes: 0 });
  });
  it('heure de déclenchement', () => {
    expect(reminderTime({ kind: 'before', minutes: 30 }, new Date(iso(10)))?.toISOString()).toBe(iso(9, 30));
    expect(reminderTime({ kind: 'before', minutes: 30 }, null)).toBeNull();
    expect(reminderTime({ kind: 'at', at: iso(9) }, null)?.toISOString()).toBe(iso(9));
  });
  it('libellés', () => {
    expect(formatOffset(30)).toBe('30 min avant');
    expect(formatOffset(90)).toBe('1 h 30 min avant');
    expect(formatOffset(2880)).toBe('2 jours avant');
  });
});

describe('planification des rappels', () => {
  it('rappel X minutes avant une tâche', () => {
    const plan = planReminders([task({ deadline: iso(10), reminder_offset_min: 30 })], [], { now: NOW });
    expect(plan).toHaveLength(1);
    expect(plan[0].atMs).toBe(new Date(iso(9, 30)).getTime());
    expect(plan[0].key).toBe(`task:t:${iso(9, 30)}`);
  });
  it('rappel à date fixe, même sans échéance', () => {
    const plan = planReminders([task({ reminder_at: iso(12) })], [], { now: NOW });
    expect(plan.map((p) => p.atMs)).toEqual([new Date(iso(12)).getTime()]);
  });
  it('ignore les tâches terminées, supprimées, et hors fenêtre', () => {
    const plan = planReminders(
      [
        task({ id: 'a', deadline: iso(10), reminder_offset_min: 0, status: 'done' }),
        task({ id: 'b', deadline: iso(10), reminder_offset_min: 0, is_deleted: 1 }),
        task({ id: 'c', reminder_at: iso(6) }), // 2 h de retard : trop tard
        task({ id: 'd', reminder_at: '2026-10-25T08:00:00Z' }), // au-delà de 48 h
      ],
      [],
      { now: NOW },
    );
    expect(plan).toEqual([]);
  });
  it('alertes automatiques uniquement si activées', () => {
    const tasks = [task({ deadline: iso(10) })];
    expect(planReminders(tasks, [], { now: NOW })).toEqual([]);
    const keys = planReminders(tasks, [], { now: NOW, autoAlerts: true }).map((p) => p.key.split(':')[0]);
    expect(keys).toEqual(['auto-warn']);
  });
  it("un rappel personnalisé remplace l'alerte 30 min avant", () => {
    const keys = planReminders([task({ deadline: iso(10), reminder_offset_min: 60 })], [], { now: NOW, autoAlerts: true }).map((p) => p.key.split(':')[0]);
    expect(keys).toEqual(['task']);
  });
  it('une seule notification par tâche, même avec un rappel « à l\'heure »', () => {
    const plan = planReminders([task({ deadline: iso(10), reminder_offset_min: 0 })], [], { now: NOW, autoAlerts: true });
    expect(plan).toHaveLength(1);
    expect(plan[0].title).toBe('🔔 Rappel');
  });
  it('évènements : rappel personnalisé, alerte auto seulement pour les évènements perso', () => {
    const events = [
      ev({ id: 'perso', start_at: iso(14) }),
      ev({ id: 'cours', start_at: iso(14), source_id: 'ics' }),
      ev({ id: 'rdv', start_at: iso(16), reminder_offset_min: 60 }),
    ];
    const plan = planReminders([], events, { now: NOW, autoAlerts: true });
    expect(plan.map((p) => p.key)).toEqual([`auto-event:perso:${iso(14)}`, `event:rdv:${iso(15)}`]);
  });
  it("évènement annuel : le rappel suit l'occurrence de l'année", () => {
    const birthday = ev({ id: 'anniv', start_at: '2001-10-16T09:00:00.000Z', is_annual: 1, reminder_offset_min: 1440 });
    const plan = planReminders([], [birthday], { now: NOW });
    expect(plan[0].atMs).toBe(new Date('2026-10-15T09:00:00.000Z').getTime());
  });
});

describe('tâche liée à un évènement', () => {
  it("l'échéance est le début de l'évènement", () => {
    expect(deadlineFromEvent(ev({ start_at: iso(14) }))).toBe(iso(14));
    const annual = ev({ start_at: '2001-03-01T10:00:00.000Z', is_annual: 1 });
    expect(nextOccurrenceStart(annual, new Date(NOW)).getFullYear()).toBe(2027);
  });
  it("réaligne les tâches quand l'évènement bouge", () => {
    const events = [ev({ id: 'e1', start_at: iso(15) })];
    const tasks = [
      task({ id: 'ok', event_id: 'e1', deadline: iso(15) }),
      task({ id: 'moved', event_id: 'e1', deadline: iso(14) }),
      task({ id: 'done', event_id: 'e1', deadline: iso(14), status: 'done' }),
      task({ id: 'orphan', event_id: 'gone', deadline: iso(14) }),
    ];
    expect(tasksToRealign(tasks, events).map((r) => r.task.id)).toEqual(['moved']);
  });
});
