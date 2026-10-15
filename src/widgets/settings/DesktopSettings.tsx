import { useEffect, useState } from 'react';
import { isDesktopApp } from '../../app/container';
import { desktopIntegration } from '../../infrastructure/tauri/desktopIntegration';
import { Toggle } from '../../shared/ui';
import { useSettingsStore } from '../../store/settingsStore';
import { SettingRow } from './SettingsSection';

/** Comportement de l'application sous Windows (zone de notification, démarrage). */
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
        label="La croix garde My Agenda en arrière-plan"
        description="La fenêtre se cache dans la zone de notification (près de l'horloge) : les rappels continuent. Pour quitter : clic droit sur l'icône → Quitter."
      >
        <Toggle checked={closeToTray} onChange={setCloseToTray} label="Fermer dans la zone de notification" />
      </SettingRow>
      <SettingRow
        label="Lancer au démarrage de Windows"
        description={isDesktopApp ? "My Agenda démarre discrètement dans la zone de notification à l'ouverture de ta session." : 'Disponible uniquement dans l’application installée.'}
      >
        <Toggle checked={autostart} onChange={toggleAutostart} label="Lancer au démarrage" />
      </SettingRow>
      {error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
