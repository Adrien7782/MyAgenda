import type { CalendarEvent } from '../domain/event/event';
import type { Task } from '../domain/task/task';
import { eventEnd, eventRecurrence, recurrenceInterval } from '../domain/event/eventRules';
import { normalizeInterval } from '../domain/shared/recurrence';
import { parseTags } from '../domain/task/taskRules';

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export function tasksToCsv(tasks: Task[]): string {
  const headers = ['id', 'titre', 'statut', 'priorité', 'labels', 'échéance', 'récurrence', 'commentaire', 'créé le'];
  const rows = tasks
    .filter((t) => t.is_deleted === 0)
    .map((t) => [
      t.id,
      csvCell(t.title),
      t.status,
      t.priority ?? '',
      csvCell(parseTags(t.tags).join('; ')),
      t.deadline ?? '',
      t.recurrence && t.recurrence !== 'none' && normalizeInterval(t.recurrence_interval) > 1
        ? `${t.recurrence}/${normalizeInterval(t.recurrence_interval)}`
        : t.recurrence ?? '',
      csvCell(t.comment ?? ''),
      t.created_at,
    ]);
  // BOM UTF-8 pour qu'Excel affiche correctement les accents.
  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/** Répétition au format iCalendar (lu par Google Agenda, Apple Calendrier, Outlook…). */
function rrule(ev: CalendarEvent): string[] {
  const rec = eventRecurrence(ev);
  if (rec === 'none') return [];
  const freq = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }[rec];
  // UNTIL inclut tout le dernier jour.
  const until = ev.recurrence_until ? `;UNTIL=${ev.recurrence_until.replace(/-/g, '')}T235959Z` : '';
  const n = recurrenceInterval(ev);
  return [`RRULE:FREQ=${freq}${n > 1 ? `;INTERVAL=${n}` : ''}${until}`];
}

export function agendaToIcs(tasks: Task[], events: CalendarEvent[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//My Agenda//FR'];
  for (const t of tasks.filter((t) => t.is_deleted === 0 && t.deadline)) {
    lines.push(
      'BEGIN:VTODO',
      `UID:${t.id}`,
      `SUMMARY:${icsText(t.title)}`,
      `DUE:${icsDate(new Date(t.deadline!))}`,
      `STATUS:${t.status === 'done' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
      ...(t.comment ? [`DESCRIPTION:${icsText(t.comment)}`] : []),
      'END:VTODO',
    );
  }
  for (const ev of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}`,
      `SUMMARY:${icsText(ev.title)}`,
      `DTSTART:${icsDate(new Date(ev.start_at))}`,
      `DTEND:${icsDate(eventEnd(ev))}`,
      ...rrule(ev),
      ...(ev.location ? [`LOCATION:${icsText(ev.location)}`] : []),
      ...(ev.comment ? [`DESCRIPTION:${icsText(ev.comment)}`] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
