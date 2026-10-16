import type { ReactNode } from 'react';
import { usePhoneLayout } from '../hooks/usePhoneLayout';

/**
 * Bandeau supérieur d'une page.
 * Ligne 1 : titre à gauche, actions principales à droite.
 * Ligne 2 (optionnelle, `children`) : filtres et navigation. Sur téléphone, elle défile horizontalement.
 */
export function PageHeader({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  const phone = usePhoneLayout();
  return (
    <header style={{
      padding: phone ? '10px 14px 10px' : '14px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg)',
      flexShrink: 0, display: 'flex', flexDirection: 'column', gap: phone ? 10 : 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: phone ? 8 : 10, minHeight: 34 }}>
        <h1 style={{ fontSize: phone ? 22 : 'var(--text-xl)', fontWeight: 700, whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
        <Spacer />
        {actions}
      </div>
      {children && (
        <div className={phone ? 'h-scroll' : undefined} style={{
          display: 'flex', alignItems: 'center', gap: phone ? 8 : 10, rowGap: 8,
          flexWrap: phone ? 'nowrap' : 'wrap', margin: phone ? '0 -14px' : undefined, padding: phone ? '0 14px' : undefined,
        }}>{children}</div>
      )}
    </header>
  );
}

export function Spacer() {
  return <div style={{ flex: 1 }} />;
}
