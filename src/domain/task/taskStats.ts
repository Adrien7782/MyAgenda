import { addDays, startOfDay, startOfMonth, startOfWeek } from '../shared/date';
import type { Priority, Task, TaskStatus } from './task';
import { isOverdue, sortByDeadline } from './taskRules';

export type ProgressPeriod = 'day' | 'week' | 'month' | 'all';

export const PROGRESS_PERIOD_LABEL: Record<ProgressPeriod, string> = {
  day: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois',
  all: 'Toutes',
};

export function periodBounds(period: ProgressPeriod, now = new Date()): [Date, Date] | null {
  if (period === 'all') return null;
  if (period === 'day') {
    const start = startOfDay(now);
    return [start, addDays(start, 1)];
  }
  if (period === 'week') {
    const start = startOfWeek(now);
    return [start, addDays(start, 7)];
  }
  const start = startOfMonth(now);
  return [start, new Date(start.getFullYear(), start.getMonth() + 1, 1)];
}

/**
 * Tâches concernées par une période : celles dont l'échéance tombe dans la période.
 * "Toutes" renvoie la liste complète (y compris sans échéance).
 */
export function tasksInPeriod(tasks: Task[], period: ProgressPeriod, now = new Date()): Task[] {
  const bounds = periodBounds(period, now);
  if (!bounds) return tasks;
  const [start, end] = bounds;
  return tasks.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return d >= start && d < end;
  });
}

export interface ProgressStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  donePercent: number;
  overdue: number;
  activePriorities: Record<Priority, number>;
  upcoming: Task[];
}

export function computeProgress(tasks: Task[], now = Date.now(), upcomingCount = 5): ProgressStats {
  const byStatus: Record<TaskStatus, number> = { todo: 0, in_progress: 0, waiting: 0, done: 0 };
  const activePriorities: Record<Priority, number> = { high: 0, medium: 0, low: 0 };
  let overdue = 0;

  for (const t of tasks) {
    byStatus[t.status]++;
    if (isOverdue(t, now)) overdue++;
    if (t.priority && t.status !== 'done') activePriorities[t.priority]++;
  }

  const total = tasks.length;
  const upcoming = tasks
    .filter((t) => t.deadline && t.status !== 'done' && new Date(t.deadline).getTime() > now)
    .sort(sortByDeadline)
    .slice(0, upcomingCount);

  return {
    total,
    byStatus,
    donePercent: total > 0 ? Math.round((byStatus.done / total) * 100) : 0,
    overdue,
    activePriorities,
    upcoming,
  };
}
