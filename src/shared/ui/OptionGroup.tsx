export interface Option<T extends string> {
  value: T;
  label: string;
  /** Couleur CSS utilisée quand l'option est sélectionnée (accent par défaut). */
  color?: string;
}

/** Rangée de boutons à choix unique (statut, priorité, récurrence…). */
export function OptionGroup<T extends string>({ options, value, onChange }: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }} role="radiogroup">
      {options.map((opt) => {
        const active = opt.value === value;
        const color = opt.color ?? 'var(--accent)';
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, padding: '8px 2px', borderRadius: 8, minWidth: 0,
              fontSize: 'var(--text-xs)', fontWeight: active ? 600 : 400,
              border: `1px solid ${active ? `color-mix(in srgb, ${color} 44%, transparent)` : 'var(--border)'}`,
              background: active ? `color-mix(in srgb, ${color} 12%, transparent)` : 'var(--surface-el)',
              color: active ? color : 'var(--text-muted)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              transition: 'all .12s',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
