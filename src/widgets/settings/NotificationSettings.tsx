import { Toggle } from '../../shared/ui';
import { useSettingsStore } from '../../store/settingsStore';
import { SettingRow } from './SettingsSection';
import { OS_TEXT } from '../../infrastructure/platform';
import { isWebApp } from '../../app/container';
import { WebNotificationPermission } from './WebNotificationPermission';

export function NotificationSettings() {
  const { notificationsEnabled, setNotificationsEnabled, autoAlerts, setAutoAlerts } = useSettingsStore();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SettingRow
        label={isWebApp ? 'Notifications' : OS_TEXT.notifications}
        description={isWebApp
          ? 'Active les rappels que tu poses sur tes tâches et évènements. Version web : ils s’affichent tant que My Agenda est ouverte (onglet ou app de l’écran d’accueil).'
          : `Active les rappels que tu poses sur tes tâches et évènements. Ils sonnent même quand My Agenda est caché dans ${OS_TEXT.tray}.`}
      >
        <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} label="Notifications" />
      </SettingRow>
      {isWebApp && notificationsEnabled && <WebNotificationPermission />}
      <SettingRow
        label="Alertes automatiques"
        description="Pour les éléments sans rappel personnalisé : 30 min avant chaque échéance et 15 min avant tes évènements personnels (pas les cours importés)."
      >
        <Toggle checked={notificationsEnabled && autoAlerts} onChange={setAutoAlerts} label="Alertes automatiques" />
      </SettingRow>
    </div>
  );
}
