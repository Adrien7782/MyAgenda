import { useState } from 'react';
import { requestWebNotifications, webNotificationState, type WebNotificationState } from '../../infrastructure/web/webNotifications';
import { Button } from '../../shared/ui';

const TEXT: Record<WebNotificationState, string> = {
  granted: 'Notifications autorisées sur cet appareil ✓',
  default: 'Le navigateur doit d’abord t’autoriser à recevoir les rappels.',
  denied: 'Notifications bloquées pour ce site : autorise-les dans les réglages du navigateur (sur iPhone : Réglages → Notifications → My Agenda).',
  'needs-home-screen': 'Sur iPhone et iPad, les notifications ne marchent qu’une fois My Agenda ajoutée à l’écran d’accueil (voir Réglages → Application), puis ouverte depuis son icône.',
  unsupported: 'Ce navigateur n’affiche pas de notifications.',
};

/** Web app : autorisation des notifications (le navigateur exige un appui sur un bouton). */
export function WebNotificationPermission() {
  const [state, setState] = useState(webNotificationState);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 10,
      background: state === 'granted' ? 'var(--surface-el)' : 'var(--warn-bg)',
      color: state === 'granted' ? 'var(--text-muted)' : 'var(--warn)', fontSize: 'var(--text-xs)', lineHeight: 1.5,
    }}>
      <span style={{ flex: 1, minWidth: 200 }}>{TEXT[state]}</span>
      {state === 'default' && (
        <Button size="sm" variant="primary" onClick={() => void requestWebNotifications().then(setState)}>Autoriser les notifications</Button>
      )}
    </div>
  );
}
