import type { Task } from '../../domain/task/task';
import { overdueDays } from '../../domain/task/taskRules';
import { AlertTriangleIcon, CalendarIcon, CheckCircleIcon, ClockIcon, XIcon } from '../../shared/icons/Icons';
import { IconButton } from '../../shared/ui';

/** Carte dépliée d'une tâche en retard : rappel dans 15 min, reprogrammer, terminer (spec "Dépassement de deadlines"). */
export function OverdueActionsCard({ task, onClose, onSnooze, onReschedule, onComplete }: {
  task: Task;
  onClose: () => void;
  onSnooze: () => void;
  onReschedule: () => void;
  onComplete: () => void;
}) {
  const days = overdueDays(task);
  return (
    <div className="fade-in" style={{
      borderRadius: 12, background: 'var(--surface)', overflow: 'hidden',
      border: '2px solid var(--danger)', borderLeft: '4px solid var(--danger)',
      boxShadow: '0 0 24px color-mix(in srgb, var(--danger) 22%, transparent), 0 4px 20px rgba(0,0,0,.4)',
    }}>
      <div style={{
        background: 'color-mix(in srgb, var(--danger) 12%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--danger) 33%, transparent)',
        padding: '8px 10px 8px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <AlertTriangleIcon size={15} color="var(--danger)" />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--danger)', flex: 1 }}>
          Deadline dépassée depuis {days} jour{days > 1 ? 's' : ''}
        </span>
        <IconButton label="Fermer" variant="plain" size={24} onClick={onClose}><XIcon size={13} /></IconButton>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{task.title}</div>
        {task.deadline && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', marginTop: 4 }}>
            Prévu le {new Date(task.deadline).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <ActionTile icon={<ClockIcon size={18} />} label="Me le rappeler" sub="Dans 15 minutes" onClick={onSnooze} />
          <ActionTile icon={<CalendarIcon size={18} />} label="Reprogrammer" sub="Choisir une date" onClick={onReschedule} />
        </div>
        <button type="button" onClick={onComplete} style={{
          padding: '11px 16px', borderRadius: 9, background: 'var(--success-bg)',
          border: '1px solid color-mix(in srgb, var(--success) 55%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--success)',
          fontSize: 'var(--text-base)', fontWeight: 600,
        }}>
          <CheckCircleIcon size={16} /> Marquer comme terminée
        </button>
      </div>
    </div>
  );
}

function ActionTile({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="ui-btn--secondary" style={{
      padding: '11px 13px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface-el)',
      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
    }}>
      <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{icon}</span>
      <span>
        <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>{label}</span>
        <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</span>
      </span>
    </button>
  );
}
