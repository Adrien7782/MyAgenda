/**
 * Parseur iCalendar (RFC 5545) minimal mais robuste, pensé pour les emplois du temps
 * universitaires (ADE, Hyperplanning, Celcat, Moodle…) et les exports Google / Outlook.
 *
 * Gère : lignes repliées, échappements, DTSTART/DTEND/DURATION, dates UTC / TZID / flottantes,
 * journées entières, STATUS:CANCELLED, RRULE (DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL, COUNT,
 * UNTIL, BYDAY), EXDATE et RECURRENCE-ID (occurrences modifiées).
 */

export interface IcsEvent {
  /** Identifiant unique de l'occurrence (UID + date pour les récurrences). */
  uid: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  description?: string;
}

export interface IcsParseOptions {
  rangeStart: Date;
  rangeEnd: Date;
  /** Garde-fou contre les RRULE infinies. */
  maxOccurrencesPerEvent?: number;
}

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

interface RawEvent {
  props: Prop[];
}

interface ParsedDate {
  date: Date;
  allDay: boolean;
}

// ── Lecture des lignes ──────────────────────────────────────────────────────

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function parseLine(line: string): Prop | null {
  let inQuotes = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ':' && !inQuotes) {
      colon = i;
      break;
    }
  }
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...rawParams] = head.split(';');
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value };
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function readEvents(text: string): RawEvent[] {
  const events: RawEvent[] = [];
  let current: RawEvent | null = null;
  let nested = 0; // VALARM… à l'intérieur d'un VEVENT

  for (const line of unfold(text)) {
    if (!line.trim()) continue;
    const upper = line.toUpperCase();
    if (upper === 'BEGIN:VEVENT') {
      current = { props: [] };
      nested = 0;
      continue;
    }
    if (!current) continue;
    if (upper === 'END:VEVENT') {
      events.push(current);
      current = null;
      continue;
    }
    if (upper.startsWith('BEGIN:')) { nested++; continue; }
    if (upper.startsWith('END:')) { nested = Math.max(0, nested - 1); continue; }
    if (nested > 0) continue;
    const prop = parseLine(line);
    if (prop) current.props.push(prop);
  }
  return events;
}

// ── Dates & fuseaux ─────────────────────────────────────────────────────────

/** Quelques noms de fuseaux Windows (exports Outlook) vers IANA. */
const WINDOWS_TZ: Record<string, string> = {
  'Romance Standard Time': 'Europe/Paris',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central Europe Standard Time': 'Europe/Budapest',
  'GMT Standard Time': 'Europe/London',
  'UTC': 'UTC',
};

function normalizeTzid(tzid: string | undefined): string | undefined {
  if (!tzid) return undefined;
  let tz = tzid.replace(/^\/+/, '').trim();
  tz = WINDOWS_TZ[tz] ?? tz;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return undefined; // Fuseau inconnu → on traite l'heure comme locale.
  }
}

/** Décalage (ms) du fuseau `tz` par rapport à UTC à l'instant `utcMs`. */
function tzOffsetMs(tz: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - utcMs;
}

function zonedToDate(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): Date {
  const guess = Date.UTC(y, mo, d, h, mi, s);
  let ts = guess - tzOffsetMs(tz, guess);
  ts = guess - tzOffsetMs(tz, ts); // 2e passe pour les changements d'heure
  return new Date(ts);
}

function parseDateValue(value: string, params: Record<string, string>): ParsedDate | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, ys, mos, ds, hs, mis, ss, z] = m;
  const y = Number(ys), mo = Number(mos) - 1, d = Number(ds);
  if (hs === undefined || params.VALUE === 'DATE') {
    return { date: new Date(y, mo, d), allDay: true };
  }
  const h = Number(hs), mi = Number(mis), s = Number(ss ?? 0);
  if (z) return { date: new Date(Date.UTC(y, mo, d, h, mi, s)), allDay: false };
  const tz = normalizeTzid(params.TZID);
  if (tz) return { date: zonedToDate(y, mo, d, h, mi, s, tz), allDay: false };
  return { date: new Date(y, mo, d, h, mi, s), allDay: false }; // heure "flottante" = locale
}

function parseDuration(value: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, sign, w, d, h, mi, s] = m;
  const ms =
    (Number(w ?? 0) * 7 * 86400 + Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(mi ?? 0) * 60 + Number(s ?? 0)) * 1000;
  return sign === '-' ? -ms : ms;
}

// ── Récurrences ─────────────────────────────────────────────────────────────

const BYDAY_INDEX: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

interface RRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  count?: number;
  until?: Date;
  byDay?: number[];
}

function parseRRule(value: string): RRule | null {
  const parts: Record<string, string> = {};
  for (const kv of value.split(';')) {
    const [k, v] = kv.split('=');
    if (k && v) parts[k.toUpperCase()] = v;
  }
  const freq = parts.FREQ as RRule['freq'];
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null;
  const rule: RRule = { freq, interval: Math.max(1, Number(parts.INTERVAL ?? 1)) };
  if (parts.COUNT) rule.count = Number(parts.COUNT);
  if (parts.UNTIL) rule.until = parseDateValue(parts.UNTIL, {})?.date;
  if (parts.BYDAY) {
    rule.byDay = parts.BYDAY.split(',')
      .map((d) => BYDAY_INDEX[d.replace(/^[+-]?\d+/, '').toUpperCase()])
      .filter((d) => d !== undefined);
  }
  return rule;
}

