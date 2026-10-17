import { useMemo } from 'react';
import type { CalendarEvent } from '../../domain/event/event';
import type { Task } from '../../domain/task/task';
import { formatTime, parseDayKey } from '../../domain/shared/date';
import { eventRecurrence, isAllDay } from '../../domain/event/eventRules';
import { useElementSize } from '../../shared/hooks/useElementSize';
import { agendaTaskColor } from '../../shared/presentation/taskPresentation';
import { hiddenPerDay, layoutWeek, monthWeeks, type WeekSegment } from './monthLayout';
import type { AgendaFilter } from './useAgendaNavigation';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const HEADER_H = 24;
const DAY_NUMBER_H = 22;
const LANE_H = 15;

interface Props {
  anchor: Date;
  todayKey: string;
  selectedDay: string;
  tasks: Task[];
  events: CalendarEvent[];
  filter: AgendaFilter;
  colorOf: (ev: CalendarEvent) => string;
  /** Appui sur un jour : ouvre la vue Jour. */
  onOpenDay: (key: string) => void;
}

function Bar({ seg, colorOf }: { seg: WeekSegment; colorOf: (ev: CalendarEvent) => string }) {
  const span = seg.endCol - seg.startCol + 1;
  const inset = 2;
  const left = `calc(${seg.startCol} * 100% / 7 + ${seg.continuesBefore ? 0 : inset}px)`;
  const width = `calc(${span} * 100% / 7 - ${(seg.continuesBefore ? 0 : inset) + (seg.continuesAfter ? 0 : inset)}px)`;
  const radius = `${seg.continuesBefore ? 0 : 4}px ${seg.continuesAfter ? 0 : 4}px ${seg.continuesAfter ? 0 : 4}px ${seg.continuesBefore ? 0 : 4}px`;

  let color: string;
  let label: string;
  let done = false;
  if (seg.item.kind === 'event') {
    const ev = seg.item.event;
    color = colorOf(ev);
    label = !seg.long && !isAllDay(ev) && eventRecurrence(ev) !== 'yearly' ? `${formatTime(ev.start_at)} ${ev.title}` : ev.title;
  } else {
    color = agendaTaskColor(seg.item.task);
    done = seg.item.task.status === 'done';
    label = seg.item.task.title;
  }

  return (
    <div style={{
      position: 'absolute', top: DAY_NUMBER_H + seg.lane * LANE_H, left, width, height: LANE_H - 2,
      borderRadius: radius, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      fontSize: 9.5, lineHeight: `${LANE_H - 2}px`, padding: '0 3px', pointerEvents: 'none',
      fontWeight: seg.long ? 600 : 500,
      // Plusieurs jours : barre pleine. Un seul jour : fond léger + liseré de couleur.
      background: seg.long ? `color-mix(in srgb, ${color} 62%, var(--surface))` : `color-mix(in srgb, ${color} 20%, var(--surface))`,
      color: seg.long ? `color-mix(in srgb, ${color} 15%, var(--text))` : `color-mix(in srgb, ${color} 45%, var(--text))`,
      borderLeft: seg.long || seg.continuesBefore ? 'none' : `2px solid ${color}`,
      textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1,
    }}>
      {seg.item.kind === 'task' && <span style={{ marginRight: 2 }}>{done ? '✓' : '○'}</span>}
      {label}
    </div>
  );
}

/**
 * Mois sur téléphone : la grille occupe tout l'écran, chaque case montre les évènements et
 * tâches du jour sous forme de petites barres ; un voyage sur plusieurs jours forme une barre
 * continue. Toucher un jour ouvre sa vue détaillée.
 */
export function MobileMonthView({ anchor, todayKey, selectedDay, tasks, events, filter, colorOf, onOpenDay }: Props) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const weeks = useMemo(() => monthWeeks(anchor), [anchor]);
  const month = anchor.getMonth();
  const layouts = useMemo(() => weeks.map((w) => layoutWeek(w, tasks, events, filter)), [weeks, tasks, events, filter]);

  const rowH = size.height > 0 ? (size.height - HEADER_H) / weeks.length : 80;
  const lanes = Math.max(1, Math.floor((rowH - DAY_NUMBER_H - 2) / LANE_H));

  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
      <div style={{ height: HEADER_H, flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
        {WEEKDAYS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', lineHeight: `${HEADER_H}px` }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, w) => {
        const segs = layouts[w];
        const hidden = hiddenPerDay(segs, lanes);
        return (
          <div key={week[0]} style={{ flex: 1, minHeight: 0, position: 'relative', borderBottom: w < weeks.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {week.map((key, c) => {
                const date = parseDayKey(key);
                const inMonth = date.getMonth() === month;
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;
                return (
                  <button key={key} type="button" onClick={() => onOpenDay(key)} aria-label={date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    style={{
                      position: 'relative', borderRight: c < 6 ? '1px solid color-mix(in srgb, var(--border) 60%, transparent)' : 'none',
                      background: isSelected ? 'var(--accent-bg)' : inMonth ? 'transparent' : 'color-mix(in srgb, var(--surface-el) 45%, transparent)',
                      display: 'block', textAlign: 'left',
                    }}>
                    <span style={{
                      position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: isToday || isSelected ? 700 : 500,
                      background: isToday ? 'var(--accent)' : 'transparent',
                      color: isToday ? 'var(--on-accent)' : isSelected ? 'var(--accent)' : inMonth ? 'var(--text)' : 'var(--text-muted)',
                    }}>{date.getDate()}</span>
                    {hidden[c] > 0 && (
                      <span style={{ position: 'absolute', top: 5, right: 3, fontSize: 9, fontWeight: 600, color: 'var(--text-muted)' }}>+{hidden[c]}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {segs.filter((s) => s.lane < lanes).map((s) => <Bar key={`${s.item.kind}-${s.item.id}`} seg={s} colorOf={colorOf} />)}
          </div>
        );
      })}
    </div>
  );
}
