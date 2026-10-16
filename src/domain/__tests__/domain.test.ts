import { describe, expect, it } from 'vitest';
import { layoutOverlapping, occursOnDay } from '../event/eventRules';
import { isOverdue, nextDeadline, nextStatus, shouldSpawnNextOccurrence, snoozedDeadline } from '../task/taskRules';
import { computeProgress, tasksInPeriod } from '../task/taskStats';
import { monthGrid, startOfWeek } from '../shared/date';
import type { Task } from '../task/task';
import type { CalendarEvent } from '../event/event';

const task = (p: Partial<Task>): Task => ({ id: 'x', title: 't', status: 'todo', is_deleted: 0, created_at: '', updated_at: '', ...p });
const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({ id: 'e', title: 'e', start_at: '', duration_min: 60, is_annual: 0, created_at: '', updated_at: '', ...p });

describe('règles des tâches', () => {
  it('cycle des statuts', () => {
    expect(nextStatus('todo')).toBe('in_progress');
    expect(nextStatus('done')).toBe('todo');
  });
  it('retard', () => {
    const now = new Date('2026-10-15T12:00:00Z').getTime();
    expect(isOverdue(task({ deadline: '2026-10-15T11:00:00Z' }), now)).toBe(true);
    expect(isOverdue(task({ deadline: '2026-10-15T11:00:00Z', status: 'done' }), now)).toBe(false);
  });
  it('récurrence', () => {
    expect(nextDeadline('2026-01-31T10:00:00.000Z', 'weekly')).toBe('2026-02-07T10:00:00.000Z');
    expect(shouldSpawnNextOccurrence(task({ recurrence: 'daily', deadline: 'x' }), 'done')).toBe(true);
    expect(shouldSpawnNextOccurrence(task({ recurrence: 'daily', deadline: 'x', status: 'done' }), 'done')).toBe(false);
  });
  it('snooze part de maintenant si la deadline est passée', () => {
    const now = new Date('2026-10-15T12:00:00Z').getTime();
    expect(snoozedDeadline(task({ deadline: '2026-10-12T12:00:00Z' }), 15, now)).toBe('2026-10-15T12:15:00.000Z');
  });
});

describe('statistiques de progression', () => {
  const now = new Date(2026, 9, 15, 12); // jeudi 15 octobre 2026
  const tasks = [
    task({ id: '1', status: 'done', deadline: new Date(2026, 9, 15, 9).toISOString() }),
    task({ id: '2', deadline: new Date(2026, 9, 16, 9).toISOString(), priority: 'high' }),
    task({ id: '3', deadline: new Date(2026, 9, 30, 9).toISOString() }),
    task({ id: '4' }),
  ];
  it('filtre par période', () => {
    expect(tasksInPeriod(tasks, 'day', now).map((t) => t.id)).toEqual(['1']);
    expect(tasksInPeriod(tasks, 'week', now).map((t) => t.id)).toEqual(['1', '2']);
    expect(tasksInPeriod(tasks, 'month', now).map((t) => t.id)).toEqual(['1', '2', '3']);
    expect(tasksInPeriod(tasks, 'all', now)).toHaveLength(4);
  });
  it('calcule les compteurs', () => {
    const s = computeProgress(tasks, now.getTime());
    expect(s.donePercent).toBe(25);
    expect(s.activePriorities.high).toBe(1);
    expect(s.upcoming.map((t) => t.id)).toEqual(['2', '3']);
  });
});

describe('agenda', () => {
  it('semaine du lundi et grille du mois', () => {
    expect(startOfWeek(new Date(2026, 9, 18)).getDate()).toBe(12);
    const grid = monthGrid(2026, 9); // octobre 2026 commence un jeudi
    expect(grid.slice(0, 3)).toEqual([null, null, null]);
    expect(grid.length % 7).toBe(0);
  });
  it('évènements annuels et multi-jours', () => {
    expect(occursOnDay(ev({ start_at: new Date(2001, 2, 4, 10).toISOString(), is_annual: 1 }), '2026-03-04')).toBe(true);
    const twoDays = ev({ start_at: new Date(2026, 9, 10).toISOString(), duration_min: 2880 });
    expect(occursOnDay(twoDays, '2026-10-11')).toBe(true);
    expect(occursOnDay(twoDays, '2026-10-12')).toBe(false);
  });
  it('répartit les chevauchements en colonnes', () => {
    const out = layoutOverlapping([
      { id: 'a', startMin: 480, endMin: 600 },
      { id: 'b', startMin: 540, endMin: 660 },
      { id: 'c', startMin: 600, endMin: 720 },
      { id: 'd', startMin: 800, endMin: 860 },
    ]);
    const by = Object.fromEntries(out.map((o) => [o.id, o]));
    expect(by.a.lane).toBe(0);
    expect(by.b.lane).toBe(1);
    expect(by.c.lane).toBe(0); // réutilise la colonne libérée par a
    expect(by.a.lanes).toBe(2);
    expect(by.d.lanes).toBe(1);
  });
});

import { colorForTitle, eventColorKey, withTitleColor } from '../event/eventColors';

describe('couleurs par titre', () => {
  it('normalise le titre (casse, espaces) et permet de réinitialiser', () => {
    expect(eventColorKey('  CM   Réseaux ')).toBe('cm réseaux');
    const rules = withTitleColor({}, 'CM Réseaux', '#9FE0C0');
    expect(colorForTitle(rules, 'cm réseaux')).toBe('#9FE0C0');
    expect(colorForTitle(withTitleColor(rules, 'CM Réseaux', null), 'CM Réseaux')).toBeUndefined();
  });
});

import { compareVersions, isNewerVersion } from '../shared/version';

describe('numéros de version', () => {
  it('comparaison numérique, pas alphabétique', () => {
    expect(isNewerVersion('0.10.0', '0.9.3')).toBe(true);
    expect(isNewerVersion('v0.7.2', '0.7.2')).toBe(false);
    expect(isNewerVersion('1.0.0', '0.99.99')).toBe(true);
    expect(compareVersions('0.7', '0.7.0')).toBe(0);
  });
});
