import type { ReactNode } from 'react';

export function SettingsSection({ title, description, id, children }: { title: string; description?: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 16, marginBottom: 36, maxWidth: 820 }}>
      <h2 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: description ? 4 : 14 }}>
        {title}
      </h2>
      {description && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 14, opacity: 0.85 }}>{description}</p>}
      {children}
    </section>
  );
}

export function SettingRow({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderRadius: 12, background: 'var(--surface-el)', border: '1px solid var(--border)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{label}</div>
        {description && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}
