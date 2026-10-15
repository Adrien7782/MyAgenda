import { useEffect } from 'react';
import { services } from '../../app/container';
import { RefreshIcon } from '../../shared/icons/Icons';
import { Button, Dot } from '../../shared/ui';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore, type SyncStatus } from '../../store/syncStore';

const STATUS: Record<SyncStatus, { color: string; label: (at: string | null, err: string | null) => string }> = {
  idle: { color: 'var(--text-muted)', label: () => 'En attente de synchronisation' },
  syncing: { color: 'var(--accent)', label: () => 'Synchronisation…' },
  success: { color: 'var(--success)', label: (at) => (at ? `Synchronisé à ${new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Synchronisé') },
  error: { color: 'var(--danger)', label: (_, err) => `Erreur de synchronisation : ${err ?? 'inconnue'}` },
  offline: { color: 'var(--warn)', label: () => 'Hors ligne — tes modifications seront envoyées au retour du réseau' },
};

/** Compte connecté + état de la synchronisation entre appareils. */
export function AccountSettings() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { status, lastSyncAt, error, syncNow, loadLastSync } = useSyncStore();
  useEffect(() => { void loadLastSync(); }, [loadLastSync]);
  const st = STATUS[status];

  if (!services.auth.isConfigured()) {
    return (
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--warn)', lineHeight: 1.6 }}>
        Mode démo : aucun serveur de comptes configuré, donc ni connexion ni synchronisation.
        Suis <code>SETUP_SUPABASE.md</code> puis renseigne le fichier <code>.env</code> pour activer les comptes.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface-el)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0,
        }}>{(user?.email ?? '?').charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{user?.email}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: st.color, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Dot color={st.color} size={7} /> {st.label(lastSyncAt, error)}
          </div>
        </div>
        <Button size="sm" icon={<RefreshIcon size={12} />} onClick={() => void syncNow()} disabled={status === 'syncing'}>Synchroniser</Button>
        <Button size="sm" variant="danger" onClick={() => void signOut()}>Se déconnecter</Button>
      </div>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        Connecte-toi avec ce même compte sur tes autres appareils pour retrouver tes tâches et évènements.
        Synchronisation automatique toutes les 30 s ; en cas de conflit, la modification la plus récente gagne.
      </p>
    </div>
  );
}
