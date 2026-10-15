import { Toggle } from '../../shared/ui';
import { useSettingsStore } from '../../store/settingsStore';
import { SettingRow } from './SettingsSection';

export function NotificationSettings() {
  const { notificationsEnabled, setNotificationsEnabled, autoAlerts, setAutoAlerts } = useSettingsStore();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SettingRow
        label="Notifications Windows"
        description="Active les rappels que tu poses sur tes tâches et évènements. Ils sonnent même quand My Agenda est caché dans la zone de notification."
      >
        <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} label="Notifications" />
      </SettingRow>
      <SettingRow
        label="Alertes automatiques"
        description="Pour les éléments sans rappel personnalisé : 30 min avant chaque échéance, à l'échéance, et 15 min avant tes évènements personnels (pas les cours importés)."
      >
        <Toggle checked={notificationsEnabled && autoAlerts} onChange={setAutoAlerts} label="Alertes automatiques" />
      </SettingRow>
    </div>
  );
}
