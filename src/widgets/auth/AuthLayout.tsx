import type { ReactNode } from 'react';
import { AppLogo } from '../layout/AppLogo';

/** Cadre commun des écrans de compte : carte centrée sur le fond pointillé. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="dot-grid" style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="fade-in" style={{ width: 400, maxWidth: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <AppLogo size={48} />
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>My Agenda</div>
        </div>
        <div style={{
          padding: '24px 26px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,.35), 0 0 0 1px color-mix(in srgb, var(--accent) 10%, transparent)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{title}</h1>
            {subtitle && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer && <div style={{ marginTop: 16, textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" style={{ padding: '9px 12px', borderRadius: 9, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>
      {message}
    </div>
  );
}

export function FormInfo({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="status" style={{ padding: '9px 12px', borderRadius: 9, background: 'var(--success-bg)', color: 'var(--success)', fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>
      {message}
    </div>
  );
}

export function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 'inherit' }}>{children}</button>
  );
}