/** Génère les dates de début (heure murale locale conservée lors des changements d'heure). */
function expandRRule(start: Date, rule: RRule, rangeEnd: Date, max: number): Date[] {
  const out: Date[] = [];
  const limit = rule.until && rule.until < rangeEnd ? rule.until : rangeEnd;
  const push = (d: Date) => {
    if (d < start) return true;
    if (d > limit) return false;
    if (rule.count !== undefined && out.length >= rule.count) return false;
    out.push(d);
    return out.length < max;
  };

  if (rule.freq === 'WEEKLY' && rule.byDay?.length) {
    const days = [...rule.byDay].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // lundi
    for (let w = 0; w < max * 2; w += rule.interval) {
      for (const dow of days) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + w * 7 + ((dow + 6) % 7));
        if (!push(d)) return out;
      }
    }
    return out;
  }

  for (let i = 0; i < max * 4; i++) {
    const d = new Date(start);
    const step = i * rule.interval;
    if (rule.freq === 'DAILY') d.setDate(start.getDate() + step);
    else if (rule.freq === 'WEEKLY') d.setDate(start.getDate() + step * 7);
    else if (rule.freq === 'MONTHLY') {
      d.setMonth(start.getMonth() + step);
      if (d.getDate() !== start.getDate()) continue; // 31 → mois sans 31 : on saute
    } else d.setFullYear(start.getFullYear() + step);
    if (!push(d)) return out;
  }
  return out;
}

// ── API publique ────────────────────────────────────────────────────────────

export function parseIcs(text: string, opts: IcsParseOptions): IcsEvent[] {
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    throw new Error("Le contenu reçu n'est pas un calendrier iCalendar (.ics).");
  }
  const max = opts.maxOccurrencesPerEvent ?? 800;
  const masters: { ev: IcsEvent; rrule: RRule | null; exdates: Set<number> }[] = [];
  const overrides = new Map<string, Map<number, IcsEvent | null>>(); // uid → (recurrence-id → occurrence|annulée)

  for (const raw of readEvents(text)) {
    const get = (n: string) => raw.props.find((p) => p.name === n);
    const dtstart = get('DTSTART');
    if (!dtstart) continue;
    const start = parseDateValue(dtstart.value, dtstart.params);
    if (!start) continue;

    let end: Date | null = null;
    const dtend = get('DTEND');
    const duration = get('DURATION');
    if (dtend) end = parseDateValue(dtend.value, dtend.params)?.date ?? null;
    else if (duration) {
      const ms = parseDuration(duration.value);
      if (ms !== null) end = new Date(start.date.getTime() + ms);
    }
    if (!end || end <= start.date) {
      end = start.allDay ? new Date(start.date.getFullYear(), start.date.getMonth(), start.date.getDate() + 1) : start.date;
    }

    const uid = get('UID')?.value.trim() || `${dtstart.value}-${get('SUMMARY')?.value ?? ''}`;
    const cancelled = get('STATUS')?.value.trim().toUpperCase() === 'CANCELLED';
    const ev: IcsEvent = {
      uid,
      title: unescapeText(get('SUMMARY')?.value ?? '') || 'Sans titre',
      start: start.date,
      end,
      allDay: start.allDay,
      location: get('LOCATION') ? unescapeText(get('LOCATION')!.value) || undefined : undefined,
      description: get('DESCRIPTION') ? unescapeText(get('DESCRIPTION')!.value) || undefined : undefined,
    };

    const recId = get('RECURRENCE-ID');
    if (recId) {
      const at = parseDateValue(recId.value, recId.params)?.date.getTime();
      if (at !== undefined) {
        if (!overrides.has(uid)) overrides.set(uid, new Map());
        overrides.get(uid)!.set(at, cancelled ? null : { ...ev, uid: `${uid}@${new Date(at).toISOString()}` });
      }
      continue;
    }
    if (cancelled) continue;

    const exdates = new Set<number>();
    for (const p of raw.props.filter((p) => p.name === 'EXDATE')) {
      for (const v of p.value.split(',')) {
        const d = parseDateValue(v, p.params);
        if (d) exdates.add(d.date.getTime());
      }
    }
    const rrule = get('RRULE') ? parseRRule(get('RRULE')!.value) : null;
    masters.push({ ev, rrule, exdates });
  }

  const out: IcsEvent[] = [];
  const inRange = (e: IcsEvent) => e.end > opts.rangeStart && e.start < opts.rangeEnd;

  for (const { ev, rrule, exdates } of masters) {
    const ov = overrides.get(ev.uid);
    if (!rrule) {
      if (inRange(ev)) out.push(ev);
      continue;
    }
    const length = ev.end.getTime() - ev.start.getTime();
    for (const s of expandRRule(ev.start, rrule, opts.rangeEnd, max)) {
      const t = s.getTime();
      if (exdates.has(t) || ov?.has(t)) continue;
      const occ: IcsEvent = { ...ev, uid: `${ev.uid}@${s.toISOString()}`, start: s, end: new Date(t + length) };
      if (inRange(occ)) out.push(occ);
    }
  }
  for (const map of overrides.values()) {
    for (const occ of map.values()) if (occ && inRange(occ)) out.push(occ);
  }

  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
