import { useMemo, useState } from 'react';
import type { CalendarEvent } from '../domain/event/event';
import type { Task } from '../domain/task/task';
import { dayKey, parseDayKey } from '../domain/shared/date';
import { useEventColor, useEventStore } from '../store/eventStore';
import { useActiveTasks, useTaskStore } from '../store/taskStore';
import { useUiStore } from '../store/uiStore';
import { useNow } from '../shared/hooks/useNow';
import { AgendaToolbar } from '../widgets/agenda/AgendaToolbar';
import { MonthView } from '../widgets/agenda/MonthView';
import { TimeGridView } from '../widgets/agenda/TimeGridView';
import { DaySidePanel } from '../widgets/agenda/DaySidePanel';
import { itemsForDay } from '../widgets/agenda/agendaItems';
import { useAgendaNavigation } from '../widgets/agenda/useAgendaNavigation';
import { ImportCalendarModal } from '../widgets/calendar-sources/ImportCalendarModal';
import { usePhoneLayout } from '../shared/hooks/usePhoneLayout';

export function AgendaPage() {
  const phone = usePhoneLayout();
  const nav = useAgendaNavigation(phone);
  const tasks = useActiveTasks();
  const events = useEventStore((s) => s.events);
  const sources = useEventStore((s) => s.sources);
  const removeEvent = useEventStore((s) => s.remove);
  const { setStatus, moveToTrash } = useTaskStore();
  const { openTaskModal, openEventModal } = useUiStore();
  const colorOf = useEventColor();
  const todayKey = dayKey(useNow());
  const [importOpen, setImportOpen] = useState(false);

  const selected = useMemo(() => itemsForDay(tasks, events, nav.selectedDay, nav.filter), [tasks, events, nav.selectedDay, nav.filter]);
  const sourceNames = useMemo(() => new Map(sources.map((s) => [s.id, s.name])), [sources]);

  const editEvent = (ev: CalendarEvent) => openEventModal({ eventId: ev.id });
  const editTask = (t: Task) => openTaskModal({ taskId: t.id });
  const createEventAt = (key: string, minutes = 9 * 60) =>
    openEventModal({ defaultStart: parseDayKey(key, Math.floor(minutes / 60), minutes % 60).toISOString() });

  const common = { todayKey, selectedDay: nav.selectedDay, tasks, events, filter: nav.filter, colorOf, onSelectDay: nav.selectDay, onEditEvent: editEvent, onEditTask: editTask };

  const dayPanel = (inline: boolean) => (
    <DaySidePanel
      inline={inline}
      dayKey={nav.selectedDay}
      tasks={selected.tasks}
      events={selected.events}
      colorOf={colorOf}
      sourceName={(ev) => (ev.source_id ? sourceNames.get(ev.source_id) : undefined)}
      onAddEvent={() => createEventAt(nav.selectedDay)}
      onAddTask={() => openTaskModal({ prefillDeadline: parseDayKey(nav.selectedDay, 12).toISOString() })}
      onEditEvent={editEvent}
      onDeleteEvent={(ev) => removeEvent(ev.id)}
      onEditTask={editTask}
      onDeleteTask={(t) => moveToTrash(t.id)}
      onToggleTask={(t) => setStatus(t.id, t.status === 'done' ? 'todo' : 'done')}
    />
  );

  if (phone) {
    // Téléphone : mois compact + liste du jour en dessous (une seule zone qui défile), ou grille du jour.
    return (
      <div className="dot-grid" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', position: 'relative' }}>
        <AgendaToolbar nav={nav} onNewEvent={() => createEventAt(nav.selectedDay)} onImport={() => setImportOpen(true)} />
        {nav.view === 'month' ? (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <MonthView {...common} compact anchor={nav.anchor} onCreateOnDay={(key) => createEventAt(key)} />
            {dayPanel(true)}
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
            <TimeGridView {...common} days={nav.days} onCreateAt={createEventAt} />
          </div>
        )}
        {importOpen && <ImportCalendarModal onClose={() => setImportOpen(false)} />}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      <div className="dot-grid" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AgendaToolbar nav={nav} onNewEvent={() => createEventAt(nav.selectedDay)} onImport={() => setImportOpen(true)} />
        <div style={{ height: 12, flexShrink: 0 }} />
        {nav.view === 'month' ? (
          <MonthView {...common} anchor={nav.anchor} onCreateOnDay={(key) => createEventAt(key)} />
        ) : (
          <TimeGridView {...common} days={nav.days} onCreateAt={createEventAt} />
        )}
      </div>

      {dayPanel(false)}

      {importOpen && <ImportCalendarModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}
