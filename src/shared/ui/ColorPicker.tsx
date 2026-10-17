import { useEffect, useRef, useState } from 'react';
import { CheckIcon } from '../icons/Icons';
import { contrastOn } from '../../domain/event/eventColors';

/**
 * Pastille de couleur qui ouvre une petite palette (popover).
 * `value = null` → couleur par défaut.
 */
export function ColorPicker({ value, onChange, palette, defaultColor, defaultLabel = 'Par défaut' }: {
  value: string | null;
  onChange: (color: string | null) => void;
  palette: { name: string; hex: string }[];
  /** Couleur affichée quand `value` est null. */
  defaultColor: string;
  defaultLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = value ?? defaultColor;
  const currentName = palette.find((p) => p.hex.toLowerCase() === value?.toLowerCase())?.name ?? (value ? value : defaultLabel);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc, true); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="ui-input"
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: 'auto', minWidth: 170, padding: '7px 12px' }}
      >
        <span style={{ width: 18, height: 18, borderRadius: 6, background: current, boxShadow: `0 0 10px color-mix(in srgb, ${current} 45%, transparent)`, flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--text-sm)' }}>{currentName}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>▾</span>
      </button>

      {open && (
        <div role="dialog" aria-label="Palette de couleurs" className="fade-in" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20, width: 236, maxWidth: 'calc(100vw - 32px)',
          padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)',
          boxShadow: '0 12px 40px rgba(0,0,0,.5)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {palette.map((c) => {
              const selected = c.hex.toLowerCase() === value?.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={selected}
                  onClick={() => { onChange(c.hex); setOpen(false); }}
                  style={{
                    width: 28, height: 28, borderRadius: 8, background: c.hex,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    outline: selected ? '2px solid var(--text)' : 'none', outlineOffset: 2,
                    transition: 'transform .1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                >
                  {selected && <CheckIcon size={14} color={contrastOn(c.hex)} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="ui-btn ui-btn--ghost ui-btn--sm"
            style={{ marginTop: 10, width: '100%', justifyContent: 'flex-start' }}
          >
            <span style={{ width: 14, height: 14, borderRadius: 4, background: defaultColor }} />
            {defaultLabel}
            {value === null && <CheckIcon size={12} />}
          </button>
        </div>
      )}
    </div>
  );
}
