import type { VoiceEngine, VoiceEngineEvent, VoiceModel } from '../../services/ports';
import type { Utterance } from '../../domain/voice/types';
import { isDesktopTauri } from '../platform';

/** Commande vocale de l'application ordinateur : tout se passe dans le Rust (src-tauri/src/voice.rs). */
export class TauriVoiceEngine implements VoiceEngine {
  readonly supported = isDesktopTauri();

  private async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }

  models() { return this.invoke<VoiceModel[]>('voice_models'); }
  downloadModel(id: string) { return this.invoke<void>('voice_download_model', { id }); }
  start(modelId: string) { return this.invoke<void>('voice_start', { modelId }); }
  stop() { return this.invoke<void>('voice_stop'); }
  isActive() { return this.invoke<boolean>('voice_is_active'); }
  transcribeRange(id: number, start: number, end: number) { return this.invoke<{ text: string; lang: string }>('voice_transcribe_range', { id, start, end }); }
  shortcutAvailable() { return this.invoke<boolean>('voice_shortcut_status'); }

  async subscribe(cb: (e: VoiceEngineEvent) => void): Promise<() => void> {
    const { listen } = await import('@tauri-apps/api/event');
    const offs = await Promise.all([
      listen<{ phase: 'loading' | 'listening' | 'hearing' | 'processing' | 'off'; reason?: string | null }>('voice://state', (e) => cb({ type: 'state', ...e.payload })),
      listen<number>('voice://level', (e) => cb({ type: 'level', level: e.payload })),
      listen<Utterance>('voice://utterance', (e) => cb({ type: 'utterance', utterance: e.payload })),
      listen('voice://pause', () => cb({ type: 'pause' })),
      listen<string>('voice://error', (e) => cb({ type: 'error', message: e.payload })),
      listen<{ model: string; downloaded: number; total: number }>('voice://download', (e) => cb({ type: 'download', ...e.payload })),
      listen('voice://toggle', () => cb({ type: 'toggle' })),
    ]);
    return () => offs.forEach((off) => off());
  }
}

/** Navigateur / téléphone : pas encore de commande vocale. */
export class NoVoiceEngine implements VoiceEngine {
  readonly supported = false;
  async models() { return []; }
  async downloadModel() { throw new Error('Commande vocale indisponible ici.'); }
  async start() { throw new Error('Commande vocale indisponible ici.'); }
  async stop() {}
  async isActive() { return false; }
  async transcribeRange() { return { text: '', lang: 'fr' }; }
  async shortcutAvailable() { return false; }
  async subscribe() { return () => undefined; }
}

export function createVoiceEngine(): VoiceEngine {
  if (isDesktopTauri()) return new TauriVoiceEngine();
  if (import.meta.env.DEV) {
    try { if (localStorage.getItem('voice-demo') === '1') return new DemoVoiceEngine(); } catch { /* ignore */ }
  }
  return new NoVoiceEngine();
}

/**
 * Développement uniquement (`npm run dev` + localStorage « voice-demo » = 1) : faux moteur qui rejoue
 * des phrases, pour travailler l'interface sans micro. Absent de l'application publiée.
 */
export class DemoVoiceEngine implements VoiceEngine {
  readonly supported = true;
  private cb: ((e: VoiceEngineEvent) => void) | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private phrases = [
    'My Agenda, crée-moi une note. Titre : shopping list. Contenu : eggs, milk and bread. Stop.',
    'Nouvelle tâche, titre appeler le garage, pour demain 10 h, priorité haute, stop.',
  ];
  async models() { return [{ id: 'base', label: 'Rapide (recommandé)', sizeMb: 57, downloaded: true }, { id: 'small', label: 'Précis (plus lent)', sizeMb: 181, downloaded: false }]; }
  async downloadModel() {}
  async start() {
    const emit = (e: VoiceEngineEvent, ms: number) => this.timers.push(setTimeout(() => this.cb?.(e), ms));
    emit({ type: 'state', phase: 'listening' }, 50);
    this.phrases.forEach((text, i) => {
      const t0 = 600 + i * 2500;
      emit({ type: 'state', phase: 'hearing' }, t0);
      for (let k = 0; k < 8; k++) emit({ type: 'level', level: 0.3 + Math.random() * 0.6 }, t0 + k * 100);
      const words = text.split(' ').map((w, j) => ({ text: w, start: j * 0.4, end: j * 0.4 + 0.35 }));
      emit({ type: 'utterance', utterance: { id: i + 1, text, words, duration: words.length * 0.4 } }, t0 + 900);
      emit({ type: 'state', phase: 'listening' }, t0 + 950);
    });
  }
  async stop() { this.timers.forEach(clearTimeout); this.timers = []; this.cb?.({ type: 'state', phase: 'off' }); }
  async isActive() { return false; }
  async transcribeRange(id: number, start: number) {
    if (id === 1) return start < 3 ? { text: 'Shopping list', lang: 'en' } : { text: 'Eggs, milk and bread.', lang: 'en' };
    return { text: '', lang: 'fr' };
  }
  async shortcutAvailable() { return true; }
  async subscribe(cb: (e: VoiceEngineEvent) => void) { this.cb = cb; return () => { this.cb = null; }; }
}
