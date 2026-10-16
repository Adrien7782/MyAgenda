import { useEffect, useState } from 'react';
import { isDesktopApp } from '../../app/container';
import { desktopIntegration } from '../../infrastructure/tauri/desktopIntegration';
import { Toggle } from '../../shared/ui';
import { useSettingsStore } from '../../store/settingsStore';
import { SettingRow } from './SettingsSection';
import { OS_TEXT } from '../../infrastructure/platform';

/** Comportement de l'application sur l'ordinateur (zone de notification / barre des menus, démarrage). */
export function DesktopSettings() {
  const closeToTray = useSettingsStore((s) => s.closeToTray);
  const setCloseToTray = useSettingsStore((s) => s.setCloseToTray);
  const [autostart, setAutostart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void desktopIntegration.isAutostartEnabled().then(setAutostart).catch(() => undefined); }, []);

  async function toggleAutostart(v: boolean) {
    setError(null);
    try {
      await desktopIntegration.setAutostart(v);
      setAutostart(await desktopIntegration.isAutostartEnabled());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SettingRow
        label={OS_TEXT.closeKeepsRunning}
        description={OS_TEXT.trayHint}
      >
        <Toggle checked={closeToTray} onChange={setCloseToTray} label={`Garder dans ${OS_TEXT.tray}`} />
      </SettingRow>
      <SettingRow
        label={OS_TEXT.autostart}
        description={isDesktopApp ? OS_TEXT.autostartHint : 'Disponible uniquement dans l’application installée.'}
      >
        <Toggle checked={autostart} onChange={toggleAutostart} label="Lancer au démarrage" />
      </SettingRow>
      {error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
