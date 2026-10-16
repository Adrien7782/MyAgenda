import { FOCUS_PRESETS, formatClock, formatDuration, remainingFraction, remainingMs } from '../../domain/focus/focus';
import { formatTime, MINUTE_MS } from '../../domain/shared/date';
import { PauseIcon, PlayIcon, PlusIcon, RefreshIcon, StopIcon } from '../../shared/icons/Icons';
import { useElementSize } from '../../shared/hooks/useElementSize';
import { useFocusStore } from '../../store/focusStore';
import { DurationEditor } from './DurationEditor';
import { FocusDial } from './FocusDial';
import { useFocusNow } from './useFocusClock';

function RoundButton({ label, onClick, main, small, children }: {
  label: string; onClick: () => void; main?: boolean; small?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick}
      className={`focus-round ${main ? 'focus-round--main' : ''} ${small ? 'focus-round--sm' : ''}`}>
      {children}
    </button>
  );
}

/**
 * Compte à rebours complet : jauge circulaire, temps (modifiable avant le départ),
 * boutons et durées rapides. `compact` : version du mini (moins de texte, boutons plus petits).
 */
export function FocusTimer({ compact = false }: { compact?: boolean }) {
  const session = useFocusStore((s) => s.session);
  const { setDuration, start, pause, resume, stop, addMinutes } = useFocusStore.getState();
  const now = useFocusNow();
  const [ref, box] = useElementSize<HTMLDivElement>();

  const { status } = session;
  const idle = status === 'idle';
  const finished = status === 'finished';
  const left = remainingMs(session, now);
  const fraction = idle ? 1 : remainingFraction(session, now);

  // La jauge occupe la place disponible, en laissant de la place aux boutons.
  const reserved = compact ? (idle ? 104 : 64) : (idle ? 160 : 120);
  const dial = Math.max(compact ? 100 : 200, Math.min(box.width - 24, box.height - reserved, compact ? 420 : 520));
  const clock = formatClock(left);
  const digits = (clock.length > 5 ? 0.17 : 0.22) * dial;
  const icon = compact ? 15 : 18;

  let caption = '';
  if (status === 'running' && session.endsAt) caption = `Fin à ${formatTime(new Date(session.endsAt).toISOString())}`;
  if (status === 'paused') caption = 'En pause';
  if (finished) caption = `Séance de ${formatDuration(session.durationMs)} terminée`;
  if (idle) caption = compact ? '' : 'Choisis la durée puis lance le compte à rebours';

  const color = finished ? 'var(--success)' : 'var(--accent)';

  return (
    <div ref={ref} style={{
      height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: compact ? 10 : 22, minHeight: 0, overflow: 'hidden',
    }}>
      {box.width > 0 && (
        <FocusDial size={dial} fraction={finished ? 1 : fraction} color={color} dimmed={status === 'paused'}>
          {idle ? (
            <DurationEditor durationMs={session.durationMs} fontSize={dial * 0.17} showLabels={dial >= 170} onChange={setDuration} />
          ) : (
            <div style={{ animation: finished ? 'focus-done .5s ease-out' : undefined }}>
              <div className="focus-digits" aria-live="off" style={{ fontSize: finished ? dial * 0.12 : digits, color: finished ? 'var(--success)' : 'var(--text)', opacity: status === 'paused' ? 0.6 : 1 }}>
                {finished ? 'Terminé' : clock}
              </div>
            </div>
          )}
          {caption && dial >= 150 && (
            <div style={{
              fontSize: Math.max(10, Math.min(13, dial * 0.04)), color: status === 'paused' ? 'var(--warn)' : 'var(--text-muted)',
              marginTop: dial * 0.035, maxWidth: dial * 0.6,
            }}>{caption}</div>
          )}
        </FocusDial>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 14, flexShrink: 0 }}>
        {idle && (
          <RoundButton label="Démarrer" main small={compact} onClick={start}><PlayIcon size={icon + 4} /></RoundButton>
        )}
        {(status === 'running' || status === 'paused') && (
          <>
            <RoundButton label="Arrêter" small={compact} onClick={stop}><StopIcon size={icon - 2} /></RoundButton>
            {status === 'running'
              ? <RoundButton label="Pause" main small={compact} onClick={pause}><PauseIcon size={icon + 2} /></RoundButton>
              : <RoundButton label="Reprendre" main small={compact} onClick={resume}><PlayIcon size={icon + 4} /></RoundButton>}
            <RoundButton label="Ajouter 5 minutes" small={compact} onClick={() => addMinutes(5)}>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: compact ? 10 : 11, fontWeight: 600, gap: 1 }}>
                <PlusIcon size={compact ? 10 : 12} />5
              </span>
            </RoundButton>
          </>
        )}
        {finished && (
          <>
            <RoundButton label="Nouvelle séance" small={compact} onClick={stop}><StopIcon size={icon - 2} /></RoundButton>
            <RoundButton label={`Recommencer (${formatDuration(session.durationMs)})`} main small={compact} onClick={start}>
              <RefreshIcon size={icon + 2} />
            </RoundButton>
          </>
        )}
      </div>

      {idle && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, maxWidth: compact ? 300 : 520, flexShrink: 0 }}>
          {(compact ? FOCUS_PRESETS.slice(0, 4) : FOCUS_PRESETS).map((p) => (
            <button key={p.minutes} type="button" className="focus-chip"
              aria-pressed={session.durationMs === p.minutes * MINUTE_MS}
              onClick={() => setDuration(p.minutes * MINUTE_MS)}>
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
