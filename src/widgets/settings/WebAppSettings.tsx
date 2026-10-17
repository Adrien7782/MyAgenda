import { useEffect, useState } from 'react';
import { canPromptInstall, onInstallAvailabilityChange, promptInstall } from '../../infrastructure/web/pwa';
import { isStandalone } from '../../infrastructure/web/webNotifications';
import { isAndroid, isIOS, isMac } from '../../infrastructure/platform';
import { Button } from '../../shared/ui';
import { SettingRow } from './SettingsSection';

/** Web app : l'ajouter à l'écran d'accueil / l'installer comme une application. */
export function WebAppSettings() {
  const [canInstall, setCanInstall] = useState(canPromptInstall);
  useEffect(() => onInstallAvailabilityChange(() => setCanInstall(canPromptInstall())), []);

  let description: string;
  if (isStandalone()) description = 'My Agenda est installée sur cet appareil : elle s’ouvre en plein écran depuis son icône.';
  else if (isIOS()) description = 'Dans Safari, touche Partager (le carré avec une flèche) → « Sur l’écran d’accueil » → Ajouter. My Agenda s’ouvre alors en plein écran depuis son icône et peut afficher tes rappels.';
  else if (isAndroid()) description = 'Dans Chrome, menu ⋮ → « Ajouter à l’écran d’accueil ». Sur Android, l’application à installer (APK) reste plus complète : rappels même application fermée.';
  else if (isMac() && /safari/i.test(navigator.userAgent) && !/chrome|edg/i.test(navigator.userAgent)) description = 'Dans Safari : menu Fichier → « Ajouter au Dock ». My Agenda s’ouvre alors dans sa propre fenêtre.';
  else description = 'Dans Chrome ou Edge : bouton d’installation à droite de la barre d’adresse. My Agenda s’ouvre alors dans sa propre fenêtre.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SettingRow label={isStandalone() ? 'Application installée ✓' : 'Installer My Agenda sur cet appareil'} description={description}>
        {canInstall && !isStandalone() && <Button variant="primary" onClick={() => void promptInstall()}>Installer</Button>}
      </SettingRow>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Version web : tes données sont enregistrées dans ce navigateur et synchronisées avec ton compte.
        Le mini et le lancement au démarrage existent seulement dans l’application Windows et Mac.
      </p>
    </div>
  );
}
