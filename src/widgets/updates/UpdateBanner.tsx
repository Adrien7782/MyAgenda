import { useLocation, useNavigate } from 'react-router-dom';
import { Button, IconButton } from '../../shared/ui';
import { DownloadIcon, XIcon } from '../../shared/icons/Icons';
import { useUpdateStore } from '../../store/updateStore';

/** Bandeau en haut de l'application quand une nouvelle version est disponible. */
export function UpdateBanner() {
  const available = useUpdateStore((s) => s.available);
  const dismissed = useUpdateStore((s) => s.bannerDismissed);
  const dismiss = useUpdateStore((s) => s.dismissBanner);
  const navigate = useNavigate();
  const onSettings = useLocation().pathname.startsWith('/settings');

  if (!available || dismissed || onSettings) return null;

  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px 8px 16px',
      background: 'color-mix(in srgb, var(--accent) 14%, var(--surface))',
      borderBottom: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
      fontSize: 'var(--text-sm)',
    }}>
      <span style={{ color: 'var(--accent)', display: 'flex', flexShrink: 0 }}><DownloadIcon size={16} /></span>
      <span style={{ flex: 1 }}>
        <strong>My Agenda {available.version}</strong> est disponible.
      </span>
      <Button size="sm" variant="primary" onClick={() => navigate('/settings#updates')}>Voir et installer</Button>
      <IconButton label="Plus tard" onClick={dismiss}><XIcon size={14} /></IconButton>
    </div>
  );
}
