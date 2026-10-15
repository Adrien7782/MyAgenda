import { useEffect, useMemo, useRef } from 'react';
import type { CalendarEvent } from '../../domain/event/event';
import type { Task } from '../../domain/task/task';
import { eventEnd, isAllDay, layoutOverlapping, type TimedItem } from '../../domain/event/eventRules';
import { DAYS_SHORT_FR, dayKey, formatTime, minutesOfDay, parseDayKey, weekdayIndex } from '../../domain/shared/date';
import { TaskAgendaLabel, taskAgendaStyle, taskTooltip } from './TaskAgendaItem';
import { useNow } from '../../shared/hooks/useNow';
import { itemsForDay } from './agendaItems';
import { EventChip } from './AgendaChip';
import type { AgendaFilter } from './useAgendaNavigation';

const HOUR_H = 48;
const TASK_BLOCK_MIN = 30;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const GUTTER = 48;

interface TimeGridViewProps {
  days: Date[];
  todayKey: string;
  selectedDay: string;
  tasks: Task[];
  events: CalendarEvent[];
  filter: AgendaFilter;
  colorOf: (ev: CalendarEvent) => string;
  onSelectDay: (key: string) => void;
  onCreateAt: (key: string, minutes: number) => void;
  onEditEvent: (ev: CalendarEvent) => void;
  onEditTask: (t: Task) => void;
}

type Block =
  | (TimedItem & { kind: 'event'; event: CalendarEvent })
  | (TimedItem & { kind: 'task'; task: Task });

/** Plage horaire de l'évènement ce jour-là (gère annuels et évènements à cheval sur minuit). */
function eventRangeOnDay(ev: CalendarEvent, key: string): [number, number] {
  const start = new Date(ev.start_at);
  if (ev.is_annual) {
    const s = minutesOfDay(start);
    return [s, Math.min(1440, s + ev.duration_min)];
  }
  const dayStart = parseDayKey(key).getTime();
  const s = Math.max(0, (start.getTime() - dayStart) / 60000);
  const e = Math.min(1440, (eventEnd(ev).getTime() - dayStart) / 60000);
  return [s, Math.max(e, s + 15)];
}

function buildBlocks(dayTasks: Task[], dayEvents: CalendarEvent[], key: string): (Block & { lane: number; lanes: number })[] {
  const items: Block[] = [
    ...dayEvents.filter((e) => !isAllDay(e)).map((event) => {
      const [startMin, endMin] = eventRangeOnDay(event, key);
      return { id: event.id, kind: 'event' as const, event, startMin, endMin };
    }),
    ...dayTasks.map((task) => {
      const startMin = minutesOfDay(new Date(task.deadline!));
      return { id: task.id, kind: 'task' as const, task, startMin, endMin: Math.min(1440, startMin + TASK_BLOCK_MIN) };
    }),
  ];
  const byId = new Map(items.map((i) => [i.id, i]));
  return layoutOverlapping(items).map((l) => ({ ...byId.get(l.id)!, lane: l.lane, lanes: l.lanes }));
}

