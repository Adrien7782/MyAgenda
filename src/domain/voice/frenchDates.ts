/**
 * Dates et heures dites en français, lues dans une liste de mots normalisés (voir normalize.ts) :
 * « demain à 14 h », « vendredi », « lundi prochain », « le 25 octobre », « le 3 », « dans 2 heures »,
 * « ce soir », « après-demain matin », « à midi », « 9 h et demie », « 3 heures de l'après-midi »…
 */

export interface SpokenWhen {
  date: Date;
  /** Un jour a été dit (sinon : aujourd'hui ou demain selon l'heure). */
  hasDay: boolean;
  /** Une heure a été dite (sinon : à choisir par l'appelant, ex. journée entière). */
  hasTime: boolean;
  /** Nombre de mots lus. */
  consumed: number;
}

const WEEKDAYS: Record<string, number> = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };
const MONTHS: Record<string, number> = {
  janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11,
};
const UNITS: Record<string, number> = {
  zero: 0, un: 1, une: 1, premier: 1, '1er': 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, 'dix-sept': 17, 'dix-huit': 18, 'dix-neuf': 19,
};
const TENS: Record<string, number> = { vingt: 20, trente: 30, quarante: 40, cinquante: 50 };

/** Nombre en chiffres ou en lettres (jusqu'à 59) : « 14 », « quatorze », « vingt cinq », « trente et un ». */
export function readNumber(t: string[], i: number): { value: number; consumed: number } | null {
  const w = t[i];
  if (w === undefined) return null;
  if (/^\d{1,4}$/.test(w)) return { value: Number(w), consumed: 1 };
  if (w === '1er') return { value: 1, consumed: 1 };
  if (w === 'dix' && ['sept', 'huit', 'neuf'].includes(t[i + 1] ?? '')) return { value: 10 + UNITS[t[i + 1]], consumed: 2 };
  if (w in UNITS) return { value: UNITS[w], consumed: 1 };
  if (w in TENS) {
    let value = TENS[w];
    let consumed = 1;
    if (t[i + 1] === 'et' && (t[i + 2] === 'un' || t[i + 2] === 'une')) return { value: value + 1, consumed: 3 };
    const next = t[i + 1];
    if (next && next in UNITS && UNITS[next] > 0 && UNITS[next] < 10) { value += UNITS[next]; consumed = 2; }
    return { value, consumed };
  }
  return null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

interface DayResult { day: Date; consumed: number; defaultTime?: [number, number] }
interface TimeResult { h: number; m: number; consumed: number }

/** Moment de la journée dit après un jour : « demain matin », « ce soir »… */
function partOfDay(t: string[], i: number): { time: [number, number]; consumed: number } | null {
  if (t[i] === 'matin') return { time: [9, 0], consumed: 1 };
  if (t[i] === 'soir') return { time: [20, 0], consumed: 1 };
  if (t[i] === 'midi') return { time: [12, 0], consumed: 1 };
  if (t[i] === 'apres' && t[i + 1] === 'midi') return { time: [14, 0], consumed: 2 };
  if (t[i] === 'aprem') return { time: [14, 0], consumed: 1 };
  return null;
}

function readDay(t: string[], i: number, now: Date): DayResult | null {
  const today = startOfDay(now);
  const w = t[i];
  const withPart = (day: Date, consumed: number): DayResult => {
    const part = partOfDay(t, i + consumed);
    return part ? { day, consumed: consumed + part.consumed, defaultTime: part.time } : { day, consumed };
  };
  if (w === "aujourd'hui" || w === 'aujourdhui') return withPart(today, 1);
  if ((w === 'ce' || w === 'cet' || w === 'cette') && partOfDay(t, i + 1)) {
    const part = partOfDay(t, i + 1)!;
    return { day: today, consumed: 1 + part.consumed, defaultTime: part.time };
  }
  if (w === 'demain') return withPart(addDays(today, 1), 1);
  if (w === 'apres' && t[i + 1] === 'demain') return withPart(addDays(today, 2), 2);
  if (w === 'apres-demain') return withPart(addDays(today, 2), 1);

  // « la semaine prochaine » → lundi prochain
  if ((w === 'la' || w === 'semaine') && t.slice(i, i + 3).join(' ').replace(/^la /, '') .startsWith('semaine prochaine')) {
    const n = w === 'la' ? 3 : 2;
    const delta = ((1 - today.getDay() + 7) % 7) || 7;
    return { day: addDays(today, delta), consumed: n };
  }

  // « lundi », « lundi prochain », « ce lundi »
  let k = i;
  if (t[k] === 'ce') k++;
  if (t[k] !== undefined && t[k] in WEEKDAYS) {
    const target = WEEKDAYS[t[k]];
    let delta = (target - today.getDay() + 7) % 7;
    let consumed = k - i + 1;
    if (t[i + consumed] === 'prochain') { if (delta === 0) delta = 7; consumed++; }
    else if (delta === 0 && t[i] !== 'ce') delta = 7; // « vendredi » dit un vendredi = la semaine prochaine
    return withPart(addDays(today, delta), consumed);
  }

  // « le 25 », « le 25 octobre », « 25 octobre 2027 », « le 1er mars », « 25/10 », « 25/10/2027 »
  k = i;
  if (t[k] === 'le') k++;
  const slash = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/.exec(t[k] ?? '');
  if (slash) {
    const year = slash[3] ? (slash[3].length === 2 ? 2000 + Number(slash[3]) : Number(slash[3])) : undefined;
    return withPart(resolveDate(today, Number(slash[1]), Number(slash[2]) - 1, year), k - i + 1);
  }
  const num = readNumber(t, k);
  if (num && num.value >= 1 && num.value <= 31) {
    let consumed = k - i + num.consumed;
    const monthWord = t[i + consumed];
    let month: number | undefined;
    let year: number | undefined;
    if (monthWord !== undefined && monthWord in MONTHS) {
      month = MONTHS[monthWord];
      consumed++;
      if (/^\d{4}$/.test(t[i + consumed] ?? '')) { year = Number(t[i + consumed]); consumed++; }
    } else if (t[i] !== 'le') {
      return null; // un nombre seul n'est pas une date (« 3 » peut être une heure)
    } else if (/^(h|heure|heures)$/.test(t[i + consumed] ?? '') || /^\d{1,2}h/.test(t[k] ?? '')) {
      return null; // « le 14 h » n'existe pas : c'est une heure
    }
    return withPart(resolveDate(today, num.value, month, year), consumed);
  }
  return null;
}

/** Jour du mois (et mois) sans année : la prochaine fois que cette date arrive. */
function resolveDate(today: Date, day: number, month?: number, year?: number): Date {
  if (month === undefined) {
    let d = new Date(today.getFullYear(), today.getMonth(), day);
    if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, day);
    return d;
  }
  if (year !== undefined) return new Date(year, month, day);
  let d = new Date(today.getFullYear(), month, day);
  if (d < today) d = new Date(today.getFullYear() + 1, month, day);
  return d;
}

