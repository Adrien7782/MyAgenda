import type { ChangeBus, ChangeChannel } from '../../services/ports';
import { isTauri } from '../platform';

const EVENT = 'my-agenda://data-changed';
/** Identifiant unique de cette fenêtre (pour ignorer ses propres messages). */
const SENDER = crypto.randomUUID();

interface Payload { channel: ChangeChannel; sender: string }

/** Diffuse les modifications entre les fenêtres Tauri via le système d'évènements. */
export class TauriChangeBus implements ChangeBus {
  publish(channel: ChangeChannel): void {
    if (!isTauri()) return;
    void import('@tauri-apps/api/event').then(({ emit }) => emit(EVENT, { channel, sender: SENDER } satisfies Payload));
  }

  async subscribe(cb: (channel: ChangeChannel) => void): Promise<() => void> {
    if (!isTauri()) return () => undefined;
    const { listen } = await import('@tauri-apps/api/event');
    return listen<Payload>(EVENT, (e) => {
      if (e.payload.sender !== SENDER) cb(e.payload.channel);
    });
  }
}
