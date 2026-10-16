import { useEffect, useState } from 'react';
import { MINUTE_MS } from '../../domain/shared/date';
import { FOCUS_MAX_MS } from '../../domain/focus/focus';

function Chevron({ up, size }: { up: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={up ? '6 15 12 9 18 15' : '6 9 12 15 18 9'} />
    </svg>
  );
}

/** Un segment (heures ou minutes) : saisie au clavier, flèches, molette. */
function Segment({ value, max, label, fontSize, showLabel, onChange, onStep }: {
  value: number; max: number; label: string; fontSize: number; showLabel: boolean;
  /** Valeur saisie au clavier. */
  onChange: (v: number) => void;
  /** Flèches (grand pas) et molette (petit pas) : la retenue passe d'un segment à l'autre. */
  onStep: (dir: 1 | -1, big: boolean) => void;
}) {
  const [text, setText] = useState(String(value).padStart(2, '0'));
  useEffect(() => setText(String(value).padStart(2, '0')), [value]);

  const commit = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    onChange(Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : value);
  };
  const arrow = Math.max(12, fontSize * 0.32);
  const btn: React.CSSProperties = {
    color: 'var(--text-muted)', padding: 2, borderRadius: 6, display: 'flex', lineHeight: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button type="button" className="focus-step" style={btn} aria-label={`Plus de ${label}`} onClick={() => onStep(1, true)}>
        <Chevron up size={arrow} />
      </button>
      <input
        value={text}
        inputMode="numeric"
        aria-label={label}
        maxLength={2}
        onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 2))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp') { e.preventDefault(); onStep(1, false); }
          if (e.key === 'ArrowDown') { e.preventDefault(); onStep(-1, false); }
        }}
        onFocus={(e) => e.target.select()}
        onWheel={(e) => onStep(e.deltaY < 0 ? 1 : -1, false)}
        className="focus-digits focus-input"
        style={{ width: `${2 * 0.62 + 0.2}em`, fontSize }}
      />
      <button type="button" className="focus-step" style={btn} aria-label={`Moins de ${label}`} onClick={() => onStep(-1, true)}>
        <Chevron up={false} size={arrow} />
      </button>
      {showLabel && <span style={{ fontSize: Math.max(10, fontSize * 0.13), color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2 }}>{label}</span>}
    </div>
  );
}

/** Réglage de la durée, au centre de la jauge : heures et minutes modifiables. */
export function DurationEditor({ durationMs, fontSize, showLabels = true, onChange }: {
  durationMs: number; fontSize: number; showLabels?: boolean; onChange: (ms: number) => void;
}) {
  const totalMin = Math.round(durationMs / MINUTE_MS);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const maxH = Math.floor(FOCUS_MAX_MS / (60 * MINUTE_MS));
  const set = (hh: number, mm: number) => onChange((hh * 60 + mm) * MINUTE_MS);
  const maxMin = FOCUS_MAX_MS / MINUTE_MS;
  const step = (deltaMin: number) => onChange(Math.min(maxMin, Math.max(1, totalMin + deltaMin)) * MINUTE_MS);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: fontSize * 0.08 }}>
      <Segment value={h} max={maxH} label="heures" fontSize={fontSize} showLabel={showLabels} onChange={(v) => set(v, m)} onStep={(d) => step(d * 60)} />
      <span className="focus-digits" style={{ fontSize, color: 'var(--text-muted)', marginTop: -fontSize * 0.12 }}>:</span>
      <Segment value={m} max={59} label="minutes" fontSize={fontSize} showLabel={showLabels} onChange={(v) => set(h, v)} onStep={(d, big) => step(d * (big ? 5 : 1))} />
    </div>
  );
}
