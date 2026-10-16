/**
 * Rappels : soit un délai avant l'échéance (tâche) / le début (évènement), soit une date fixe.
 * Stockés sur la tâche ou l'évènement dans deux colonnes :
 *   reminder_offset_min — minutes avant l'échéance (null si pas de délai)
 *   reminder_at         — date ISO fixe (null si pas de date fixe)
 */
import type { CalendarEvent } from '../event/event';
import type { Task } from '../task/task';
import { nextOccurrenceStart } from '../event/eventRules';
import { MINUTE_MS } from '../shared/date';

export interface ReminderFields {
  reminder_offset_min?: number | null;
  reminder_at?: string | null;
}

export type ReminderSetting =
  | { kind: 'none' }
  | { kind: 'before'; minutes: number }
  | { kind: 'at'; at: string };

export const REMINDER_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 0, label: "À l'heure" },
  { minutes: 5, label: '5 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 h' },
  { minutes: 120, label: '2 h' },
  { minutes: 1440, label: '1 jour' },
];

export function readReminder(f: ReminderFields): ReminderSetting {
  if (f.reminder_at) return { kind: 'at', at: f.reminder_at };
  if (f.reminder_offset_min !== null && f.reminder_offset_min !== undefined) return { kind: 'before', minutes: f.reminder_offset_min };
  return { kind: 'none' };
}

export function writeReminder(r: ReminderSetting): Required<ReminderFields> {
  if (r.kind === 'at') return { reminder_at: r.at, reminder_offset_min: null };
  if (r.kind === 'before') return { reminder_at: null, reminder_offset_min: Math.max(0, Math.round(r.minutes)) };
  return { reminder_at: null, reminder_offset_min: null };
}

/** Moment où le rappel doit sonner (null si aucun rappel ou si "avant l'échéance" sans échéance). */
export function reminderTime(r: ReminderSetting, due: Date | null): Date | null {
  if (r.kind === 'at') return new Date(r.at);
  if (r.kind === 'before') return due ? new Date(due.getTime() - r.minutes * MINUTE_MS) : null;
  return null;
}

export function formatOffset(minutes: number): string {
  if (minutes === 0) return "à l'heure exacte";
  if (minutes % 1440 === 0) return `${minutes / 1440} jour${minutes / 1440 > 1 ? 's' : ''} avant`;
  if (minutes % 60 === 0) return `${minutes / 60} h avant`;
  if (minutes > 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min avant`;
  return `${minutes} min avant`;
}

// ── Planification ───────────────────────────────────────────────────────────

/** Notification à déclencher à un instant donné (transmise au planificateur natif). */
export interface PlannedReminder {
  /** Clé unique : une même notification n'est jamais envoyée deux fois. */
  key: string;
  atMs: number;
  title: string;
  body: string;
}

export interface PlanOptions {
  now?: number;
  /** Fenêtre future planifiée (le plan est recalculé régulièrement). */
  horizonMs?: number;
  /** Retard toléré : un rappel manqué de plus que ça n'est plus envoyé. */
  graceMs?: number;
  /** Alertes automatiques pour les éléments sans rappel personnalisé. */
  autoAlerts?: boolean;
}

const AUTO_TASK_WARN_MIN = 30;
const AUTO_EVENT_WARN_MIN = 15;

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function fmtWhen(due: Date, now: number): string {
  const sameDay = new Date(now).toDateString() === due.toDateString();
  return sameDay ? `à ${fmtTime(due)}` : `le ${due.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${fmtTime(due)}`;
}

/** Calcule toutes les notifications à venir (rappels personnalisés + alertes automatiques). */
export function planReminders(tasks: Task[], events: CalendarEvent[], opts: PlanOptions = {}): PlannedReminder[] {
  const now = opts.now ?? Date.now();
  const from = now - (opts.graceMs ?? 10 * MINUTE_MS);
  const to = now + (opts.horizonMs ?? 48 * 60 * MINUTE_MS);
  const out: PlannedReminder[] = [];
  const push = (r: PlannedReminder) => { if (r.atMs >= from && r.atMs <= to) out.push(r); };

  for (const t of tasks) {
    if (t.is_deleted || t.status === 'done') continue;
    const due = t.deadline ? new Date(t.deadline) : null;
    const setting = readReminder(t);
    const at = reminderTime(setting, due);
    if (at) {
      push({
        key: `task:${t.id}:${at.toISOString()}`,
        atMs: at.getTime(),
        title: '🔔 Rappel',
        body: due ? `${t.title} — échéance ${fmtWhen(due, at.getTime())}` : t.title,
      });
    } else if (opts.autoAlerts && due && setting.kind === 'none') {
      push({ key: `auto-warn:${t.id}:${due.toISOString()}`, atMs: due.getTime() - AUTO_TASK_WARN_MIN * MINUTE_MS, title: `⏰ Dans ${AUTO_TASK_WARN_MIN} min`, body: t.title });
    }
    // Une seule notification par tâche : pas de seconde alerte « Échéance atteinte » à l'heure de l'échéance.
  }

  for (const ev of events) {
    if (ev.is_deleted) continue;
    const start = nextOccurrenceStart(ev, new Date(now));
    const setting = readReminder(ev);
    // Pour un évènement annuel, un délai s'applique à l'occurrence de l'année.
    const at = reminderTime(setting, start);
    const place = ev.location ? ` — ${ev.location}` : '';
    if (at) {
      push({ key: `event:${ev.id}:${at.toISOString()}`, atMs: at.getTime(), title: '🔔 Rappel', body: `${ev.title}${place} — ${fmtWhen(start, at.getTime())}` });
    } else if (opts.autoAlerts && setting.kind === 'none' && !ev.source_id) {
      // Alerte automatique seulement pour les évènements personnels (pas les 34 cours importés).
      push({ key: `auto-event:${ev.id}:${start.toISOString()}`, atMs: start.getTime() - AUTO_EVENT_WARN_MIN * MINUTE_MS, title: `📅 Dans ${AUTO_EVENT_WARN_MIN} min`, body: `${ev.title}${place}` });
    }
  }

  return out.sort((a, b) => a.atMs - b.atMs);
}
