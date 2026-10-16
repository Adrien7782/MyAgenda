import { useEffect, useRef, useState } from 'react';
import { formatClock, isActive, remainingMs } from '../../domain/focus/focus';
import { PieChartIcon, TimerIcon } from '../../shared/icons/Icons';
import { useFocusStore } from '../../store/focusStore';
import { FocusTimer } from '../focus/FocusTimer';
import { useFocusNow } from '../focus/useFocusClock';
import { MiniDashboard } from './MiniDashboard';

type MiniView = 'dashboard' | 'focus';

/**
 * Vue affichée dans le mini.
 * Par défaut : le compte à rebours pendant une séance, sinon le tableau de bord.
 * L'utilisateur peut basculer à tout moment ; le choix automatique reprend la main
 * quand une séance démarre (→ compte à rebours) ou est arrêtée (→ tableau de bord).
 */
function useMiniView(): [MiniView, (v: MiniView) => void] {
  const status = useFocusStore((s) => s.session.status);
  const [view, setView] = useState<MiniView>(() => (isActive(useFocusStore.getState().session) ? 'focus' : 'dashboard'));
  const prev = useRef(status);

  useEffect(() => {
    const was = prev.current;
    prev.current = status;
    if (was === status) return;
    if (status === 'running' && (was === 'idle' || was === 'finished')) setView('focus');
    if (status === 'idle') setView('dashboard');
  }, [status]);

  return [view, setView];
}

function Tab({ active, onClick, icon, children, title }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode; title: string;
}) {
  return (
    <button type="button" role="tab" aria-selected={active} title={title} onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: '100%',
      fontSize: 'var(--text-xs)', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', minWidth: 0,
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`, transition: 'color .15s, border-color .15s',
    }}>
      {icon}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>{children}</span>
    </button>
  );
}

/** Temps restant affiché sur l'onglet quand on regarde le tableau de bord. */
function TabCountdown() {
  const session = useFocusStore((s) => s.session);
  const now = useFocusNow(1000);
  if (!isActive(session)) return null;
  return (
    <span className="focus-digits" style={{
      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 6,
      color: session.status === 'paused' ? 'var(--warn)' : 'var(--accent)',
      background: session.status === 'paused' ? 'var(--warn-bg)' : 'var(--accent-bg)',
    }}>
      {formatClock(remainingMs(session, now))}
    </span>
  );
}

export function MiniContent() {
  const [view, setView] = useMiniView();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div role="tablist" style={{ height: 32, flexShrink: 0, display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <Tab active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<PieChartIcon size={13} />} title="Avancement des tâches">
          Tableau de bord
        </Tab>
        <Tab active={view === 'focus'} onClick={() => setView('focus')} icon={<TimerIcon size={13} />} title="Compte à rebours">
          Concentration {view !== 'focus' && <TabCountdown />}
        </Tab>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {view === 'dashboard' ? <MiniDashboard /> : <div style={{ height: '100%', padding: '10px 8px 14px' }}><FocusTimer compact /></div>}
      </div>
    </div>
  );
}
