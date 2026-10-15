import type { CalendarEvent } from '../../domain/event/event';
import type { Task } from '../../domain/task/task';
import { formatDayLabel, formatDuration, formatTime } from '../../domain/shared/date';
import { isAllDay } from '../../domain/event/eventRules';
import { CalendarIcon, EditIcon, MapPinIcon, PlusIcon, TrashIcon } from '../../shared/icons/Icons';
import { Button, EmptyState, IconButton, SectionTitle, StatusCheck } from '../../shared/ui';
import {
  agendaTaskColor, PRIORITY_LABEL, TASK_PRIORITY_AGENDA_COLOR, TASK_PRIORITY_AGENDA_LABEL,
} from '../../shared/presentation/taskPresentation';
import { Dot } from '../../shared/ui';

interface DaySidePanelProps {
  dayKey: string;
  tasks: Task[];
  events: CalendarEvent[];
  colorOf: (ev: CalendarEvent) => string;
  sourceName: (ev: CalendarEvent) => string | undefined;
  onAddEvent: () => void;
  onAddTask: () => void;
  onEditEvent: (ev: CalendarEvent) => void;
  onDeleteEvent: (ev: CalendarEvent) => void;
  onEditTask: (t: Task) => void;
  onDeleteTask: (t: Task) => void;
  onToggleTask: (t: Task) => void;
}

/** Détail du jour sélectionné. Double-clic sur une carte = modifier. */
export function DaySidePanel(p: DaySidePanelProps) {
  return (
    <aside style={{ width: 280, minWidth: 280, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{formatDayLabel(p.dayKey)}</h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
          {p.events.length} évèn. · {p.tasks.length} tâche{p.tasks.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {p.events.length > 0 && (
          <section>
            <SectionTitle>Évènements</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {p.events.map((ev) => {
                const color = p.colorOf(ev);
                const source = p.sourceName(ev);
                return (
                  <div key={ev.id} className="hoverable" onDoubleClick={() => p.onEditEvent(ev)} title="Double-clic pour modifier"
                    style={{ position: 'relative', padding: '8px 10px', borderRadius: 8, background: 'var(--surface-el)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, cursor: 'default' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, paddingRight: 48 }}>{ev.title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                      {isAllDay(ev) ? 'Journée entière' : `${formatTime(ev.start_at)} · ${formatDuration(ev.duration_min)}`}
                      {ev.is_annual ? ' · Annuel' : ''}
                    </div>
                    {ev.location && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPinIcon size={10} /> {ev.location}
                      </div>
                    )}
                    {source && <div style={{ fontSize: 10, color, marginTop: 3 }}>{source}</div>}
                    <div className="hover-actions" style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 3 }}>
                      <IconButton label="Modifier" size={22} onClick={() => p.onEditEvent(ev)}><EditIcon size={10} /></IconButton>
                      <IconButton label="Supprimer" size={22} variant="danger" onClick={() => p.onDeleteEvent(ev)}><TrashIcon size={10} /></IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {p.tasks.length > 0 && (
          <section>
            <SectionTitle>Tâches</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {p.tasks.map((t) => {
                const color = agendaTaskColor(t);
                const done = t.status === 'done';
                return (
                  <div key={t.id} className="hoverable" onDoubleClick={() => p.onEditTask(t)} title={t.priority ? `Priorité ${PRIORITY_LABEL[t.priority].toLowerCase()} — double-clic pour modifier` : 'Double-clic pour modifier'}
                    style={{
                      position: 'relative', padding: '8px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                      background: `color-mix(in srgb, ${color} ${done ? 8 : 16}%, var(--surface-el))`,
                      border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`, borderLeft: `3px solid ${color}`,
                      opacity: done ? 0.7 : 1,
                    }}>
                    <StatusCheck size={15} color={color} done={done} title={done ? 'Rouvrir' : 'Terminer'} onClick={() => p.onToggleTask(t)} />
                    <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: done ? 'var(--text-muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                      {t.title}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(t.deadline!)}</span>
                    <div className="hover-actions" style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 3, background: 'var(--surface-el)' }}>
                      <IconButton label="Modifier" size={22} onClick={() => p.onEditTask(t)}><EditIcon size={10} /></IconButton>
                      <IconButton label="Mettre à la corbeille" size={22} variant="danger" onClick={() => p.onDeleteTask(t)}><TrashIcon size={10} /></IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {p.events.length === 0 && p.tasks.length === 0 && <EmptyState icon={<CalendarIcon size={36} />} message="Rien ce jour" />}

        <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: '4px 12px', paddingTop: 8 }} aria-label="Couleurs des tâches">
          {(['high', 'medium', 'low', 'none'] as const).map((k) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}>
              <Dot color={TASK_PRIORITY_AGENDA_COLOR[k]} size={7} /> {TASK_PRIORITY_AGENDA_LABEL[k]}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <Button size="sm" icon={<PlusIcon size={12} />} onClick={p.onAddEvent} style={{ justifyContent: 'flex-start' }}>Ajouter un évènement</Button>
        <Button size="sm" icon={<PlusIcon size={12} />} onClick={p.onAddTask} style={{ justifyContent: 'flex-start' }}>Ajouter une tâche</Button>
      </div>
    </aside>
  );
}
