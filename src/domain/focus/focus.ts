/**
 * Mode concentration : un compte à rebours.
 *
 * Le temps restant n'est jamais "décompté" seconde par seconde : on mémorise l'instant
 * de fin (`endsAt`). Toutes les fenêtres (grande, mini) calculent donc exactement le même
 * temps restant, et le compte à rebours continue même application cachée ou redémarrée.
 */
import { MINUTE_MS } from '../shared/date';

export type FocusStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface FocusSession {
  status: FocusStatus;
  /** Durée totale de la séance (y compris le temps ajouté en cours de route). */
  durationMs: number;
  /** En cours : instant de fin (ms depuis 1970). */
  endsAt: number | null;
  /** En pause : temps restant figé. */
  remainingMs: number | null;
  /** Début de la séance (identifie la séance, ex. pour la notification de fin). */
  startedAt: number | null;
}

export const FOCUS_MIN_MS = 1 * MINUTE_MS;
export const FOCUS_MAX_MS = 12 * 60 * MINUTE_MS;
export const FOCUS_DEFAULT_MS = 25 * MINUTE_MS;

export const FOCUS_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 15, label: '15 min' },
  { minutes: 25, label: '25 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 h' },
  { minutes: 90, label: '1 h 30' },
  { minutes: 120, label: '2 h' },
];

export function clampDuration(ms: number): number {
  return Math.min(FOCUS_MAX_MS, Math.max(FOCUS_MIN_MS, Math.round(ms / MINUTE_MS) * MINUTE_MS));
}

export function idleSession(durationMs = FOCUS_DEFAULT_MS): FocusSession {
  return { status: 'idle', durationMs: clampDuration(durationMs), endsAt: null, remainingMs: null, startedAt: null };
}

export function remainingMs(s: FocusSession, now: number): number {
  switch (s.status) {
    case 'running': return Math.max(0, (s.endsAt ?? now) - now);
    case 'paused': return Math.max(0, s.remainingMs ?? 0);
    case 'finished': return 0;
    default: return s.durationMs;
  }
}

/** Part de temps RESTANT (1 → 0) : la jauge se vide au fil de la séance. */
export function remainingFraction(s: FocusSession, now: number): number {
  if (s.durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, remainingMs(s, now) / s.durationMs));
}

/** Séance démarrée et pas encore finie (en cours ou en pause). */
export function isActive(s: FocusSession): boolean {
  return s.status === 'running' || s.status === 'paused';
}

export function start(s: FocusSession, now: number): FocusSession {
  const durationMs = clampDuration(s.durationMs);
  return { status: 'running', durationMs, endsAt: now + durationMs, remainingMs: null, startedAt: now };
}

export function pause(s: FocusSession, now: number): FocusSession {
  if (s.status !== 'running') return s;
  return { ...s, status: 'paused', remainingMs: remainingMs(s, now), endsAt: null };
}

export function resume(s: FocusSession, now: number): FocusSession {
  if (s.status !== 'paused') return s;
  return { ...s, status: 'running', endsAt: now + (s.remainingMs ?? 0), remainingMs: null };
}

/** Arrêter : on revient au réglage, avec la même durée prête à relancer. */
export function stop(s: FocusSession): FocusSession {
  return idleSession(s.durationMs);
}

/** Ajoute (ou retire, si négatif) du temps à une séance active ou au réglage. */
export function addTime(s: FocusSession, deltaMs: number, now: number): FocusSession {
  if (s.status === 'idle' || s.status === 'finished') return idleSession(s.durationMs + deltaMs);
  const left = remainingMs(s, now);
  const delta = Math.max(deltaMs, -left + 1000); // jamais en dessous d'une seconde
  const durationMs = Math.max(s.durationMs + delta, 1000);
  return s.status === 'running'
    ? { ...s, durationMs, endsAt: (s.endsAt ?? now) + delta }
    : { ...s, durationMs, remainingMs: left + delta };
}

/** Une séance en cours dont l'heure de fin est passée devient "terminée". */
export function settle(s: FocusSession, now: number): FocusSession {
  return s.status === 'running' && (s.endsAt ?? 0) <= now ? { ...s, status: 'finished', endsAt: null, remainingMs: 0 } : s;
}

/** 25:00, 4:05, 1:30:00 — arrondi à la seconde supérieure (on n'affiche jamais 0:00 avant la fin). */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / MINUTE_MS);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Lecture tolérante de la séance mémorisée (réglage JSON). */
export function parseSession(raw: string | null): FocusSession {
  if (!raw) return idleSession();
  try {
    const s = JSON.parse(raw) as Partial<FocusSession>;
    const status: FocusStatus = s.status === 'running' || s.status === 'paused' || s.status === 'finished' ? s.status : 'idle';
    const durationMs = typeof s.durationMs === 'number' && s.durationMs > 0 ? s.durationMs : FOCUS_DEFAULT_MS;
    return {
      status,
      durationMs,
      endsAt: typeof s.endsAt === 'number' ? s.endsAt : null,
      remainingMs: typeof s.remainingMs === 'number' ? s.remainingMs : null,
      startedAt: typeof s.startedAt === 'number' ? s.startedAt : null,
    };
  } catch {
    return idleSession();
  }
}
