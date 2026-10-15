import { SearchIcon, XIcon } from '../icons/Icons';

export function SearchInput({ value, onChange, placeholder = 'Rechercher…', width = 190 }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number;
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 1, minWidth: 120, width }}>
      <span style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex' }}>
        <SearchIcon size={13} />
      </span>
      <input
        className="ui-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onChange(''); }}
        placeholder={placeholder}
        style={{ paddingLeft: 30, paddingRight: value ? 28 : 12, paddingTop: 7, paddingBottom: 7 }}
      />
      {value && (
        <button type="button" aria-label="Effacer" onClick={() => onChange('')}
          style={{ position: 'absolute', right: 8, display: 'flex', color: 'var(--text-muted)' }}>
          <XIcon size={12} />
        </button>
      )}
    </div>
  );
}
