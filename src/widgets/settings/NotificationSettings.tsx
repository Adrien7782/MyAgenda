import { Toggle } from '../../shared/ui';
import { useSettingsStore } from '../../store/settingsStore';
import { SettingRow } from './SettingsSection';
import { OS_TEXT } from '../../infrastructure/platform';

export function NotificationSettings() {
  const { notificationsEnabled, setNotificationsEnabled, autoAlerts, setAutoAlerts } = useSettingsStore();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SettingRow
        label={OS_TEXT.notifications}
        description={`Active les rappels que tu poses sur tes tâches et évènements. Ils sonnent même quand My Agenda est caché dans ${OS_TEXT.tray}.`}
      >
        <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} label="Notifications" />
      </SettingRow>
      <SettingRow
        label="Alertes automatiques"
        description="Pour les éléments sans rappel personnalisé : 30 min avant chaque échéance et 15 min avant tes évènements personnels (pas les cours importés)."
      >
        <Toggle checked={notificationsEnabled && autoAlerts} onChange={setAutoAlerts} label="Alertes automatiques" />
      </SettingRow>
    </div>
  );
}
