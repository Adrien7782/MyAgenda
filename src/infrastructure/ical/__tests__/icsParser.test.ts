import { describe, expect, it } from 'vitest';
import { parseIcs } from '../icsParser';

const range = { rangeStart: new Date('2026-01-01T00:00:00Z'), rangeEnd: new Date('2027-12-31T00:00:00Z') };
const cal = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR\r\n`;

describe('parseIcs', () => {
  it('lit un évènement UTC typique ADE (lignes repliées, échappements, lieu)', () => {
    const text = cal([
      'BEGIN:VEVENT',
      'DTSTAMP:20261001T080000Z',
      'DTSTART:20261020T070000Z',
      'DTEND:20261020T090000Z',
      'SUMMARY:CM Réseaux\\, groupe A',
      'LOCATION:Amphi B',
      'DESCRIPTION:\\nL3 INFO\\nM. Dupont\\n(Exporté le:01/10/2026)',
      ' suite repliée',
      'UID:ADEabc123',
      'END:VEVENT',
    ].join('\r\n'));
    const [ev] = parseIcs(text, range);
    expect(ev.title).toBe('CM Réseaux, groupe A');
    expect(ev.location).toBe('Amphi B');
    expect(ev.start.toISOString()).toBe('2026-10-20T07:00:00.000Z');
    expect(ev.end.toISOString()).toBe('2026-10-20T09:00:00.000Z');
    expect(ev.description).toBe('L3 INFO\nM. Dupont\n(Exporté le:01/10/2026)suite repliée');
    expect(ev.allDay).toBe(false);
  });

  it('convertit les heures TZID=Europe/Paris (été et hiver)', () => {
    const text = cal([
      'BEGIN:VEVENT', 'UID:a', 'SUMMARY:Été', 'DTSTART;TZID=Europe/Paris:20260615T100000', 'DTEND;TZID=Europe/Paris:20260615T120000', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:b', 'SUMMARY:Hiver', 'DTSTART;TZID="Europe/Paris":20261215T100000', 'DURATION:PT1H30M', 'END:VEVENT',
    ].join('\r\n'));
    const [ete, hiver] = parseIcs(text, range);
    expect(ete.start.toISOString()).toBe('2026-06-15T08:00:00.000Z');
    expect(hiver.start.toISOString()).toBe('2026-12-15T09:00:00.000Z');
    expect(hiver.end.getTime() - hiver.start.getTime()).toBe(90 * 60_000);
  });

  it('gère les journées entières et ignore les VALARM / évènements annulés', () => {
    const text = cal([
      'BEGIN:VEVENT', 'UID:c', 'SUMMARY:Férié', 'DTSTART;VALUE=DATE:20261111', 'DTEND;VALUE=DATE:20261112',
      'BEGIN:VALARM', 'TRIGGER:-PT15M', 'DESCRIPTION:Rappel', 'END:VALARM', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:d', 'SUMMARY:Annulé', 'STATUS:CANCELLED', 'DTSTART:20261112T080000Z', 'END:VEVENT',
    ].join('\r\n'));
    const evs = parseIcs(text, range);
    expect(evs).toHaveLength(1);
    expect(evs[0].allDay).toBe(true);
    expect(evs[0].description).toBeUndefined();
    expect(evs[0].end.getTime() - evs[0].start.getTime()).toBe(86_400_000);
  });

  it('développe une RRULE hebdomadaire avec BYDAY, COUNT, EXDATE et occurrence modifiée', () => {
    const text = cal([
      'BEGIN:VEVENT', 'UID:td', 'SUMMARY:TD Algo',
      'DTSTART:20260907T080000Z', 'DTEND:20260907T100000Z',
      'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6',
      'EXDATE:20260909T080000Z',
      'END:VEVENT',
      'BEGIN:VEVENT', 'UID:td', 'SUMMARY:TD Algo (salle changée)', 'RECURRENCE-ID:20260914T080000Z',
      'DTSTART:20260914T120000Z', 'DTEND:20260914T140000Z', 'LOCATION:B204', 'END:VEVENT',
    ].join('\r\n'));
    const evs = parseIcs(text, range);
    // 6 occurrences : 7, 9(exclue), 14(modifiée), 16, 21, 23 → 5 visibles dont 1 déplacée
    expect(evs.map((e) => e.start.toISOString().slice(0, 13))).toEqual([
      '2026-09-07T08', '2026-09-14T12', '2026-09-16T08', '2026-09-21T08', '2026-09-23T08',
    ]);
    expect(evs[1].location).toBe('B204');
    expect(new Set(evs.map((e) => e.uid)).size).toBe(5);
  });

  it('respecte UNTIL et la fenêtre demandée', () => {
    const text = cal(['BEGIN:VEVENT', 'UID:x', 'SUMMARY:Daily', 'DTSTART:20261001T080000Z', 'DURATION:PT1H', 'RRULE:FREQ=DAILY;UNTIL=20261005T235959Z', 'END:VEVENT'].join('\r\n'));
    expect(parseIcs(text, range)).toHaveLength(5);
    const narrow = { rangeStart: new Date('2026-10-03T00:00:00Z'), rangeEnd: new Date('2026-10-04T00:00:00Z') };
    expect(parseIcs(text, narrow)).toHaveLength(1);
  });

  it('refuse un contenu qui n’est pas un calendrier (ex : page de connexion HTML)', () => {
    expect(() => parseIcs('<html>Login</html>', range)).toThrow(/iCalendar/);
  });
});