/** Vue Jour / Semaine : grille horaire avec gestion des chevauchements. Double-clic = créer / modifier. */
export function TimeGridView({ days, todayKey, selectedDay, tasks, events, filter, colorOf, onSelectDay, onCreateAt, onEditEvent, onEditTask }: TimeGridViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = useNow();

  const columns = useMemo(() => days.map((d) => {
    const key = dayKey(d);
    const items = itemsForDay(tasks, events, key, filter);
    return { date: d, key, allDay: items.events.filter(isAllDay), blocks: buildBlocks(items.tasks, items.events, key) };
  }), [days, tasks, events, filter]);

  // Ouvre la grille vers 7h (ou plus tôt s'il y a un évènement matinal).
  const firstMin = Math.min(7 * 60, ...columns.flatMap((c) => c.blocks.map((b) => b.startMin)));
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (firstMin / 60) * HOUR_H - 8);
  }, [days.length, days[0]?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasAllDay = columns.some((c) => c.allDay.length > 0);
  const nowMin = minutesOfDay(now);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '0 16px 16px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)' }}>
      {/* En-têtes de jours + ligne "journée entière" */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, paddingRight: 4 }}>
        <div style={{ width: GUTTER, flexShrink: 0 }} />
        {columns.map(({ date, key, allDay }) => {
          const isToday = key === todayKey;
          const isSelected = key === selectedDay;
          return (
            <div key={key} style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--border)' }}>
              <button type="button" onClick={() => onSelectDay(key)} style={{
                width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: isSelected ? 'var(--accent-bg)' : 'transparent',
              }}>
                <span style={{ fontSize: 'var(--text-xs)', color: isToday ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {DAYS_SHORT_FR[weekdayIndex(date)]}
                </span>
                <span style={{
                  fontSize: 'var(--text-sm)', fontWeight: 700, minWidth: 24, height: 24, borderRadius: 12, padding: '0 4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? 'var(--accent)' : 'transparent', color: isToday ? 'var(--on-accent)' : isSelected ? 'var(--accent)' : 'var(--text)',
                }}>{date.getDate()}</span>
              </button>
              {hasAllDay && (
                <div style={{ padding: '2px 3px 4px', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 22 }}>
                  {allDay.map((ev) => <EventChip key={ev.id} event={ev} color={colorOf(ev)} onOpen={() => onEditEvent(ev)} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grille horaire (les heures défilent avec les jours) */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex' }}>
        <div style={{ width: GUTTER, flexShrink: 0 }}>
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_H, position: 'relative' }}>
              {h > 0 && <span style={{ position: 'absolute', top: -7, right: 8, fontSize: 10, color: 'var(--text-muted)' }}>{h}h</span>}
            </div>
          ))}
        </div>

        {columns.map(({ key, blocks }) => {
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              onDoubleClick={(e) => {
                const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                onCreateAt(key, Math.floor((y / HOUR_H) * 2) * 30);
              }}
              style={{
                flex: 1, minWidth: 0, position: 'relative', borderLeft: '1px solid var(--border)', height: HOUR_H * 24,
                background: isToday ? 'color-mix(in srgb, var(--accent) 3%, transparent)' : 'transparent',
              }}
            >
              {HOURS.map((h) => (
                <div key={h} style={{ position: 'absolute', top: h * HOUR_H, left: 0, right: 0, borderTop: '1px solid color-mix(in srgb, var(--border) 60%, transparent)' }} />
              ))}

              {blocks.map((b) => {
                const top = (b.startMin / 60) * HOUR_H;
                const height = Math.max(20, ((b.endMin - b.startMin) / 60) * HOUR_H - 2);
                const widthPct = 100 / b.lanes;
                const pos: React.CSSProperties = {
                  position: 'absolute', top: top + 1, height, left: `calc(${b.lane * widthPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`,
                  borderRadius: 6, overflow: 'hidden', cursor: 'pointer', padding: '3px 6px',
                };
                if (b.kind === 'event') {
                  const color = colorOf(b.event);
                  return (
                    <div key={b.id} title={`${b.event.title} — double-clic pour modifier`}
                      onDoubleClick={(e) => { e.stopPropagation(); onEditEvent(b.event); }}
                      style={{
                        ...pos,
                        background: `linear-gradient(180deg, color-mix(in srgb, ${color} 30%, var(--bg)), color-mix(in srgb, ${color} 20%, var(--bg)))`,
                        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`, borderLeft: `3px solid ${color}`,
                      }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: `color-mix(in srgb, ${color} 35%, var(--text))`, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: height < 34 ? 'nowrap' : 'normal' }}>
                        {b.event.title}
                      </div>
                      {height >= 34 && (
                        <div style={{ fontSize: 10, color: `color-mix(in srgb, ${color} 55%, var(--text-muted))`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {formatTime(b.event.start_at)}{b.event.location ? ` · ${b.event.location}` : ''}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={b.id} title={taskTooltip(b.task)}
                    onDoubleClick={(e) => { e.stopPropagation(); onEditTask(b.task); }}
                    style={{ ...pos, height: Math.min(height, 24), padding: '3px 6px', ...taskAgendaStyle(b.task) }}>
                    <TaskAgendaLabel task={b.task} fontSize={10.5} />
                  </div>
                );
              })}

              {isToday && (
                <div style={{ position: 'absolute', top: (nowMin / 60) * HOUR_H, left: 0, right: 0, height: 2, background: 'var(--danger)', pointerEvents: 'none' }}>
                  <span style={{ position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
