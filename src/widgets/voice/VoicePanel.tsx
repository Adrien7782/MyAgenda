import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, CheckSquareIcon, MicIcon, NoteIcon, XIcon } from '../../shared/icons/Icons';
import { Button, IconButton } from '../../shared/ui';
import { playVoiceCue } from '../../shared/presentation/chime';
import { useVoiceStore } from '../../store/voiceStore';
import { useUiStore } from '../../store/uiStore';
import { isMac } from '../../infrastructure/platform';
import type { VoiceResult } from '../../services/voiceController';

export const VOICE_SHORTCUT_LABEL = isMac() ? '⌘ ⇧ Espace' : 'Ctrl + Maj + Espace';

const PHASE_TEXT: Record<string, string> = {
  loading: 'Chargement de la reconnaissance vocale…',
  listening: "Je t'écoute…",
  hearing: "J'entends…",
  processing: 'Je transcris…',
  off: 'Micro coupé',
};

const KIND = {
  note: { icon: NoteIcon, label: 'Note créée' },
  task: { icon: CheckSquareIcon, label: 'Tâche créée' },
  event: { icon: CalendarIcon, label: 'Évènement créé' },
} as const;

/** Barre de niveau du micro (5 traits qui suivent la voix). */
function Level({ level, active }: { level: number; active: boolean }) {
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 2, height: 16 }}>
      {[0.25, 0.55, 1, 0.55, 0.25].map((k, i) => (
        <span key={i} style={{
          width: 3, borderRadius: 2, background: active ? 'var(--accent)' : 'var(--text-muted)',
          height: `${Math.max(3, Math.min(16, 3 + level * 14 * k))}px`, transition: 'height .1s',
        }} />
      ))}
    </div>
  );
}

function ResultCard({ r }: { r: VoiceResult }) {
  const undo = useVoiceStore((s) => s.undo);
  const navigate = useNavigate();
  const openTask = useUiStore((s) => s.openTaskModal);
  const openEvent = useUiStore((s) => s.openEventModal);
  const { icon: Icon, label } = KIND[r.kind];
  const open = () => {
    if (r.kind === 'note') navigate(`/notes/${r.id}`);
    else if (r.kind === 'task') openTask({ taskId: r.id });
    else openEvent({ eventId: r.id });
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10,
      background: 'var(--surface-el)', border: '1px solid var(--border)', opacity: r.undone ? 0.55 : 1,
    }}>
      <span style={{ color: r.undone ? 'var(--text-muted)' : 'var(--success)', display: 'flex' }}><Icon size={16} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{r.undone ? 'Annulé' : label}</div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: r.undone ? 'line-through' : 'none' }}>{r.title || 'Sans titre'}</div>
        {r.detail && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.detail}</div>}
      </div>
      {!r.undone && (
        <>
          <Button size="sm" variant="ghost" onClick={() => void undo(r)}>Annuler</Button>
          <Button size="sm" onClick={open}>Ouvrir</Button>
        </>
      )}
    </div>
  );
}

/**
 * Panneau de la commande vocale (en bas à droite) : état du micro, ce qui est entendu,
 * la commande en cours, et les éléments créés avec « Annuler » / « Ouvrir ».
 */
export function VoicePanel() {
  const s = useVoiceStore();
  const navigate = useNavigate();
  const active = s.phase !== 'off';
  const prevActive = useRef(active);

  // Signal sonore à l'allumage / extinction (utile application en arrière-plan).
  useEffect(() => {
    if (active !== prevActive.current) playVoiceCue(active ? 'on' : 'off');
    prevActive.current = active;
  }, [active]);
  const lastResult = s.results[0]?.at;
  useEffect(() => { if (lastResult) playVoiceCue('done'); }, [lastResult]);

  if (!s.supported || (!active && !s.message && s.results.length === 0 && !s.download)) return null;
  const close = () => { void s.stop(); s.dismissMessage(); s.clearResults(); };
  const pct = s.download ? Math.round((s.download.downloaded / Math.max(1, s.download.total)) * 100) : 0;

  return (
    <div role="region" aria-label="Commande vocale" className="fade-in" style={{
      position: 'fixed', right: 18, bottom: 18, zIndex: 60, width: 380, maxWidth: 'calc(100vw - 36px)',
      display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 14,
      background: 'var(--surface)', border: `1px solid ${active ? 'color-mix(in srgb, var(--accent) 45%, var(--border))' : 'var(--border)'}`,
      boxShadow: '0 18px 50px rgba(0,0,0,.45)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={active ? 'voice-live' : undefined} style={{
          width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: active ? 'var(--accent)' : 'var(--surface-el)', color: active ? 'var(--on-accent)' : 'var(--text-muted)',
        }}><MicIcon size={15} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }} aria-live="polite">{PHASE_TEXT[s.phase]}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            {active ? `« Éteins-toi » ou ${VOICE_SHORTCUT_LABEL} pour couper` : `${VOICE_SHORTCUT_LABEL} pour parler`}
          </div>
        </div>
        {active && <Level level={s.level} active={s.phase === 'hearing'} />}
        <IconButton label={active ? 'Couper le micro et fermer' : 'Fermer'} size={28} onClick={close}><XIcon size={13} /></IconButton>
      </div>

      {s.heard && active && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Entendu : <span style={{ color: 'var(--text)' }}>« {s.heard} »</span>
        </div>
      )}
      {s.draft && (
        <div style={{ fontSize: 'var(--text-xs)', padding: '7px 10px', borderRadius: 8, background: 'var(--accent-bg)', color: 'var(--accent)', lineHeight: 1.5 }}>
          {s.draft}
        </div>
      )}
      {s.message && (
        <div style={{
          fontSize: 'var(--text-xs)', padding: '8px 10px', borderRadius: 8, lineHeight: 1.6, whiteSpace: 'pre-line',
          background: s.message.tone === 'error' ? 'color-mix(in srgb, var(--danger) 12%, transparent)' : 'var(--surface-el)',
          color: s.message.tone === 'error' ? 'var(--danger)' : 'var(--text-muted)',
        }}>{s.message.text}</div>
      )}
      {s.needsModel && !s.download && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button size="sm" variant="primary" onClick={() => void s.downloadModel(s.modelId).then(() => s.toggle())}>
            Télécharger ({s.models.find((m) => m.id === s.modelId)?.sizeMb ?? 57} Mo) et démarrer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate('/settings#voice')}>Réglages</Button>
        </div>
      )}
      {s.download && (
        <div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width .2s' }} />
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 5 }}>Téléchargement du modèle… {pct} %</div>
        </div>
      )}
      {s.results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {s.results.slice(0, 3).map((r) => <ResultCard key={`${r.kind}-${r.id}`} r={r} />)}
        </div>
      )}
    </div>
  );
}

/** Bouton micro de la barre de gauche. */
export function VoiceButton({ style }: { style: (active: boolean) => React.CSSProperties }) {
  const supported = useVoiceStore((s) => s.supported);
  const phase = useVoiceStore((s) => s.phase);
  const toggle = useVoiceStore((s) => s.toggle);
  if (!supported) return null;
  const active = phase !== 'off';
  return (
    <button type="button" onClick={() => void toggle()} aria-pressed={active}
      title={active ? `Couper le micro (${VOICE_SHORTCUT_LABEL})` : `Commande vocale (${VOICE_SHORTCUT_LABEL})`}
      aria-label="Commande vocale" className={active ? 'voice-live' : undefined} style={style(active)}>
      <MicIcon size={18} />
    </button>
  );
}
