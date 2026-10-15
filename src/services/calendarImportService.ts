import type { CalendarEvent, CalendarSource } from '../domain/event/event';
import { SOURCE_COLORS } from '../domain/event/event';
import { addDays, MINUTE_MS, nowIso } from '../domain/shared/date';
import { newId, stableHash } from '../domain/shared/id';
import type {
  CalendarParser,
  CalendarSourceRepository,
  EventRepository,
  ExternalEvent,
  HttpClient,
} from './ports';

/** Fenêtre d'import : 4 mois en arrière, 14 mois en avant (une année universitaire complète). */
const PAST_DAYS = 120;
const FUTURE_DAYS = 430;
/** Les liens sont réactualisés au démarrage s'ils datent de plus de 6 h. */
export const SOURCE_STALE_MS = 6 * 60 * 60 * 1000;

/** webcal:// → https:// ; espaces retirés. */
export function normalizeCalendarUrl(raw: string): string {
  const url = raw.trim();
  if (/^webcals?:\/\//i.test(url)) return url.replace(/^webcals?:\/\//i, 'https://');
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

function toCalendarEvent(sourceId: string, ext: ExternalEvent, now: string): CalendarEvent {
  const duration = Math.max(1, Math.round((ext.end.getTime() - ext.start.getTime()) / MINUTE_MS));
  return {
    id: `src-${sourceId.slice(0, 8)}-${stableHash(ext.uid)}`,
    title: ext.title,
    start_at: ext.start.toISOString(),
    duration_min: ext.allDay ? Math.max(1440, Math.round(duration / 1440) * 1440) : duration,
    comment: ext.description,
    location: ext.location,
    is_annual: 0,
    source_id: sourceId,
    external_uid: ext.uid,
    created_at: now,
    updated_at: now,
  };
}

export function createCalendarImportService(deps: {
  sources: CalendarSourceRepository;
  events: EventRepository;
  http: HttpClient;
  parse: CalendarParser;
}) {
  const { sources, events, http, parse } = deps;

  function parseText(text: string): ExternalEvent[] {
    const now = new Date();
    return parse(text, { rangeStart: addDays(now, -PAST_DAYS), rangeEnd: addDays(now, FUTURE_DAYS) });
  }

  async function storeEvents(source: CalendarSource, text: string): Promise<number> {
    const now = nowIso();
    const parsed = parseText(text);
    // Dédoublonnage (certains exports répètent la même occurrence).
    const byId = new Map(parsed.map((e) => [e.uid, toCalendarEvent(source.id, e, now)]));
    await events.replaceSourceEvents(source.id, [...byId.values()]);
    await sources.update(source.id, { last_synced_at: now, last_error: null });
    return byId.size;
  }

  async function refresh(source: CalendarSource): Promise<number> {
    if (!source.url) return 0;
    try {
      const text = await http.getText(source.url);
      return await storeEvents(source, text);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await sources.update(source.id, { last_error: message });
      throw new Error(message);
    }
  }

  async function nextColor(): Promise<string> {
    const used = (await sources.listAll()).length;
    return SOURCE_COLORS[used % SOURCE_COLORS.length];
  }

  /** Ajoute un abonnement par lien puis importe immédiatement son contenu. */
  async function subscribe(input: { name: string; url: string; color?: string }): Promise<{ source: CalendarSource; count: number }> {
    const url = normalizeCalendarUrl(input.url);
    // On télécharge et valide AVANT d'enregistrer la source : pas de source fantôme si le lien est mauvais.
    const text = await http.getText(url);
    parseText(text);
    const source: CalendarSource = {
      id: newId(),
      name: input.name.trim() || 'Emploi du temps',
      url,
      color: input.color ?? (await nextColor()),
      last_synced_at: null,
      last_error: null,
      created_at: nowIso(),
    };
    await sources.insert(source);
    const count = await storeEvents(source, text);
    return { source, count };
  }

  /** Import ponctuel d'un fichier .ics (pas de mise à jour automatique). */
  async function importFile(input: { name: string; text: string; color?: string }): Promise<{ source: CalendarSource; count: number }> {
    parseText(input.text); // valide avant d'enregistrer
    const source: CalendarSource = {
      id: newId(),
      name: input.name.trim() || 'Calendrier importé',
      url: null,
      color: input.color ?? (await nextColor()),
      last_synced_at: null,
      last_error: null,
      created_at: nowIso(),
    };
    await sources.insert(source);
    const count = await storeEvents(source, input.text);
    return { source, count };
  }

  /** Réactualise les abonnements trop anciens (appelé au démarrage). Les erreurs sont enregistrées sur la source. */
  async function refreshStale(now = Date.now()): Promise<void> {
    for (const s of await sources.listAll()) {
      if (!s.url) continue;
      const age = s.last_synced_at ? now - new Date(s.last_synced_at).getTime() : Infinity;
      if (age > SOURCE_STALE_MS) await refresh(s).catch(() => undefined);
    }
  }

  async function remove(source: CalendarSource): Promise<void> {
    await events.deleteBySource(source.id);
    await sources.delete(source.id);
  }

  return {
    listSources: () => sources.listAll(),
    subscribe,
    importFile,
    refresh,
    refreshStale,
    rename: (source: CalendarSource, patch: { name?: string; color?: string }) => sources.update(source.id, patch),
    remove,
  };
}

export type CalendarImportService = ReturnType<typeof createCalendarImportService>;
