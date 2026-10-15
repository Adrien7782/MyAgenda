import type { CalendarEvent } from '../../domain/event/event';
import type { Task } from '../../domain/task/task';
import { formatTime } from '../../domain/shared/date';
import { isAllDay } from '../../domain/event/eventRules';
import { TaskAgendaLabel, taskAgendaStyle, taskTooltip } from './TaskAgendaItem';

/** Petite étiquette d'évènement / tâche dans la vue Mois. Double-clic = modifier. */
export function EventChip({ event, color, onOpen }: { event: CalendarEvent; color: string; onOpen: () => void }) {
  return (
    <div
      title={`${event.title} — double-clic pour modifier`}
      onDoubleClick={(e) => { e.stopPropagation(); onOpen(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, borderRadius: 4, padding: '1px 5px', minWidth: 0, cursor: 'pointer',
        background: `color-mix(in srgb, ${color} 22%, var(--bg))`,
      }}
    >
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {!isAllDay(event) && !event.is_annual && <b style={{ fontWeight: 600 }}>{formatTime(event.start_at)} </b>}
        {event.title}
      </span>
    </div>
  );
}

export function TaskChip({ task, onOpen }: { task: Task; onOpen: () => void }) {
  return (
    <div
      title={taskTooltip(task)}
      onDoubleClick={(e) => { e.stopPropagation(); onOpen(); }}
      style={{ borderRadius: 4, padding: '1px 5px', minWidth: 0, cursor: 'pointer', ...taskAgendaStyle(task) }}
    >
      <TaskAgendaLabel task={task} />
    </div>
  );
}
