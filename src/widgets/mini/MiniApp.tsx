import { useEffect } from 'react';
import { services } from '../../app/container';
import { currentMiniWindow } from '../../infrastructure/tauri/miniWindow';
import { hasNativeMacControls } from '../../infrastructure/platform';
import { SettingKeys } from '../../services/settingsService';
import { TaskModal } from '../tasks/task-modal/TaskModal';
import { MiniContent } from './MiniContent';
import { MiniTitleBar } from './MiniTitleBar';

/** Contenu complet de la fenêtre "My Agenda Mini". */
export function MiniApp() {
  // Mémorise position et taille (avec un léger délai pour ne pas écrire à chaque pixel).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let off: (() => void) | undefined;
    void currentMiniWindow.onBoundsChanged((b) => {
      clearTimeout(timer);
      timer = setTimeout(() => void services.settings.set(SettingKeys.miniBounds, JSON.stringify(b)), 400);
    }).then((fn) => { off = fn; });
    return () => { clearTimeout(timer); off?.(); };
  }, []);

  // macOS : fermeture par la pastille rouge → on mémorise que le mini est fermé.
  useEffect(() => {
    if (!hasNativeMacControls()) return;
    let off: (() => void) | undefined;
    void currentMiniWindow.onCloseRequested(async () => {
      await services.settings.setBool(SettingKeys.miniOpen, false);
      services.changeBus.publish('mini');
    }).then((fn) => { off = fn; });
    return () => off?.();
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', overflow: 'hidden' }}>
      <MiniTitleBar />
      <div style={{ flex: 1, minHeight: 0 }}><MiniContent /></div>
      <TaskModal />
    </div>
  );
}
