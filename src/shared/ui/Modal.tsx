import { useEffect, type ReactNode } from 'react';
import { XIcon } from '../icons/Icons';
import { IconButton } from './IconButton';

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  /** Ctrl+Entrée déclenche cette action. */
  onSubmit?: () => void;
  width?: number;
  footer?: ReactNode;
  children: ReactNode;
}

export function Modal({ title, onClose, onSubmit, width = 520, footer, children }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmit?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onSubmit]);

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'color-mix(in srgb, var(--bg) 70%, rgba(0,0,0,.55))', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="fade-in"
        style={{
          width, maxWidth: '100%', maxHeight: 'calc(100vh - 64px)',
          borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,.5), 0 0 0 1px color-mix(in srgb, var(--accent) 13%, transparent)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '12px 16px 12px 20px', background: 'var(--chrome)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, minWidth: 0 }}>{title}</h2>
          <IconButton label="Fermer (Échap)" onClick={onClose} size={28}><XIcon size={14} /></IconButton>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
