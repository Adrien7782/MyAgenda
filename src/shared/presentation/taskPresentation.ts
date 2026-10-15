/** Libellés et couleurs d'affichage des tâches (séparés du domaine : c'est de la présentation). */
import type { Priority, Recurrence, TaskStatus } from '../../domain/task/task';
import type { Option } from '../ui/OptionGroup';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  waiting: 'En attente',
  done: 'Terminée',
};

export const STATUS_LABEL_PLURAL: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  waiting: 'En attente',
  done: 'Terminées',
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: 'var(--text-muted)',
  in_progress: 'var(--accent)',
  waiting: 'var(--warn)',
  done: 'var(--success)',
};

export const PRIORITY_LABEL: Record<Priority, string> = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };
export const PRIORITY_COLOR: Record<Priority, string> = {
  high: 'var(--danger)',
  medium: 'var(--warn)',
  low: 'var(--text-muted)',
};

export const STATUS_OPTIONS: Option<TaskStatus>[] = (['todo', 'in_progress', 'waiting', 'done'] as TaskStatus[]).map((s) => ({
  value: s, label: STATUS_LABEL[s], color: STATUS_COLOR[s],
}));

export const PRIORITY_OPTIONS: Option<Priority | 'none'>[] = [
  { value: 'none', label: '—', color: 'var(--text)' },
  ...(['high', 'medium', 'low'] as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p], color: PRIORITY_COLOR[p] })),
];

export const RECURRENCE_OPTIONS: Option<Recurrence>[] = [
  { value: 'none', label: 'Aucune' },
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdo' },
  { value: 'monthly', label: 'Mensuel' },
];

export function formatRelativeDeadline(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startThat - startToday) / 86_400_000);
  const time = `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
  if (days < 0) return `En retard de ${-days}j`;
  if (days === 0) return d.getTime() < now.getTime() ? `Auj. ${time} (passé)` : `Auj. ${time}`;
  if (days === 1) return `Demain ${time}`;
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Couleur d'une tâche dans l'agenda selon sa priorité (vives, pour se distinguer des évènements pastel).
 * Sans priorité : bleu ciel.
 */
export const TASK_PRIORITY_AGENDA_COLOR: Record<Priority | 'none', string> = {
  high: 'var(--danger)',
  medium: 'var(--warn)',
  low: 'var(--success)',
  none: '#38bdf8',
};

export const TASK_PRIORITY_AGENDA_LABEL: Record<Priority | 'none', string> = {
  high: 'Priorité haute',
  medium: 'Priorité moyenne',
  low: 'Priorité basse',
  none: 'Sans priorité',
};

export function agendaTaskColor(task: { priority?: Priority }): string {
  return TASK_PRIORITY_AGENDA_COLOR[task.priority ?? 'none'];
}
