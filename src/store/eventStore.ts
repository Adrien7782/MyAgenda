import { useMemo } from 'react';
import { create } from 'zustand';
import type { CalendarEvent, CalendarSource, EventDraft } from '../domain/event/event';
import { colorForTitle, type EventColorRules } from '../domain/event/eventColors';
import { services } from '../app/container';
import { useTaskStore } from './taskStore';

interface EventState {
  events: CalendarEvent[];
  sources: CalendarSource[];
  /** Couleur choisie par titre d'évènement. */
  titleColors: EventColorRules;
  loaded: boolean;
  load(): Promise<void>;
  save(id: string | null, draft: EventDraft): Promise<void>;
  remove(id: string): Promise<void>;
  mergeRemote(events: CalendarEvent[]): void;
  /** `null` = revenir à la couleur par défaut. */
  setTitleColor(title: string, color: string | null): Promise<void>;

  // Calendriers importés
  subscribe(input: { name: string; url: string; color?: string }): Promise<number>;
  importFile(input: { name: string; text: string; color?: string }): Promise<number>;
  refreshSource(id: string): Promise<number>;
  refreshStaleSources(): Promise<void>;
  updateSource(id: string, patch: { name?: string; color?: string }): Promise<void>;
  removeSource(id: string): Promise<void>;
}

const eventsSvc = services.events;
const importSvc = services.calendarImport;
const publish = () => {
  services.changeBus.publish('events');
  // Les tâches liées suivent leur évènement (déplacé, ré-importé…).
  void useTaskStore.getState().alignToEvents(useEventStore.getState().events);
};

export const useEventStore = create<EventState>((set, get) => {
  /** Après une opération d'import, on relit tout depuis la base (source de vérité). */
  async function reload() {
    const [events, sources, titleColors] = await Promise.all([eventsSvc.listAll(), importSvc.listSources(), services.eventColors.load()]);
    set({ events, sources, titleColors });
  }

  /** Relit depuis la base puis prévient l'autre fenêtre. */
  async function reloadAndPublish() {
    await reload();
    publish();
  }

  return {
    events: [],
    sources: [],
    titleColors: {},
    loaded: false,

    async load() {
      await reload();
      set({ loaded: true });
    },

    async save(id, draft) {
      const existing = id ? get().events.find((e) => e.id === id) : undefined;
      if (existing) {
        const updated = await eventsSvc.update(existing, draft);
        set((s) => ({ events: s.events.map((e) => (e.id === id ? updated : e)) }));
      } else {
        const created = await eventsSvc.create(draft);
        set((s) => ({ events: [...s.events, created] }));
      }
      publish();
    },

    async remove(id) {
      const ev = get().events.find((e) => e.id === id);
      if (!ev) return;
      await eventsSvc.remove(ev);
      set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
      publish();
    },

    mergeRemote(incoming) {
      set((s) => {
        const map = new Map(s.events.map((e) => [e.id, e]));
        for (const e of incoming) map.set(e.id, { ...map.get(e.id), ...e });
        return { events: [...map.values()] };
      });
      publish();
    },

    async setTitleColor(title, color) {
      set({ titleColors: await services.eventColors.setForTitle(title, color) });
      publish();
    },

    async subscribe(input) {
      const { count } = await importSvc.subscribe(input);
      await reloadAndPublish();
      return count;
    },

    async importFile(input) {
      const { count } = await importSvc.importFile(input);
      await reloadAndPublish();
      return count;
    },

    async refreshSource(id) {
      const source = get().sources.find((s) => s.id === id);
      if (!source) return 0;
      try {
        return await importSvc.refresh(source);
      } finally {
        await reloadAndPublish();
      }
    },

    async refreshStaleSources() {
      await importSvc.refreshStale();
      await reloadAndPublish();
    },

    async updateSource(id, patch) {
      const source = get().sources.find((s) => s.id === id);
      if (!source) return;
      await importSvc.rename(source, patch);
      await reloadAndPublish();
    },

    async removeSource(id) {
      const source = get().sources.find((s) => s.id === id);
      if (!source) return;
      await importSvc.remove(source);
      await reloadAndPublish();
    },
  };
});

/**
 * Couleur d'affichage d'un évènement, par ordre de priorité :
 * couleur choisie pour ce titre → anniversaire (annuel) → couleur du calendrier importé → accent du thème.
 */
export function useEventColor(): (ev: CalendarEvent) => string {
  const sources = useEventStore((s) => s.sources);
  const titleColors = useEventStore((s) => s.titleColors);
  return useMemo(() => {
    const colors = new Map(sources.map((s) => [s.id, s.color]));
    return (ev: CalendarEvent) =>
      colorForTitle(titleColors, ev.title) ??
      (ev.is_annual ? 'var(--warn)' : (ev.source_id && colors.get(ev.source_id)) || 'var(--accent)');
  }, [sources, titleColors]);
}