function readTime(t: string[], i: number): TimeResult | null {
  let k = i;
  if (t[k] === 'a' || t[k] === 'vers' || t[k] === 'des' || t[k] === 'pour') k++;
  if (t[k] === 'midi') return { h: 12, ...minutesAfter(t, k + 1), consumed: k - i + 1 + minutesAfter(t, k + 1).consumed };
  if (t[k] === 'minuit') return { h: 0, m: 0, consumed: k - i + 1 };
  let h: number;
  let m = 0;
  let consumed: number;
  const compact = /^(\d{1,2})(?:h|:)(\d{2})?$/.exec(t[k] ?? '');
  if (compact) {
    h = Number(compact[1]);
    m = compact[2] ? Number(compact[2]) : 0;
    consumed = k - i + 1;
    if (!compact[2]) {
      const after = minutesAfter(t, k + 1);
      m = after.m;
      consumed += after.consumed;
    }
  } else {
    const n = readNumber(t, k);
    if (!n || n.value > 23 || !/^(h|heure|heures)$/.test(t[k + n.consumed] ?? '')) return null;
    h = n.value;
    consumed = k - i + n.consumed + 1;
    const after = minutesAfter(t, k + n.consumed + 1);
    m = after.m;
    consumed += after.consumed;
  }
  if (m === -15) { h -= 1; m = 45; }
  // « du matin », « de l'après-midi », « du soir »
  const tail = t.slice(i + consumed, i + consumed + 4).join(' ');
  if (/^du soir/.test(tail)) { if (h < 12) h += 12; consumed += 2; }
  else if (/^de l apres midi|^de l'apres midi/.test(tail)) { if (h < 12) h += 12; consumed += tail.startsWith('de l apres') ? 4 : 3; }
  else if (/^de l'aprem|^de l aprem/.test(tail)) { if (h < 12) h += 12; consumed += tail.startsWith('de l aprem') ? 3 : 2; }
  else if (/^du matin/.test(tail)) consumed += 2;
  if (h > 23 || m > 59) return null;
  return { h, m, consumed };
}

/** Minutes après l'heure : « 30 », « trente », « et demie », « et quart », « moins le quart » (→ -15). */
function minutesAfter(t: string[], i: number): { m: number; consumed: number } {
  if (t[i] === 'et' && (t[i + 1] === 'demie' || t[i + 1] === 'demi')) return { m: 30, consumed: 2 };
  if (t[i] === 'et' && t[i + 1] === 'quart') return { m: 15, consumed: 2 };
  if (t[i] === 'moins' && t[i + 1] === 'le' && t[i + 2] === 'quart') return { m: -15, consumed: 3 };
  if (t[i] === 'moins' && t[i + 1] === 'quart') return { m: -15, consumed: 2 };
  const n = readNumber(t, i);
  if (n && n.value < 60 && !/^(h|heure|heures|minutes?|jours?)$/.test(t[i + n.consumed] ?? '__')) return { m: n.value, consumed: n.consumed };
  if (n && n.value < 60 && /^minutes?$/.test(t[i + n.consumed] ?? '')) return { m: n.value, consumed: n.consumed + 1 };
  return { m: 0, consumed: 0 };
}

/** « dans 2 heures », « dans 3 jours », « dans une semaine », « dans 20 minutes ». */
function readRelative(t: string[], i: number, now: Date): SpokenWhen | null {
  if (t[i] !== 'dans') return null;
  const n = readNumber(t, i + 1);
  if (!n) return null;
  const unit = t[i + 1 + n.consumed] ?? '';
  const consumed = 2 + n.consumed;
  if (/^jours?$/.test(unit)) return { date: addDays(startOfDay(now), n.value), hasDay: true, hasTime: false, consumed };
  if (/^semaines?$/.test(unit)) return { date: addDays(startOfDay(now), 7 * n.value), hasDay: true, hasTime: false, consumed };
  if (/^(heures?|h)$/.test(unit)) return { date: new Date(now.getTime() + n.value * 3_600_000), hasDay: true, hasTime: true, consumed };
  if (/^(minutes?|min)$/.test(unit)) return { date: new Date(now.getTime() + n.value * 60_000), hasDay: true, hasTime: true, consumed };
  return null;
}

/**
 * Lit une date/heure à partir du mot `i`. Mots d'introduction acceptés : « pour », « échéance », « date », « le ».
 * Renvoie null si rien de reconnaissable.
 */
export function parseFrenchWhen(t: string[], i: number, now: Date): SpokenWhen | null {
  let k = i;
  while (['pour', 'echeance', 'date', 'quand', 'prevu', 'prevue', 'a', 'faire'].includes(t[k] ?? '') && k - i < 3) {
    // « à » seul n'introduit qu'une heure : on le laisse à readTime.
    if (t[k] === 'a') break;
    k++;
  }
  const rel = readRelative(t, k, now);
  if (rel) return { ...rel, consumed: rel.consumed + (k - i) };

  const day = readDay(t, k, now);
  let consumed = k - i + (day?.consumed ?? 0);
  const time = readTime(t, i + consumed);
  if (!day && !time) return null;
  if (time) consumed += time.consumed;
  // « demain à 14 h » / « à 14 h demain »
  let dayResult = day;
  if (!day && time) {
    const after = readDay(t, i + consumed, now);
    if (after) { dayResult = after; consumed += after.consumed; }
  }
  const base = dayResult?.day ?? startOfDay(now);
  const hm: [number, number] | undefined = time ? [time.h, time.m] : dayResult?.defaultTime;
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hm?.[0] ?? 0, hm?.[1] ?? 0);
  // Heure seule déjà passée aujourd'hui → demain.
  if (!dayResult && date.getTime() < now.getTime()) date.setDate(date.getDate() + 1);
  return { date, hasDay: !!dayResult, hasTime: !!hm, consumed };
}

/** « 1 heure », « 30 minutes », « 1 h 30 », « une heure et demie », « 2 heures », « toute la journée ». */
export function parseDuration(t: string[], i: number): { minutes: number; consumed: number } | null {
  const compact = /^(\d{1,2})h(\d{2})?$/.exec(t[i] ?? '');
  if (compact) return { minutes: Number(compact[1]) * 60 + Number(compact[2] ?? 0), consumed: 1 };
  if (t[i] === 'une' && t[i + 1] === 'demi' && /^heures?$/.test(t[i + 2] ?? '')) return { minutes: 30, consumed: 3 };
  const n = readNumber(t, i);
  if (!n) return null;
  const unit = t[i + n.consumed] ?? '';
  let consumed = n.consumed + 1;
  if (/^(minutes?|min)$/.test(unit)) return { minutes: n.value, consumed };
  if (!/^(heures?|h)$/.test(unit)) return null;
  let minutes = n.value * 60;
  const after = minutesAfter(t, i + consumed);
  if (after.m > 0) { minutes += after.m; consumed += after.consumed; }
  return { minutes, consumed };
}
