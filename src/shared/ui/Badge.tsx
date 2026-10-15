import type { ReactNode } from 'react';

/** Pastille colorée (statut, priorité, compteur). */
export function Badge({ color, children, size = 'md' }: { color: string; children: ReactNode; size?: 'sm' | 'md' }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: size === 'sm' ? '1px 7px' : '3px 10px', borderRadius: 20,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
        color, fontSize: size === 'sm' ? 10 : 'var(--text-xs)', fontWeight: 500, whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function Dot({ color, size = 6, glow }: { color: string; size?: number; glow?: boolean }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block',
        boxShadow: glow ? `0 0 6px ${color}` : undefined,
      }}
    />
  );
}
