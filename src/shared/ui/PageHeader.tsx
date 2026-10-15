import type { ReactNode } from 'react';

/**
 * Bandeau supérieur d'une page.
 * Ligne 1 : titre à gauche, actions principales à droite.
 * Ligne 2 (optionnelle, `children`) : filtres et navigation.
 */
export function PageHeader({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 34 }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, whiteSpace: 'nowrap' }}>{title}</h1>
        <Spacer />
        {actions}
      </div>
      {children && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', rowGap: 8 }}>{children}</div>}
    </header>
  );
}

export function Spacer() {
  return <div style={{ flex: 1 }} />;
}
