import { useState } from 'react';
import type { CalendarSource } from '../../domain/event/event';
import { LinkIcon, RefreshIcon, TrashIcon } from '../../shared/icons/Icons';
import { Dot, IconButton } from '../../shared/ui';
import { useEventStore } from '../../store/eventStore';

function formatSync(iso: string | null): string {
  if (!iso) return 'jamais synchronisé';
  return `mis à jour le ${new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
}

/** Liste des calendriers importés : couleur, actualisation, suppression. */
export function CalendarSourceList() {
  const sources = useEventStore((s) => s.sources);
  const events = useEventStore((s) => s.events);
  if (sources.length === 0) {
    return <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Aucun calendrier importé pour le moment.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sources.map((s) => (
        <SourceRow key={s.id} source={s} count={events.filter((e) => e.source_id === s.id).length} />
      ))}
    </div>
  );
}

function SourceRow({ source, count }: { source: CalendarSource; count: number }) {
  const { refreshSource, removeSource, updateSource } = useEventStore();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function refresh() {
    setBusy(true);
    try { await refreshSource(source.id); } catch { /* l'erreur est enregistrée sur la source */ } finally { setBusy(false); }
  }

  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-el)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <label title="Changer la couleur" style={{ position: 'relative', cursor: 'pointer', display: 'flex' }}>
        <Dot color={source.color} size={12} />
        <input type="color" value={source.color} onChange={(e) => updateSource(source.id, { color: e.target.value })}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: 12, height: 12, cursor: 'pointer' }} />
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {source.name}
          {source.url && <LinkIcon size={11} color="var(--text-muted)" />}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: source.last_error ? 'var(--danger)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={source.last_error ?? source.url ?? undefined}>
          {source.last_error ? `Erreur : ${source.last_error}` : `${count} évènement${count > 1 ? 's' : ''} · ${source.url ? formatSync(source.last_synced_at) : 'fichier importé'}`}
        </div>
      </div>
      {source.url && (
        <IconButton label="Actualiser maintenant" onClick={refresh} disabled={busy}>
          <span style={{ display: 'flex', animation: busy ? 'spin 1s linear infinite' : undefined }}><RefreshIcon size={12} /></span>
        </IconButton>
      )}
      {confirm ? (
        <>
          <button type="button" className="ui-btn ui-btn--danger ui-btn--sm" onClick={() => removeSource(source.id)}>Supprimer</button>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setConfirm(false)}>Annuler</button>
        </>
      ) : (
        <IconButton label="Supprimer ce calendrier et ses évènements" variant="danger" onClick={() => setConfirm(true)}>
          <TrashIcon size={12} />
        </IconButton>
      )}
    </div>
  );
}
