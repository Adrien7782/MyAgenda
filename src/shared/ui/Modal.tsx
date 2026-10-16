import { useEffect, type ReactNode } from 'react';
import { XIcon } from '../icons/Icons';
import { IconButton } from './IconButton';
import { usePhoneLayout } from '../hooks/usePhoneLayout';

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
  const phone = usePhoneLayout();
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
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: phone ? 0 : 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="fade-in"
        style={{
          // Téléphone : plein écran, en tenant compte de l'encoche et de la barre système.
          width: phone ? '100%' : width, maxWidth: '100%', maxHeight: phone ? '100dvh' : 'calc(100vh - 64px)', height: phone ? '100dvh' : undefined,
          paddingTop: phone ? 'env(safe-area-inset-top)' : undefined, paddingBottom: phone ? 'env(safe-area-inset-bottom)' : undefined,
          borderRadius: phone ? 0 : 16, background: 'var(--surface)', border: phone ? 'none' : '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,.5), 0 0 0 1px color-mix(in srgb, var(--accent) 13%, transparent)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '12px 16px 12px 20px', background: 'var(--chrome)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, minWidth: 0 }}>{title}</h2>
          <IconButton label="Fermer (Échap)" onClick={onClose} size={phone ? 36 : 28}><XIcon size={phone ? 18 : 14} /></IconButton>
        </div>
        <div style={{ padding: phone ? '16px 16px' : '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: phone ? 1 : undefined }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: phone ? '12px 16px' : '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
