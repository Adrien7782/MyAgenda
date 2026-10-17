import { describe, expect, it, vi } from 'vitest';
import { createVoiceController, type VoiceUiState } from '../voiceController';
import type { VoiceEngine, VoiceEngineEvent } from '../ports';
import type { VoiceIntent } from '../../domain/voice/types';

const NOW = new Date(2026, 9, 17, 10, 0);
let id = 100;
const utterance = (text: string) => {
  const words = text.split(' ').map((w, i) => ({ text: w, start: i * 0.5, end: i * 0.5 + 0.4 }));
  return { type: 'utterance', utterance: { id: ++id, text, words, duration: words.length * 0.5 } } as VoiceEngineEvent;
};

function setup(range: (start: number) => { text: string; lang: string } = () => ({ text: '', lang: 'fr' })) {
  const engine: VoiceEngine = {
    supported: true,
    models: async () => [],
    downloadModel: async () => undefined,
    start: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    isActive: async () => true,
    transcribeRange: vi.fn(async (_id: number, start: number) => range(start)),
    shortcutAvailable: async () => true,
    subscribe: async () => () => undefined,
  };
  const intents: VoiceIntent[] = [];
  const undone: string[] = [];
  let last: VoiceUiState | null = null;
  const c = createVoiceController({
    engine,
    now: () => NOW,
    modelId: () => 'base',
    execute: async (intent) => {
      intents.push(intent);
      return { kind: intent.kind === 'create_note' ? 'note' : intent.kind === 'create_task' ? 'task' : 'event', id: `x${intents.length}`, title: 'title' in intent ? intent.title : '' };
    },
    undo: async (r) => { undone.push(r.id); },
    onChange: (s) => { last = s; },
  });
  return { c, engine, intents, undone, state: () => last! };
}

describe('commande vocale : de la phrase à la création', () => {
  it('note avec titre et contenu dictés en anglais (2e passe)', async () => {
    // « Crée(0) une(1) note(2) titre(3) shopping(4) list(5) contenu(6) eggs(7) and(8) milk(9) stop(10) »
    const { c, intents, state } = setup((start) => (start < 3 ? { text: 'Shopping list', lang: 'en' } : { text: 'Eggs and milk.', lang: 'en' }));
    c.handle(utterance('Crée une note titre shopping list contenu eggs and milk stop'));
    await c.idle();
    expect(intents).toEqual([{ kind: 'create_note', title: 'Shopping list', content: 'Eggs and milk' }]);
    expect(state().results[0].detail).toContain('dicté en anglais');
  });

  it('contenu en français : la 1re passe est gardée', async () => {
    const { c, intents } = setup(() => ({ text: 'n importe quoi', lang: 'fr' }));
    c.handle(utterance('Nouvelle note titre courses contenu pain virgule lait stop'));
    await c.idle();
    expect(intents[0]).toEqual({ kind: 'create_note', title: 'Courses', content: 'pain, lait' });
  });

  it('tâche en plusieurs phrases, terminée par un long silence', async () => {
    const { c, intents } = setup();
    c.handle(utterance('Ajoute une tâche'));
    c.handle(utterance('appeler le garage pour demain 10 h'));
    c.handle({ type: 'pause' });
    await c.idle();
    expect(intents[0]).toMatchObject({ kind: 'create_task', title: 'Appeler le garage' });
    expect(new Date((intents[0] as { deadline: string }).deadline).getHours()).toBe(10);
  });

  it('« annule » juste après : le dernier élément créé est supprimé', async () => {
    const { c, undone, state } = setup();
    c.handle(utterance('Crée une note titre test stop'));
    c.handle(utterance('Annule'));
    await c.idle();
    expect(undone).toEqual(['x1']);
    expect(state().results[0].undone).toBe(true);
  });

  it('« éteins-toi » coupe le micro', async () => {
    const { c, engine } = setup();
    c.handle(utterance('Éteins-toi'));
    await c.idle();
    expect(engine.stop).toHaveBeenCalled();
  });

  it('modèle pas encore téléchargé : on le signale', async () => {
    const { c, engine, state } = setup();
    (engine.start as ReturnType<typeof vi.fn>).mockRejectedValueOnce('model-missing');
    await c.start();
    expect(state().needsModel).toBe(true);
    expect(state().phase).toBe('off');
  });

  it('phrase sans commande : message d’aide', async () => {
    const { c, state } = setup();
    c.handle(utterance('Quel temps fait-il'));
    await c.idle();
    expect(state().message?.text).toMatch(/aide/);
  });
});
