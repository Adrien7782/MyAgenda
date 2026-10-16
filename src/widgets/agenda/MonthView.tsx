import type { CalendarEvent } from '../../domain/event/event';
import type { Task } from '../../domain/task/task';
import { DAYS_SHORT_FR, dayKey, monthGrid } from '../../domain/shared/date';
import { useElementWidth } from '../../shared/hooks/useElementWidth';
import { itemsForDay } from './agendaItems';
import { EventChip, TaskChip } from './AgendaChip';
import type { AgendaFilter } from './useAgendaNavigation';
import { agendaTaskColor } from '../../shared/presentation/taskPresentation';

interface MonthViewProps {
  anchor: Date;
  todayKey: string;
  selectedDay: string;
  tasks: Task[];
  events: CalendarEvent[];
  filter: AgendaFilter;
  colorOf: (ev: CalendarEvent) => string;
  onSelectDay: (key: string) => void;
  onCreateOnDay: (key: string) => void;
  onEditEvent: (ev: CalendarEvent) => void;
  onEditTask: (t: Task) => void;
  /** Téléphone : cases basses avec des points de couleur au lieu des étiquettes. */
  compact?: boolean;
}

/**
 * Vue mensuelle. Clic = sélectionner le jour, double-clic sur une case vide = nouvel évènement,
 * double-clic sur un évènement / une tâche = le modifier.
 */
export function MonthView(props: MonthViewProps) {
  return props.compact ? <CompactMonthView {...props} /> : <FullMonthView {...props} />;
}

/** Téléphone : mois compact (comme les agendas de téléphone), le détail du jour s'affiche dessous. */
function CompactMonthView({ anchor, todayKey, selectedDay, tasks, events, filter, colorOf, onSelectDay }: MonthViewProps) {
  const cells = monthGrid(anchor.getFullYear(), anchor.getMonth());
  return (
    <div style={{ padding: '0 10px 6px', flexShrink: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DAYS_SHORT_FR.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.6, textTransform: 'uppercase', padding: '6px 0' }}>{d.slice(0, 1)}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 2 }}>
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = dayKey(date);
          const isToday = key === todayKey;
          const isSelected = key === selectedDay;
          const day = itemsForDay(tasks, events, key, filter);
          const dots = [...day.events.map((ev) => colorOf(ev)), ...day.tasks.map((t) => agendaTaskColor(t))].slice(0, 4);
          return (
            <button key={key} type="button" onClick={() => onSelectDay(key)} aria-label={key} aria-pressed={isSelected}
              style={{ height: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 12,
                background: isSelected ? 'var(--accent-bg)' : 'transparent' }}>
              <span style={{
                width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: isToday || isSelected ? 700 : 400,
                background: isToday ? 'var(--accent)' : 'transparent',
                color: isToday ? 'var(--on-accent)' : isSelected ? 'var(--accent)' : 'var(--text)',
              }}>{date.getDate()}</span>
              <span style={{ display: 'flex', gap: 2, height: 5 }}>
                {dots.map((c, j) => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FullMonthView({ anchor, todayKey, selectedDay, tasks, events, filter, colorOf, onSelectDay, onCreateOnDay, onEditEvent, onEditTask }: MonthViewProps) {
  const cells = monthGrid(anchor.getFullYear(), anchor.getMonth());
  const rows = cells.length / 7;
  const [gridRef, gridWidth] = useElementWidth<HTMLDivElement>();
  const maxChips = gridWidth > 900 ? 4 : 3;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 16px 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flexShrink: 0 }}>
        {DAYS_SHORT_FR.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.8, textTransform: 'uppercase', padding: '8px 0' }}>{d}</div>
        ))}
      </div>
      <div ref={gridRef} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'grid', gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: row < rows - 1 ? '1px solid var(--border)' : 'none', minHeight: 0 }}>
            {cells.slice(row * 7, row * 7 + 7).map((date, ci) => {
              const border = ci < 6 ? '1px solid var(--border)' : 'none';
              if (!date) return <div key={ci} style={{ borderRight: border, background: 'color-mix(in srgb, var(--surface-el) 35%, transparent)' }} />;
              const key = dayKey(date);
              const isToday = key === todayKey;
              const isSelected = key === selectedDay;
              const day = itemsForDay(tasks, events, key, filter);
              const total = day.events.length + day.tasks.length;
              const shownEvents = day.events.slice(0, maxChips);
              const shownTasks = day.tasks.slice(0, Math.max(0, maxChips - shownEvents.length));
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectDay(key)}
                  onDoubleClick={() => onCreateOnDay(key)}
                  style={{
                    borderRight: border, padding: '5px 6px', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0, overflow: 'hidden', cursor: 'pointer',
                    background: isSelected ? 'var(--accent-bg)' : isToday ? 'color-mix(in srgb, var(--accent) 5%, var(--surface))' : 'var(--surface)',
                    outline: isSelected ? '1.5px solid var(--accent)' : 'none', outlineOffset: -1.5,
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? 'var(--accent)' : 'transparent', fontSize: 'var(--text-xs)', fontWeight: isToday || isSelected ? 700 : 400,
                    color: isToday ? 'var(--on-accent)' : isSelected ? 'var(--accent)' : 'var(--text)',
                  }}>{date.getDate()}</div>
                  {shownEvents.map((ev) => <EventChip key={ev.id} event={ev} color={colorOf(ev)} onOpen={() => onEditEvent(ev)} />)}
                  {shownTasks.map((t) => <TaskChip key={t.id} task={t} onOpen={() => onEditTask(t)} />)}
                  {total > shownEvents.length + shownTasks.length && (
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', paddingLeft: 4 }}>+{total - shownEvents.length - shownTasks.length} autres</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
