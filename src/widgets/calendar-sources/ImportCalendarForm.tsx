import { useRef, useState } from 'react';
import { LinkIcon, UploadIcon } from '../../shared/icons/Icons';
import { Button, Field, SegmentedControl, TextInput } from '../../shared/ui';
import { useEventStore } from '../../store/eventStore';

type Mode = 'link' | 'file';

/** Formulaire d'import : lien iCal (abonnement mis à jour) ou fichier .ics (import ponctuel). */
export function ImportCalendarForm({ onImported, autoFocus }: { onImported?: (count: number) => void; autoFocus?: boolean }) {
  const subscribe = useEventStore((s) => s.subscribe);
  const importFile = useEventStore((s) => s.importFile);
  const [mode, setMode] = useState<Mode>('link');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = !busy && (mode === 'link' ? url.trim().length > 8 : !!file);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setMessage(null);
    try {
      const count = mode === 'link'
        ? await subscribe({ name: name || 'Emploi du temps', url })
        : await importFile({ name: name || file!.name.replace(/\.ics$/i, ''), text: await file!.text() });
      setMessage({ ok: true, text: `${count} évènement${count > 1 ? 's' : ''} importé${count > 1 ? 's' : ''}.` });
      setUrl(''); setName(''); setFile(null);
      onImported?.(count);
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Import impossible' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SegmentedControl<Mode> value={mode} onChange={setMode} options={[
        { value: 'link', label: <><LinkIcon size={12} /> Par lien</> },
        { value: 'file', label: <><UploadIcon size={12} /> Fichier .ics</> },
      ]} />

      {mode === 'link' ? (
        <Field label="Lien iCal / ICS" required hint="Le calendrier sera ré-actualisé automatiquement à chaque démarrage (toutes les 6 h au plus).">
          <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… ou webcal://…" autoFocus={autoFocus}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} />
        </Field>
      ) : (
        <Field label="Fichier" required hint="Import ponctuel : pour les mises à jour, préfère un lien.">
          <input ref={fileRef} type="file" accept=".ics,text/calendar" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button icon={<UploadIcon size={13} />} onClick={() => fileRef.current?.click()} style={{ justifyContent: 'flex-start' }}>
            {file ? file.name : 'Choisir un fichier .ics'}
          </Button>
        </Field>
      )}

      <Field label="Nom affiché">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="ex : EDT L3 Informatique" />
      </Field>

      {message && (
        <div style={{
          padding: '9px 12px', borderRadius: 9, fontSize: 'var(--text-xs)',
          color: message.ok ? 'var(--success)' : 'var(--danger)', background: message.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
        }}>{message.text}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={submit} disabled={!canSubmit}>{busy ? 'Import en cours…' : 'Importer'}</Button>
      </div>
    </div>
  );
}

/** Aide : où trouver le lien selon l'outil de l'université. */
export function ImportHelp() {
  const rows = [
    ['ADE (ADE Campus)', "Ouvre ton planning → icône « Exporter l'agenda » → « Générer URL »."],
    ['Hyperplanning', 'Emploi du temps → bouton « Export iCal » / « Synchroniser » → copie le lien.'],
    ['Celcat', '« Abonnement » / « iCal feed » → copie l’URL.'],
    ['Google Agenda', 'Paramètres de l’agenda → « Adresse secrète au format iCal ».'],
    ['Moodle / ENT', 'Calendrier → « Exporter le calendrier » → « Obtenir l’URL du calendrier ».'],
  ];
  return (
    <details style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Où trouver le lien de mon emploi du temps ?</summary>
      <ul style={{ margin: '8px 0 0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map(([tool, how]) => <li key={tool}><b style={{ color: 'var(--text)' }}>{tool}</b> : {how}</li>)}
      </ul>
    </details>
  );
}
