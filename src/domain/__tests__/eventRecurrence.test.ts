import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../event/event';
import { nextOccurrenceStart, occurrenceCovering, occurrencesBetween, occursOnDay } from '../event/eventRules';
import { planReminders } from '../reminder/reminder';
import { layoutWeek } from '../../widgets/agenda/monthLayout';

const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'e', title: 'Cours', start_at: new Date(2026, 9, 5, 9, 0).toISOString(), duration_min: 60,
  is_annual: 0, created_at: '', updated_at: '', ...p,
});
const days = (e: CalendarEvent, keys: string[]) => keys.filter((k) => occursOnDay(e, k));

describe('évènements répétés', () => {
  it('hebdomadaire : même jour chaque semaine, à partir du premier jour', () => {
    const e = ev({ recurrence: 'weekly' }); // lundi 5 octobre 2026
    expect(days(e, ['2026-09-28', '2026-10-05', '2026-10-06', '2026-10-12', '2026-10-19', '2027-01-04'])).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2027-01-04']);
  });

  it("jusqu'au : dernier jour inclus", () => {
    const e = ev({ recurrence: 'daily', recurrence_until: '2026-10-07' });
    expect(days(e, ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'])).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
  });

  it('mensuel le 31 : seulement les mois qui en ont un', () => {
    const e = ev({ start_at: new Date(2026, 0, 31, 10).toISOString(), recurrence: 'monthly' });
    expect(days(e, ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31'])).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
  });

  it("annuel : ancien indicateur is_annual toujours compris", () => {
    const e = ev({ is_annual: 1, start_at: new Date(2020, 2, 14, 0, 0).toISOString(), duration_min: 1440 });
    expect(occursOnDay(e, '2027-03-14')).toBe(true);
    expect(occursOnDay(e, '2027-03-15')).toBe(false);
    expect(nextOccurrenceStart(e, new Date(2026, 9, 17)).getFullYear()).toBe(2027);
  });

  it("l'heure est conservée à chaque occurrence, même après le changement d'heure", () => {
    const e = ev({ recurrence: 'daily', start_at: new Date(2026, 9, 20, 9, 30).toISOString() });
    const occ = occurrenceCovering(e, '2026-11-02')!; // après le passage à l'heure d'hiver
    expect([occ.start.getHours(), occ.start.getMinutes()]).toEqual([9, 30]);
  });

  it('voyage de 3 jours répété chaque semaine : chaque occurrence couvre ses 3 jours', () => {
    const e = ev({ start_at: new Date(2026, 9, 5).toISOString(), duration_min: 3 * 1440, recurrence: 'weekly' });
    expect(days(e, ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'])).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
  });

  it('occurrences dans une période', () => {
    const e = ev({ recurrence: 'weekly' });
    const list = occurrencesBetween(e, new Date(2026, 9, 1), new Date(2026, 10, 1));
    expect(list.map((d) => d.getDate())).toEqual([5, 12, 19, 26]);
  });

  it('vue Mois : un cours quotidien = une barre par jour, pas une barre de 7 jours', () => {
    const e = ev({ recurrence: 'daily' });
    const week = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];
    const segs = layoutWeek(week, [], [e], 'all');
    expect(segs).toHaveLength(7);
    expect(segs.every((s) => s.startCol === s.endCol && !s.long && !s.continuesBefore)).toBe(true);
    expect(new Set(segs.map((s) => s.item.id)).size).toBe(7);
  });

  it('rappels : un par occurrence dans la fenêtre planifiée', () => {
    const e = ev({ recurrence: 'daily', reminder_offset_min: 15 });
    const now = new Date(2026, 9, 10, 12).getTime();
    const plan = planReminders([], [e], { now, horizonMs: 3 * 86_400_000 });
    expect(plan.map((p) => new Date(p.atMs).getDate())).toEqual([11, 12, 13]);
    expect(new Set(plan.map((p) => p.key)).size).toBe(3);
  });
});
