import { useEffect, useState } from 'react';
import { services } from '../../app/container';
import { RefreshIcon } from '../../shared/icons/Icons';
import { Button } from '../../shared/ui';

/** Où sont les données, et combien il y en a : pour vérifier que tout est bien enregistré. */
export function StorageSettings() {
  const db = services.databases;
  const file = db.currentFile();
  const [path, setPath] = useState<string>('');
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    if (!file) return;
    setPath(await db.pathOf(file));
    setCounts(db.persistent ? await db.countRows(file) : null);
  }
  useEffect(() => { void refresh(); }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  async function copy() {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* presse-papiers indisponible */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--surface-el)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <code style={{ flex: 1, minWidth: 240, fontSize: 'var(--text-xs)', color: 'var(--text)', wordBreak: 'break-all' }}>{path || '…'}</code>
        <Button size="sm" onClick={copy} disabled={!path}>{copied ? 'Copié ✓' : 'Copier le chemin'}</Button>
        <Button size="sm" icon={<RefreshIcon size={12} />} onClick={() => void refresh()}>Recompter</Button>
      </div>

      {counts ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
          {Object.entries(counts).map(([label, n]) => (
            <div key={label} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-el)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{n}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--warn)' }}>Mode navigateur : données de démonstration en mémoire, rien n'est enregistré.</p>
      )}

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Ces chiffres sont lus directement dans le fichier SQLite ci-dessus, pas dans l'affichage : s'ils correspondent à ce que tu vois, tout est bien enregistré.
        Pour explorer le fichier toi-même, ouvre-le avec le logiciel gratuit <b>DB Browser for SQLite</b> (lecture seule conseillée, application fermée).
        Côté serveur, tes données synchronisées sont visibles dans Supabase → <b>Table Editor</b>.
      </p>
    </div>
  );
}
