import type { Task } from '../../domain/task/task';
import { agendaTaskColor, PRIORITY_LABEL } from '../../shared/presentation/taskPresentation';

/** Case cochée / vide dessinée (plus lisible qu'un caractère). */
export function TaskTick({ done, color, size = 11 }: { done: boolean; color: string; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 3, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      border: `1.5px solid ${color}`, background: done ? color : 'transparent',
    }}>
      {done && (
        <svg width={size - 4} height={size - 4} viewBox="0 0 10 10" fill="none">
          <polyline points="2,5 4,7.5 8,2.5" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/** Style commun des tâches dans l'agenda : fond coloré, liseré et lueur selon la priorité. */
export function taskAgendaStyle(task: Task): React.CSSProperties {
  const color = agendaTaskColor(task);
  const done = task.status === 'done';
  return {
    background: `color-mix(in srgb, ${color} ${done ? 14 : 26}%, var(--bg))`,
    border: `1px solid color-mix(in srgb, ${color} ${done ? 30 : 60}%, transparent)`,
    borderLeft: `3px solid ${color}`,
    boxShadow: done ? 'none' : `0 0 10px color-mix(in srgb, ${color} 28%, transparent)`,
    opacity: done ? 0.65 : 1,
  };
}

export function taskTooltip(task: Task): string {
  const prio = task.priority ? ` · priorité ${PRIORITY_LABEL[task.priority].toLowerCase()}` : '';
  return `Tâche : ${task.title}${prio} — double-clic pour modifier`;
}

/** Étiquette de titre de tâche (texte clair teinté de la couleur de priorité). */
export function TaskAgendaLabel({ task, fontSize = 10 }: { task: Task; fontSize?: number }) {
  const color = agendaTaskColor(task);
  const done = task.status === 'done';
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
      <TaskTick done={done} color={color} size={fontSize + 1} />
      <span style={{
        fontSize, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: `color-mix(in srgb, ${color} 45%, var(--text))`, textDecoration: done ? 'line-through' : 'none',
      }}>
        {task.title}
      </span>
    </span>
  );
}
