import type { ReactNode } from 'react';

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

/** Bascule compacte (Jour / Semaine / Mois, Liste / Kanban…). */
export function SegmentedControl<T extends string>({ options, value, onChange, size = 'md' }: {
  options: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div style={{ display: 'flex', gap: 2, background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 9, padding: 2, flexShrink: 0 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.title}
            onClick={() => onChange(opt.value)}
            style={{
              padding: size === 'sm' ? '3px 9px' : '5px 12px',
              borderRadius: 7, fontSize: 'var(--text-xs)',
              display: 'flex', alignItems: 'center', gap: 5,
              fontWeight: active ? 600 : 400,
              background: active ? 'var(--accent-bg)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: active ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent)' : 'none',
              transition: 'all .12s', whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
