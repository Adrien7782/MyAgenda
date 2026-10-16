import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../shared/ui';
import { usePhoneLayout } from '../shared/hooks/usePhoneLayout';
import { isInstalledApp } from '../app/container';
import { SettingsSection } from '../widgets/settings/SettingsSection';
import { ThemePicker } from '../widgets/settings/ThemePicker';
import { NotificationSettings } from '../widgets/settings/NotificationSettings';
import { DesktopSettings } from '../widgets/settings/DesktopSettings';
import { AccountSettings } from '../widgets/settings/AccountSettings';
import { StorageSettings } from '../widgets/settings/StorageSettings';
import { ExportSettings } from '../widgets/settings/ExportSettings';
import { UpdateSettings } from '../widgets/updates/UpdateSettings';
import { CalendarSourceList } from '../widgets/calendar-sources/CalendarSourceList';
import { ImportCalendarForm, ImportHelp } from '../widgets/calendar-sources/ImportCalendarForm';

export function SettingsPage() {
  const { hash } = useLocation();
  const phone = usePhoneLayout();
  // Lien "Voir et installer" du bandeau → on descend directement à la section demandée.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="dot-grid" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Réglages" />
      <div style={{ flex: 1, overflowY: 'auto', padding: phone ? '16px 14px 32px' : '24px 28px' }}>
        {!isInstalledApp && (
          <div style={{ marginBottom: 24, maxWidth: 820, padding: '10px 14px', borderRadius: 10, background: 'var(--warn-bg)', color: 'var(--warn)', fontSize: 'var(--text-xs)' }}>
            Mode navigateur : données de démonstration non enregistrées. Lance <code>npm run tauri dev</code> pour utiliser ta vraie base.
          </div>
        )}
        <SettingsSection title="Compte et synchronisation"><AccountSettings /></SettingsSection>
        <SettingsSection title="Thème de l'interface"><ThemePicker /></SettingsSection>
        <SettingsSection title="Notifications"><NotificationSettings /></SettingsSection>
        <SettingsSection title="Mises à jour" id="updates"><UpdateSettings /></SettingsSection>
        {!phone && <SettingsSection title="Application"><DesktopSettings /></SettingsSection>}
        <SettingsSection title="Emplois du temps importés" description="Abonne-toi au lien iCal de ton université (ADE, Hyperplanning, Celcat…) ou importe un fichier .ics.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ImportCalendarForm />
              <ImportHelp />
            </div>
            <CalendarSourceList />
          </div>
        </SettingsSection>
        <SettingsSection title="Stockage des données" description="Où sont enregistrées tes données sur cet appareil, et combien il y en a.">
          <StorageSettings />
        </SettingsSection>
        <SettingsSection title="Export des données"><ExportSettings /></SettingsSection>
      </div>
    </div>
  );
}
