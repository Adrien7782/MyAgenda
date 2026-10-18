import type { Task } from '../../domain/task/task';
import { openGesture } from '../../shared/device';
import { isOverdue, parseTags } from '../../domain/task/taskRules';
import { normalizeInterval } from '../../domain/shared/recurrence';
import { AlertTriangleIcon, EditIcon, RepeatIcon, TrashIcon } from '../../shared/icons/Icons';
import { Badge, IconButton, StatusCheck } from '../../shared/ui';
import {
  formatRelativeDeadline, PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL, taskRecurrenceLabel,
} from '../../shared/presentation/taskPresentation';

export interface TaskCardActions {
  onToggleDone: (task: Task) => void;
  onCycleStatus: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onShowOverdueActions?: (task: Task) => void;
}

interface TaskCardProps extends TaskCardActions {
  task: Task;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
  /** Mise en page verticale pour les colonnes étroites (Kanban). */
  compact?: boolean;
}

function DragHandle(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className="hover-actions" style={{ display: 'flex', alignItems: 'center', cursor: 'grab', color: 'var(--text-muted)', marginTop: 2, flexShrink: 0, opacity: undefined }}>
      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
        <circle cx="3" cy="3" r="1.2" /><circle cx="7" cy="3" r="1.2" />
        <circle cx="3" cy="7" r="1.2" /><circle cx="7" cy="7" r="1.2" />
        <circle cx="3" cy="11" r="1.2" /><circle cx="7" cy="11" r="1.2" />
      </svg>
    </div>
  );
}

/** Carte compacte d'une tâche (liste et kanban). Double-clic = modifier. */
export function TaskCard({ task, dragHandleProps, isDragging, compact, onToggleDone, onCycleStatus, onEdit, onDelete, onShowOverdueActions }: TaskCardProps) {
  const overdue = isOverdue(task);
  const done = task.status === 'done';
  const color = STATUS_COLOR[task.status];
  const accentColor = task.priority ? PRIORITY_COLOR[task.priority] : color;
  const tags = parseTags(task.tags);
  const subtasks = task.subtasks ?? [];
  const doneSubs = subtasks.filter((s) => s.is_done).length;

  const meta = (
        <div style={compact
          ? { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 7 }
          : { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <button type="button" title="Changer de statut" onClick={(e) => { e.stopPropagation(); onCycleStatus(task); }}>
            <Badge color={color}>{STATUS_LABEL[task.status]}</Badge>
          </button>
          {task.priority && <Badge size="sm" color={PRIORITY_COLOR[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>}
          {task.deadline && (
            <span style={{ fontSize: 'var(--text-xs)', color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: overdue ? 600 : 400 }}>
              {formatRelativeDeadline(task.deadline)}
            </span>
          )}
          {overdue && onShowOverdueActions && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onShowOverdueActions(task); }} title="Voir les actions">
              <Badge size="sm" color="var(--danger)"><AlertTriangleIcon size={10} color="var(--danger)" /> Dépassée</Badge>
            </button>
          )}
        </div>
  );

  return (
    <div
      className="hoverable"
      {...openGesture(() => onEdit(task))}
      style={{
        position: 'relative', borderRadius: 10, background: 'var(--surface)', padding: '11px 14px',
        border: `1px solid ${overdue ? 'color-mix(in srgb, var(--danger) 40%, transparent)' : task.status === 'in_progress' ? 'color-mix(in srgb, var(--accent) 27%, transparent)' : 'var(--border)'}`,
        borderLeft: `3px solid ${accentColor}`,
        boxShadow: isDragging ? '0 8px 32px rgba(0,0,0,.5), 0 0 0 2px var(--accent)' : '0 1px 8px rgba(0,0,0,.18)',
        display: 'flex', alignItems: 'flex-start', gap: 12, opacity: isDragging ? 0.9 : 1,
        transition: isDragging ? 'none' : 'box-shadow .15s, border-color .15s',
      }}
    >
      {dragHandleProps && <DragHandle {...dragHandleProps} />}

      <div style={{ marginTop: 2 }}>
        <StatusCheck color={color} done={done} title={done ? 'Marquer comme à faire' : 'Marquer comme terminée'} onClick={() => onToggleDone(task)} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{
            fontSize: 'var(--text-base)', fontWeight: 500, lineHeight: 1.4,
            color: done ? 'var(--text-muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: compact ? 'normal' : 'nowrap',
            overflowWrap: compact ? 'anywhere' : undefined,
          }}>{task.title}</span>
          {task.recurrence && task.recurrence !== 'none' && (
            <span title={taskRecurrenceLabel(task)} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0, fontSize: 10, color: 'var(--text-muted)' }}>
              <RepeatIcon size={11} color="var(--text-muted)" />
              {normalizeInterval(task.recurrence_interval) > 1 && `${normalizeInterval(task.recurrence_interval)} ${{ daily: 'j', weekly: 'sem.', monthly: 'mois' }[task.recurrence]}`}
            </span>
          )}
        </div>
        {task.comment && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.comment}
          </p>
        )}
        {subtasks.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
            <div style={{ height: 3, width: 80, borderRadius: 2, background: 'var(--surface-el)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(doneSubs / subtasks.length) * 100}%`, background: doneSubs === subtasks.length ? 'var(--success)' : 'var(--accent)', transition: 'width .3s' }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{doneSubs}/{subtasks.length}</span>
          </div>
        )}
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
            {tags.map((tag) => (
              <span key={tag} style={{ padding: '2px 7px', borderRadius: 20, background: 'var(--surface-el)', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {compact && meta}
      </div>

      {!compact && meta}

      <div className="hover-actions" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 8, padding: 2 }}>
        <IconButton label="Modifier" size={24} onClick={() => onEdit(task)}><EditIcon size={13} /></IconButton>
        <IconButton label="Mettre à la corbeille" size={24} variant="danger" onClick={() => onDelete(task)}><TrashIcon size={13} /></IconButton>
      </div>
    </div>
  );
}
