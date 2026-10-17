import { create } from 'zustand';
import { services } from '../app/container';
import { SettingKeys } from '../services/settingsService';
import { createVoiceController, type VoiceResult, type VoiceUiState } from '../services/voiceController';
import { textToNoteHtml } from '../domain/voice/intent';
import type { TaskDraft } from '../domain/task/task';
import type { VoiceModel } from '../services/ports';
import { useNoteStore } from './noteStore';
import { useTaskStore } from './taskStore';
import { useEventStore } from './eventStore';

interface VoiceStore extends VoiceUiState {
  supported: boolean;
  modelId: string;
  models: VoiceModel[];
  download: { model: string; downloaded: number; total: number } | null;
  shortcutOk: boolean;
  /** Branche le moteur (une fois, au démarrage de la grande fenêtre). */
  init(): Promise<() => void>;
  toggle(): Promise<void>;
  stop(): Promise<void>;
  undo(r: VoiceResult): Promise<void>;
  dismissMessage(): void;
  clearResults(): void;
  refreshModels(): Promise<void>;
  setModel(id: string): Promise<void>;
  downloadModel(id: string): Promise<void>;
}

const engine = services.voice;

export const useVoiceStore = create<VoiceStore>((set, get) => {
  const controller = createVoiceController({
    engine,
    modelId: () => get().modelId,
    onChange: (s) => set(s),
    async execute(intent) {
      if (intent.kind === 'create_note') {
        const id = await useNoteStore.getState().create({ title: intent.title, content: textToNoteHtml(intent.content) });
        return { kind: 'note', id, title: intent.title || intent.content.split('\n')[0].slice(0, 60) };
      }
      if (intent.kind === 'create_task') {
        const draft: TaskDraft = {
          title: intent.title, comment: intent.comment, deadline: intent.deadline, status: 'todo', priority: intent.priority,
          tags: [], recurrence: intent.recurrence ?? 'none', subtasks: [], newAttachments: [], removedAttachmentIds: [],
        };
        const task = await services.tasks.create(draft);
        useTaskStore.getState().mergeRemote([task]);
        return { kind: 'task', id: task.id, title: task.title };
      }
      const ev = await services.events.create({
        title: intent.title, start_at: intent.start!, duration_min: intent.durationMin ?? 60, is_annual: 0,
        recurrence: intent.recurrence ?? 'none', location: intent.location,
      });
      useEventStore.getState().mergeRemote([ev]);
      return { kind: 'event', id: ev.id, title: ev.title };
    },
    async undo(r) {
      if (r.kind === 'note') await useNoteStore.getState().purge(r.id);
      else if (r.kind === 'task') await useTaskStore.getState().purge(r.id);
      else await useEventStore.getState().remove(r.id);
    },
  });

  return {
    ...controller.state,
    supported: engine.supported,
    modelId: 'base',
    models: [],
    download: null,
    shortcutOk: true,

    async init() {
      if (!engine.supported) return () => undefined;
      const saved = await services.settings.get(SettingKeys.voiceModel);
      set({ modelId: saved === 'small' ? 'small' : 'base', shortcutOk: await engine.shortcutAvailable().catch(() => false) });
      void get().refreshModels();
      const off = await engine.subscribe((e) => {
        if (e.type === 'download') {
          set({ download: e.downloaded >= e.total ? null : { model: e.model, downloaded: e.downloaded, total: e.total } });
          if (e.downloaded >= e.total) void get().refreshModels();
          return;
        }
        controller.handle(e);
      });
      // Micro resté allumé (rechargement de la page) : on le coupe proprement.
      if (await engine.isActive().catch(() => false)) await engine.stop();
      return off;
    },

    toggle: () => controller.toggle(),
    stop: () => controller.stop(),
    undo: (r) => controller.undo(r),
    dismissMessage: () => controller.dismissMessage(),
    clearResults: () => controller.clearResults(),

    async refreshModels() {
      set({ models: await engine.models().catch(() => []) });
    },

    async setModel(id) {
      set({ modelId: id });
      await services.settings.set(SettingKeys.voiceModel, id);
      if (get().phase !== 'off') { await controller.stop(); }
    },

    async downloadModel(id) {
      const m = get().models.find((x) => x.id === id);
      set({ download: { model: id, downloaded: 0, total: (m?.sizeMb ?? 60) * 1_000_000 }, message: null });
      try {
        await engine.downloadModel(id);
        set({ download: null, needsModel: false });
        await get().refreshModels();
      } catch (e) {
        set({ download: null, message: { tone: 'error', text: e instanceof Error ? e.message : String(e) } });
      }
    },
  };
});
