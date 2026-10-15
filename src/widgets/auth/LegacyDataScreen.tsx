import { useState } from 'react';
import { Button } from '../../shared/ui';
import { useAuthStore } from '../../store/authStore';
import { AuthLayout } from './AuthLayout';

/** 1re connexion sur ce PC : proposer de rattacher les données créées avant l'arrivée des comptes. */
export function LegacyDataScreen() {
  const { user, legacyCounts, decideLegacy } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const rows = Object.entries(legacyCounts ?? {}).filter(([k, n]) => n > 0 && k !== 'Réglages');

  async function choose(attach: boolean) {
    setBusy(true);
    try { await decideLegacy(attach); } finally { setBusy(false); }
  }

  return (
    <AuthLayout
      title="Des données existent déjà sur ce PC"
      subtitle={<>Elles ont été créées avant l’arrivée des comptes. Veux-tu les rattacher à <b style={{ color: 'var(--text)' }}>{user?.email}</b> ? Elles seront alors synchronisées sur tes autres appareils.</>}
    >
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(([label, n]) => (
          <li key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', padding: '6px 10px', borderRadius: 8, background: 'var(--surface-el)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}</span><b>{n}</b>
          </li>
        ))}
      </ul>
      <Button variant="primary" disabled={busy} onClick={() => choose(true)} style={{ width: '100%', padding: '10px' }}>Les rattacher à mon compte</Button>
      <Button disabled={busy} onClick={() => choose(false)} style={{ width: '100%' }}>Commencer avec un compte vide</Button>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Si tu commences avec un compte vide, ces données restent sur ce PC et pourront être rattachées au prochain compte qui se connecte ici.
      </p>
    </AuthLayout>
  );
}
