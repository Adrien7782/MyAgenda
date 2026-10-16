import { useEffect } from 'react';
import { Button, PageHeader } from '../shared/ui';
import { WidgetIcon } from '../shared/icons/Icons';
import { isActive } from '../domain/focus/focus';
import { useFocusStore } from '../store/focusStore';
import { FocusTimer } from '../widgets/focus/FocusTimer';
import { useMiniWindowController } from '../widgets/mini/useMiniWindowController';
import { usePhoneLayout } from '../shared/hooks/usePhoneLayout';

/** Mode concentration : un grand compte à rebours. */
export function FocusPage() {
  const mini = useMiniWindowController();
  const phone = usePhoneLayout();
  const active = useFocusStore((s) => isActive(s.session));

  // Espace = démarrer / pause / reprendre (sauf pendant la saisie de la durée).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON' || el.isContentEditable)) return;
      e.preventDefault();
      useFocusStore.getState().toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="dot-grid" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader
        title="Concentration"
        actions={!phone && !mini.isOpen && (
          <Button size="sm" icon={<WidgetIcon size={13} />} onClick={() => void mini.toggle()}
            title="Garde le compte à rebours et tes tâches sous les yeux pendant que tu travailles">
            {active ? 'Suivre dans le mini' : 'Ouvrir le mini'}
          </Button>
        )}
      />
      <div style={{ flex: 1, minHeight: 0, padding: phone ? '12px 12px 20px' : '20px 24px 28px' }}>
        <FocusTimer />
      </div>
      {!phone && <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: '0 24px 16px', flexShrink: 0 }}>
        Barre d’espace : démarrer / pause · Le compte à rebours continue si tu changes de page ou caches l’application.
      </p>}
    </div>
  );
}
