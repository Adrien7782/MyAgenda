export function Toggle({ checked, onChange, color = 'var(--accent)', label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, flexShrink: 0, position: 'relative',
        background: checked ? color : 'var(--surface-el)',
        border: `1px solid ${checked ? color : 'var(--border)'}`,
        transition: 'background .2s, border-color .2s',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: checked ? '#fff' : 'var(--text-muted)',
          boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .2s',
        }}
      />
    </button>
  );
}
