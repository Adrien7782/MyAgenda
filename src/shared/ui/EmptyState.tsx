import type { ReactNode } from 'react';

export function EmptyState({ icon, message, children }: { icon?: ReactNode; message: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 20px', gap: 12, color: 'var(--text-muted)' }}>
      {icon && <div style={{ opacity: 0.45 }}>{icon}</div>}
      <p style={{ fontSize: 'var(--text-sm)', opacity: 0.7 }}>{message}</p>
      {children}
    </div>
  );
}
