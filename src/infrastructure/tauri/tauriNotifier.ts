import type { Notifier } from '../../services/ports';
import { isTauri } from '../platform';

export class TauriNotifier implements Notifier {
  async ensurePermission(): Promise<boolean> {
    if (!isTauri()) return false;
    const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === 'granted';
  }

  async notify(title: string, body: string): Promise<void> {
    if (!isTauri()) return;
    const { sendNotification } = await import('@tauri-apps/plugin-notification');
    sendNotification({ title: `${title} — My Agenda`, body });
  }
}
