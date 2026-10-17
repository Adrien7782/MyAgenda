import { useEffect, useRef, useState, type ReactNode } from 'react';
import { claimTab, takeOverTab } from '../../infrastructure/web/singleTab';
import { AppLogo } from '../layout/AppLogo';
import { Button } from '../../shared/ui';

type State = 'checking' | 'active' | 'elsewhere' | 'lost';

/** Web app : un seul onglet actif à la fois ; les autres proposent de reprendre la main. */
export function WebTabGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>('checking');
  const [error, setError] = useState<string | null>(null);
  const wasActive = useRef(false);
  const onLost = () => setState('lost');

  useEffect(() => {
    void claimTab(onLost).then((s) => setState(s));
  }, []);

  useEffect(() => { if (state === 'active') wasActive.current = true; }, [state]);

  async function useHere() {
    setError(null);
    try {
      await takeOverTab(onLost);
      // Cet onglet avait déjà ses données en mémoire : on repart de la base enregistrée.
      if (wasActive.current) window.location.reload();
      else setState('active');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (state === 'active') return <>{children}</>;
  if (state === 'checking') return null;
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, background: 'var(--bg)', textAlign: 'center' }}>
      <AppLogo size={40} />
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text)' }}>
        {state === 'lost' ? 'My Agenda a été ouverte dans un autre onglet' : 'My Agenda est déjà ouverte dans un autre onglet'}
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.6 }}>
        Pour que tes données restent justes, My Agenda ne fonctionne que dans un onglet à la fois.
      </div>
      <Button variant="primary" onClick={() => void useHere()}>Utiliser ici</Button>
      {error && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>{error}</div>}
    </div>
  );
}
