import { useState } from 'react';
import {
  addDays, addMonths, dayKey, formatWeekRange, MONTHS_FR, parseDayKey, startOfWeek,
} from '../../domain/shared/date';
import { useSettingsStore, type AgendaView } from '../../store/settingsStore';

export type AgendaFilter = 'all' | 'tasks' | 'events';

/** Navigation dans le calendrier : vue, date affichée, jour sélectionné. */
export function useAgendaNavigation(phone = false) {
  const view: AgendaView = useSettingsStore((s) => s.agendaView);
  const setView = useSettingsStore((s) => s.setAgendaView);
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [filter, setFilter] = useState<AgendaFilter>('all');

  const shift = (date: Date, n: number) => (view === 'month' ? addMonths(date, n) : addDays(date, n * (view === 'week' ? 7 : 1)));

  function move(direction: 1 | -1) {
    const next = shift(anchor, direction);
    setAnchor(next);
    if (view === 'day') setSelectedDay(dayKey(next));
  }

  /** Période voisine (-1 précédente, 0 actuelle, +1 suivante) : utilisée par le glissement sur téléphone. */
  function periodAt(offset: -1 | 0 | 1) {
    const a = shift(anchor, offset);
    const ws = startOfWeek(a);
    const periodDays: Date[] = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(ws, i)) : view === 'day' ? [a] : [];
    const key = view === 'month' ? `${a.getFullYear()}-${a.getMonth() + 1}` : dayKey(view === 'week' ? ws : a);
    return { anchor: a, days: periodDays, key: `${view}:${key}` };
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

  /** Ouvre un jour précis dans la vue Jour (appui sur une case du mois, sur téléphone). */
  function openDay(key: string) {
    setSelectedDay(key);
    setAnchor(parseDayKey(key));
    setView('day');
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
        ? phone ? formatShortWeek(weekStart) : formatWeekRange(weekStart)
        : anchor.toLocaleDateString('fr-FR', phone ? { weekday: 'short', day: 'numeric', month: 'short' } : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return { view, changeView, openDay, anchor, days, label, move, periodAt, goToday, selectedDay, selectDay, filter, setFilter };
}

/** « 12–18 oct. » ou « 28 sept. – 4 oct. » */
function formatShortWeek(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const m = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' });
  return weekStart.getMonth() === end.getMonth()
    ? `${weekStart.getDate()}–${end.getDate()} ${m(end)}`
    : `${weekStart.getDate()} ${m(weekStart)} – ${end.getDate()} ${m(end)}`;
}

export type AgendaNavigation = ReturnType<typeof useAgendaNavigation>;
