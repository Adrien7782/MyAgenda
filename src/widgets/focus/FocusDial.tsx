import type { ReactNode } from 'react';

const TICKS = 60;

/**
 * Jauge circulaire du compte à rebours : l'arc représente le temps restant
 * et se vide dans le sens inverse des aiguilles d'une montre, depuis midi.
 */
export function FocusDial({ size, fraction, color = 'var(--accent)', dimmed = false, children }: {
  size: number;
  /** Part restante, de 1 (plein) à 0 (vide). */
  fraction: number;
  color?: string;
  /** En pause : arc atténué. */
  dimmed?: boolean;
  children?: ReactNode;
}) {
  const stroke = Math.max(6, Math.round(size * 0.045));
  const r = (size - stroke) / 2 - Math.max(6, size * 0.03);
  const c = 2 * Math.PI * r;
  const center = size / 2;
  const f = Math.min(1, Math.max(0, fraction));
  // Position du bout de l'arc (petit point lumineux).
  const angle = -Math.PI / 2 + 2 * Math.PI * f;
  const knob = { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  const tickOuter = r + stroke / 2 + Math.max(4, size * 0.025);
  const tickInner = tickOuter - Math.max(3, size * 0.018);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
        {/* Graduations (une par minute d'horloge) */}
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
          const major = i % 5 === 0;
          const inner = major ? tickInner - Math.max(2, size * 0.01) : tickInner;
          return (
            <line key={i}
              x1={center + inner * Math.cos(a)} y1={center + inner * Math.sin(a)}
              x2={center + tickOuter * Math.cos(a)} y2={center + tickOuter * Math.sin(a)}
              stroke="var(--border)" strokeWidth={major ? 2 : 1} strokeLinecap="round"
              opacity={i / TICKS < 1 - f ? 0.45 : 1}
            />
          );
        })}
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--surface-el)" strokeWidth={stroke} />
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--border)" strokeWidth={1} opacity={0.6} />
        {f > 0 && (
          <circle
            cx={center} cy={center} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - f)}
            transform={`rotate(-90 ${center} ${center})`}
            opacity={dimmed ? 0.45 : 1}
            style={{
              transition: 'stroke-dashoffset .3s linear, opacity .3s, stroke .3s',
              filter: dimmed ? 'none' : `drop-shadow(0 0 ${Math.round(size * 0.03)}px color-mix(in srgb, ${color} 55%, transparent))`,
            }}
          />
        )}
        {f > 0 && f < 1 && (
          <circle cx={knob.x} cy={knob.y} r={stroke * 0.42} fill="var(--bg)" opacity={dimmed ? 0.5 : 0.9}
            style={{ transition: 'cx .3s linear, cy .3s linear' }} />
        )}
      </svg>
      <div style={{
        position: 'absolute', inset: stroke + size * 0.08, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      }}>
        {children}
      </div>
    </div>
  );
}
