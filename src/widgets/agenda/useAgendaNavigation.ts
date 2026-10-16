import { useState } from 'react';
import {
  addDays, addMonths, dayKey, formatWeekRange, MONTHS_FR, parseDayKey, startOfWeek,
} from '../../domain/shared/date';
import { useSettingsStore, type AgendaView } from '../../store/settingsStore';

export type AgendaFilter = 'all' | 'tasks' | 'events';

/** Navigation dans le calendrier : vue, date affichée, jour sélectionné. */
export function useAgendaNavigation(phone = false) {
  const savedView = useSettingsStore((s) => s.agendaView);
  // Téléphone : pas de vue Semaine (7 colonnes illisibles), on affiche le jour.
  const view: AgendaView = phone && savedView === 'week' ? 'day' : savedView;
  const setView = useSettingsStore((s) => s.setAgendaView);
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [filter, setFilter] = useState<AgendaFilter>('all');

  function move(direction: 1 | -1) {
    const next = view === 'month' ? addMonths(anchor, direction) : addDays(anchor, direction * (view === 'week' ? 7 : 1));
    setAnchor(next);
    if (view === 'day') setSelectedDay(dayKey(next));
  }

  function goToday() {
    const now = new Date();
    setAnchor(now);
    setSelectedDay(dayKey(now));
  }

  function selectDay(key: string) {
    setSelectedDay(key);
    if (view === 'day') setAnchor(parseDayKey(key));
  }

  function changeView(v: AgendaView) {
    setView(v);
    setAnchor(parseDayKey(selectedDay)); // la nouvelle vue s'ouvre sur le jour sélectionné
  }

  const weekStart = startOfWeek(anchor);
  const days: Date[] =
    view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : view === 'day' ? [anchor] : [];

  const label =
    view === 'month'
      ? `${MONTHS_FR[anchor.getMonth()]} ${anchor.getFullYear()}`
      : view === 'week'
        ? formatWeekRange(weekStart)
        : anchor.toLocaleDateString('fr-FR', phone ? { weekday: 'short', day: 'numeric', month: 'short' } : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return { view, changeView, anchor, days, label, move, goToday, selectedDay, selectDay, filter, setFilter };
}

export type AgendaNavigation = ReturnType<typeof useAgendaNavigation>;
