import { services } from '../../app/container';
import { cleanReleaseNotes } from '../../services/updateService';
import { Button } from '../../shared/ui';
import { DownloadIcon, RefreshIcon } from '../../shared/icons/Icons';
import { useUpdateStore } from '../../store/updateStore';
import { SettingRow } from '../settings/SettingsSection';

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMb = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} Mo`;

/** Réglages → Mises à jour : version installée, recherche, notes de version et installation. */
export function UpdateSettings() {
  const { status, available, progress, error, lastCheckedAt, check, install } = useUpdateStore();
  const supported = services.updates.supported;
  const downloadMode = services.updates.mode === 'download';
  const webMode = services.updates.mode === 'web';
  const installing = status === 'installing';

  let statusText = webMode
    ? 'La version web se met à jour toute seule à chaque ouverture.'
    : 'My Agenda vérifie automatiquement au démarrage, puis toutes les 6 heures.';
  if (!supported) statusText = 'Les mises à jour s’installent depuis l’application installée. En développement, récupère le code avec git pull.';
  else if (status === 'checking') statusText = 'Recherche en cours…';
  else if (status === 'up-to-date' && lastCheckedAt) statusText = `Tu as la dernière version (vérifié à ${fmtTime(lastCheckedAt)}).`;

  const pct = progress?.total ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100)) : null;
  const notes = cleanReleaseNotes(available?.notes);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SettingRow label={`Version installée : ${services.updates.currentVersion}`} description={statusText}>
        <Button
          icon={<RefreshIcon size={14} />}
          disabled={!supported || status === 'checking' || installing}
          onClick={() => void check()}
        >
          {status === 'checking' ? 'Recherche…' : 'Rechercher des mises à jour'}
        </Button>
      </SettingRow>

      {available && (
        <div style={{
          padding: '16px 18px', borderRadius: 12,
          background: 'color-mix(in srgb, var(--accent) 9%, var(--surface-el))',
          border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                Version {available.version} disponible
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3 }}>
                {available.date ? `Publiée le ${fmtDate(available.date)} · ` : ''}
                {webMode
                  ? 'La page se recharge sur la nouvelle version. Tes données sont conservées.'
                  : downloadMode
                    ? 'Le fichier s’ouvre dans ton navigateur : touche-le une fois téléchargé, puis « Mettre à jour ». Tes données sont conservées.'
                    : 'L’application redémarre toute seule après l’installation. Tes données ne sont pas touchées.'}
              </div>
            </div>
            <Button variant="primary" icon={<DownloadIcon size={14} />} disabled={installing} onClick={() => void install()}>
              {webMode ? (installing ? 'Mise à jour…' : 'Mettre à jour maintenant') : downloadMode ? 'Télécharger la mise à jour' : installing ? 'Installation…' : 'Installer et redémarrer'}
            </Button>
          </div>

          {installing && !webMode && (
            <div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, background: 'var(--accent)', transition: 'width .2s',
                  width: pct === null ? '35%' : `${pct}%`,
                  animation: pct === null ? 'pulse 1.2s ease-in-out infinite' : undefined,
                }} />
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 6 }}>
                {pct === null
                  ? 'Téléchargement…'
                  : pct < 100
                    ? `Téléchargement… ${pct} % (${fmtMb(progress!.downloaded)} / ${fmtMb(progress!.total!)})`
                    : 'Installation… l’application va se fermer puis se rouvrir.'}
              </div>
            </div>
          )}

          {notes.length > 0 && (
            <div style={{ fontSize: 'var(--text-xs)', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Nouveautés</div>
              {notes.join('\n')}
            </div>
          )}
        </div>
      )}

      {error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
